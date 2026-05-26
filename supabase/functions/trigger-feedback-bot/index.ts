import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { patientId } = await req.json()

    if (!patientId) {
      return new Response(
        JSON.stringify({ error: 'patientId é obrigatório' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
      )
    }

    const webhookUrl = Deno.env.get('N8N_FEEDBACK_WEBHOOK_URL')
    if (!webhookUrl) {
      return new Response(
        JSON.stringify({ error: 'Webhook de feedback não configurado no servidor' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 503 },
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Busca dados do paciente
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('id, full_name, phone, feedback_given')
      .eq('id', patientId)
      .single()

    if (patientError || !patient) {
      return new Response(
        JSON.stringify({ error: 'Paciente não encontrado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 },
      )
    }

    if (!patient.phone) {
      return new Response(
        JSON.stringify({ error: 'Paciente sem telefone cadastrado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
      )
    }

    if (patient.feedback_given) {
      return new Response(
        JSON.stringify({ success: false, reason: 'already_reviewed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
      )
    }

    // Busca link de feedback e template de mensagem nas configurações
    const { data: settings } = await supabase
      .from('clinic_settings')
      .select('key, value')
      .in('key', ['feedback_link', 'msg_feedback_request'])

    const settingsMap: Record<string, string> = {}
    for (const s of (settings ?? [])) settingsMap[s.key] = s.value

    const feedbackLink = settingsMap['feedback_link'] ?? ''
    const msgTemplate = settingsMap['msg_feedback_request']
      ?? 'Olá, {{nome_paciente}}! 🌟 Esperamos que sua consulta tenha sido excelente. Deixe sua avaliação: {{link}}'

    const message = msgTemplate
      .replace(/\{\{nome_paciente\}\}/g, patient.full_name)
      .replace(/\{\{link\}\}/g, feedbackLink)

    // Chama o webhook do n8n
    const n8nRes = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patientName: patient.full_name,
        phone: patient.phone,
        feedbackLink,
        message,
      }),
    })

    if (!n8nRes.ok) {
      const detail = await n8nRes.text().catch(() => '')
      console.error(`n8n retornou ${n8nRes.status}: ${detail}`)
      return new Response(
        JSON.stringify({ error: `Falha ao acionar o bot de feedback (${n8nRes.status})` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 502 },
      )
    }

    console.log(`Pedido de feedback enviado para ${patient.full_name}`)

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    )
  } catch (error) {
    console.error('Erro em trigger-feedback-bot:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    )
  }
})
