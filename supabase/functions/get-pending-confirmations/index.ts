import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Data atual em horário de Brasília (componentes de data/dia da semana corretos
// independentemente do timezone do servidor), com offset de dias aplicado.
function getBrDate(offsetDays = 0): Date {
  const br = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
  br.setDate(br.getDate() + offsetDays)
  return br
}

function formatDateStr(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// Limites de um dia em BRT (UTC-3) como ISO strings — compatível com timestamptz
function dayBounds(offsetDays: number): { start: string; end: string } {
  return {
    start: `${formatDateStr(getBrDate(offsetDays))}T00:00:00-03:00`,
    end: `${formatDateStr(getBrDate(offsetDays + 1))}T00:00:00-03:00`,
  }
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
    const mode: string = body.mode ?? 'confirmacao'

    if (mode !== 'confirmacao' && mode !== 'lembrete') {
      return new Response(
        JSON.stringify({ success: false, error: 'mode deve ser "confirmacao" ou "lembrete"' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // ── Modo "confirmacao" — disparado pelo scheduler das 8h ─────────────────
    // Busca consultas de amanhã (ou de segunda, se hoje for sexta) que ainda
    // não receberam a mensagem de confirmação.
    if (mode === 'confirmacao') {
      // Sexta (getDay() === 5): antecipa a confirmação de segunda em 3 dias,
      // já que sábado/domingo não rodam o fluxo normal de D-1.
      const isFriday = getBrDate(0).getDay() === 5
      const { start, end } = dayBounds(isFriday ? 3 : 1)

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
          .gte('date', start)
          .lt('date', end)
          .is('notified_24h_at', null)
          .order('time', { ascending: true }),
      ])

      if (error) throw error

      const message = setting?.value
        ?? 'Olá {{nome_paciente}}, tudo bem? 😊\n\nSua consulta está marcada para o dia *{{data}}* às *{{hora}}*.\n\nConfirme sua presença respondendo *SIM* ou cancele respondendo *NÃO*.\n\n❤️ Clínica Dra. Renata Lyra'

      console.log(`[confirmacao] ${appointments?.length ?? 0} consultas para notificar`)

      return new Response(
        JSON.stringify({
          success: true,
          mode,
          appointments: appointments ?? [],
          message,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
      )
    }

    // ── Modo "lembrete" — disparado pelo scheduler das 15h ───────────────────
    // Busca consultas de amanhã que ainda não foram confirmadas (status agendado).
    const { start, end } = dayBounds(1)

    const [{ data: setting }, { data: appointments, error }] = await Promise.all([
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
        .gte('date', start)
        .lt('date', end)
        .order('time', { ascending: true }),
    ])

    if (error) throw error

    const message = setting?.value
      ?? '🔔 Ainda aguardamos sua confirmação.\n\nOlá {{nome_paciente}}! Sua consulta está marcada para o dia *{{data}}* às *{{hora}}*. Confirme com SIM ou cancele com NÃO.'

    console.log(`[lembrete] ${appointments?.length ?? 0} consultas sem confirmação`)

    return new Response(
      JSON.stringify({
        success: true,
        mode,
        appointments: appointments ?? [],
        message,
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
