import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function getBrDateStr(offsetDays = 0): string {
  const br = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
  br.setDate(br.getDate() + offsetDays)
  const y = br.getFullYear()
  const m = String(br.getMonth() + 1).padStart(2, '0')
  const d = String(br.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const apiKey = req.headers.get('x-api-key')
    const expectedKey = Deno.env.get('N8N_WEBHOOK_SECRET')

    if (!expectedKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Serviço não configurado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 503 },
      )
    }

    if (!apiKey || apiKey !== expectedKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Não autorizado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 },
      )
    }

    const body = await req.json().catch(() => ({}))
    const mode: string = body.mode ?? 'tomorrow'

    if (mode !== 'tomorrow' && mode !== 'today') {
      return new Response(
        JSON.stringify({ success: false, error: 'mode deve ser "tomorrow" ou "today"' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Limites de cada dia em BRT (UTC-3) como ISO strings — compatível com timestamptz
    const tomorrowStart = `${getBrDateStr(1)}T00:00:00-03:00`
    const tomorrowEnd   = `${getBrDateStr(2)}T00:00:00-03:00`
    const todayStart    = `${getBrDateStr(0)}T00:00:00-03:00`
    const todayEnd      = tomorrowStart

    // ── Modo "tomorrow" — disparado pelo scheduler das 15h ──────────────────
    // Busca consultas de AMANHÃ que ainda não receberam notificação.
    if (mode === 'tomorrow') {
      const [{ data: setting }, { data: appointments, error }] = await Promise.all([
        supabase
          .from('clinic_settings')
          .select('value')
          .eq('key', 'msg_appointment_confirmation')
          .maybeSingle(),
        supabase
          .from('appointments')
          .select(`
            id, date, time, status, patient_id, professional_id,
            notified_24h_at,
            patients (id, full_name, phone, email),
            professionals (id, name, specialty)
          `)
          .eq('status', 'agendado')
          .gte('date', tomorrowStart)
          .lt('date', tomorrowEnd)
          .is('notified_24h_at', null)
          .order('time', { ascending: true }),
      ])

      if (error) throw error

      const confirmationMessage = setting?.value
        ?? 'Olá {{nome_paciente}}, tudo bem? 😊\n\nSua consulta está marcada para *amanhã, {{data}}* às *{{hora}}*.\n\nConfirme sua presença respondendo *SIM* ou cancele respondendo *NÃO*.\n\n❤️ Clínica Dra. Renata Lyra'

      console.log(`[tomorrow] ${appointments?.length ?? 0} consultas para notificar`)

      return new Response(
        JSON.stringify({
          success: true,
          mode,
          appointments_tomorrow: appointments ?? [],
          confirmationMessage,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
      )
    }

    // ── Modo "today" — disparado pelo scheduler das 8h ──────────────────────
    // Busca consultas de HOJE que ainda não foram confirmadas (status agendado).
    const [{ data: setting2 }, { data: appointments, error }] = await Promise.all([
      supabase
        .from('clinic_settings')
        .select('value')
        .eq('key', 'msg_confirmation_12h')
        .maybeSingle(),
      supabase
        .from('appointments')
        .select(`
          id, date, time, status, patient_id, professional_id,
          patients (id, full_name, phone, email),
          professionals (id, name, specialty)
        `)
        .eq('status', 'agendado')
        .gte('date', todayStart)
        .lt('date', todayEnd)
        .order('time', { ascending: true }),
    ])

    if (error) throw error

    const reminderMessage = setting2?.value
      ?? '🔔 Ainda aguardamos sua confirmação.\n\nOlá {{nome_paciente}}! Sua consulta está marcada para *hoje* às *{{hora}}*. Confirme com SIM ou cancele com NÃO.'

    console.log(`[today] ${appointments?.length ?? 0} consultas sem confirmação`)

    return new Response(
      JSON.stringify({
        success: true,
        mode,
        appointments_today: appointments ?? [],
        reminderMessage,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    )
  } catch (error) {
    console.error('Erro em get-pending-confirmations:', error)
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    )
  }
})
