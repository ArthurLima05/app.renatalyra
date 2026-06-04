import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const DEFAULT_MSG_1 = 'Olá, {{nome_paciente}}! 😊\n\nA equipe da *Dra. Renata Lyra* entrando em contato.\n\nChegou a hora do seu *retorno odontológico*! 🦷\n\nPara agendar sua consulta de retorno, responda essa mensagem com:\n👇 *AGENDAR* — e nossa equipe entrará em contato para marcar o melhor horário para você.\n\nCuide do seu sorriso! 😊'
const DEFAULT_MSG_2 = 'Oi, {{nome_paciente}}! 😊\n\nPassando novamente para lembrar do seu *retorno* na Clínica Dra. Renata Lyra. 🦷\n\nAinda não conseguimos marcar sua consulta — e queremos muito cuidar do seu sorriso!\n\nResponda *AGENDAR* que nossa equipe entra em contato rapidinho! 💙'
const DEFAULT_MSG_3 = '{{nome_paciente}}, última lembrança do seu retorno! 🦷\n\nSabemos que a rotina é corrida, mas cuidar da saúde bucal faz toda a diferença. 😊\n\nNossa equipe está à disposição — responda *AGENDAR* ou ligue diretamente para a clínica.\n\nTe esperamos! 😊 — Clínica Dra. Renata Lyra'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // 1. Verifica autenticação do usuário logado
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 },
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Sessão inválida' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 },
      )
    }

    // 2. Valida o payload
    const body = await req.json()
    const { patientName, patientPhone, returnDate, notes } = body

    if (!patientPhone) {
      return new Response(
        JSON.stringify({ error: 'patientPhone é obrigatório' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
      )
    }

    const webhookUrl = Deno.env.get('N8N_RETURN_ALERT_WEBHOOK_URL')
    if (!webhookUrl) {
      return new Response(
        JSON.stringify({ error: 'Webhook de retorno não configurado no servidor' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 503 },
      )
    }

    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data: settingsRows } = await supabase
      .from('clinic_settings')
      .select('key, value')
      .in('key', ['msg_return_alert_1', 'msg_return_alert_2', 'msg_return_alert_3'])

    const settings: Record<string, string> = Object.fromEntries(
      (settingsRows ?? []).map((s: { key: string; value: string }) => [s.key, s.value]),
    )

    const n8nRes = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patientName,
        patientPhone,
        returnDate,
        notes,
        msg1: settings['msg_return_alert_1'] || DEFAULT_MSG_1,
        msg2: settings['msg_return_alert_2'] || DEFAULT_MSG_2,
        msg3: settings['msg_return_alert_3'] || DEFAULT_MSG_3,
      }),
    })

    if (!n8nRes.ok) {
      const detail = await n8nRes.text().catch(() => '')
      console.error(`n8n retornou ${n8nRes.status}: ${detail}`)
      return new Response(
        JSON.stringify({ error: `Falha ao acionar o fluxo de alerta (${n8nRes.status})` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 502 },
      )
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    )
  } catch (error) {
    console.error('Erro em trigger-return-alert:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    )
  }
})
