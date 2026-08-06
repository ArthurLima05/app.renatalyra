import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MAX_ATTEMPTS = 5

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  })
}

// Todas as operações do formulário público de anamnese passam por aqui, usando
// a service role no servidor. As tabelas anamnese_tokens/anamnese_responses/
// anamnese_answers não são mais acessíveis diretamente pelo cliente anônimo:
// isso evita tanto a leitura de códigos/tokens de outros pacientes quanto
// updates silenciosamente filtrados pelo RLS (o bug que motivou esta função).
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const body = await req.json()
    const { action, token } = body

    if (!token) return json({ success: false, error: 'token é obrigatório' }, 400)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: tk, error: tkErr } = await supabase
      .from('anamnese_tokens')
      .select('*')
      .eq('token', token)
      .maybeSingle()

    if (tkErr) throw tkErr
    if (!tk) return json({ success: false, error: 'not_found' }, 404)
    if (tk.blocked_at) return json({ success: false, error: 'blocked' }, 403)
    if (tk.used_at) return json({ success: false, error: 'already_used' }, 409)
    if (new Date(tk.expires_at) < new Date()) return json({ success: false, error: 'expired' }, 410)

    // ── Carrega dados para exibir o formulário (sem expor code/token de volta) ──
    if (action === 'load') {
      const [{ data: patient }, { data: questions, error: qErr }] = await Promise.all([
        supabase
          .from('patients')
          .select('full_name, phone, email, birth_date, gender, marital_status, profession, address, responsible, responsible_cpf')
          .eq('id', tk.patient_id)
          .maybeSingle(),
        supabase.from('anamnese_questions').select('*').eq('active', true).order('sequence'),
      ])
      if (qErr) throw qErr
      return json({ success: true, patient, questions })
    }

    // ── Verifica o código de 6 dígitos enviado por WhatsApp ──
    if (action === 'verify-code') {
      const { code } = body
      if (!code) return json({ success: false, error: 'code é obrigatório' }, 400)

      if (code === tk.code) {
        return json({ success: true, valid: true })
      }

      const newAttempts = (tk.attempts ?? 0) + 1
      const isBlocked = newAttempts >= MAX_ATTEMPTS
      await supabase
        .from('anamnese_tokens')
        .update({ attempts: newAttempts, ...(isBlocked ? { blocked_at: new Date().toISOString() } : {}) })
        .eq('id', tk.id)

      return json({
        success: true,
        valid: false,
        blocked: isBlocked,
        attemptsRemaining: Math.max(0, MAX_ATTEMPTS - newAttempts),
      })
    }

    // ── Grava o formulário concluído ──
    if (action === 'submit') {
      const { code, personal, answers } = body
      if (code !== tk.code) return json({ success: false, error: 'invalid_code' }, 401)
      if (!Array.isArray(answers) || answers.length === 0) {
        return json({ success: false, error: 'answers é obrigatório' }, 400)
      }

      const { data: patient } = await supabase
        .from('patients').select('full_name, phone').eq('id', tk.patient_id).maybeSingle()

      const now = new Date().toISOString()
      const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null
      const userAgent = req.headers.get('user-agent') ?? null

      const updatePayload: Record<string, string | null> = {
        email: personal?.email || null,
        profession: personal?.profession || null,
        address: personal?.address || null,
        responsible: personal?.responsible || null,
        responsible_cpf: personal?.responsibleCpf || null,
      }
      if (personal?.birthDate) updatePayload.birth_date = personal.birthDate
      if (personal?.gender) updatePayload.gender = personal.gender
      if (personal?.maritalStatus) updatePayload.marital_status = personal.maritalStatus

      const { error: patientErr } = await supabase.from('patients').update(updatePayload).eq('id', tk.patient_id)
      if (patientErr) throw patientErr

      const rows = answers.map((a: {
        questionId?: string | null; questionText: string; questionType: string;
        questionSequence: number; answerBool?: boolean | null; answerText?: string | null;
      }) => ({
        response_id: tk.response_id,
        question_id: a.questionId ?? null,
        question_text: a.questionText,
        question_type: a.questionType,
        question_sequence: a.questionSequence,
        answer_bool: a.questionType === 'sim_nao' ? (a.answerBool ?? null) : null,
        answer_text: a.answerText ?? null,
      }))

      const { data: answersData, error: answersErr } = await supabase
        .from('anamnese_answers').insert(rows).select('id')
      if (answersErr) throw answersErr
      if (!answersData || answersData.length !== rows.length) {
        throw new Error('Não foi possível salvar as respostas.')
      }

      const { data: responseData, error: responseErr } = await supabase
        .from('anamnese_responses')
        .update({
          status: 'completed',
          completed_at: now,
          patient_signed_name: personal?.fullName || patient?.full_name || null,
          signed_at: now,
          ip_address: ipAddress,
          user_agent: userAgent,
          verified_phone: patient?.phone ?? null,
        })
        .eq('id', tk.response_id)
        .select('id')
      if (responseErr) throw responseErr
      if (!responseData || responseData.length === 0) {
        throw new Error('A anamnese não pôde ser marcada como concluída.')
      }

      const { data: tokenData, error: tokenUpdErr } = await supabase
        .from('anamnese_tokens').update({ used_at: now }).eq('id', tk.id).select('id')
      if (tokenUpdErr) throw tokenUpdErr
      if (!tokenData || tokenData.length === 0) {
        throw new Error('Não foi possível confirmar o uso do link.')
      }

      return json({ success: true })
    }

    return json({ success: false, error: 'invalid_action' }, 400)
  } catch (error) {
    console.error('Erro em anamnese-flow:', error)
    return json(
      { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' },
      500,
    )
  }
})
