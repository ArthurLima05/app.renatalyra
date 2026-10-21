import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Data atual em horário de Brasília (componentes de data/dia da semana corretos
// independentemente do timezone do servidor).
function getBrDate(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
}

// Avança N dias úteis (segunda a sexta). A clínica não atende sábado nem domingo.
function addBusinessDays(date: Date, n: number): Date {
  const d = new Date(date)
  let added = 0
  while (added < n) {
    d.setDate(d.getDate() + 1)
    const dow = d.getDay()
    if (dow !== 0 && dow !== 6) added++
  }
  return d
}

function formatDateStr(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// Limites do dia em BRT (UTC-3) como ISO strings — compatível com timestamptz
function dayBounds(date: Date): { start: string; end: string } {
  const next = new Date(date)
  next.setDate(next.getDate() + 1)
  return {
    start: `${formatDateStr(date)}T00:00:00-03:00`,
    end: `${formatDateStr(next)}T00:00:00-03:00`,
  }
}

// Trava de teste: se clinic_settings.test_only_phone estiver preenchida no formato
// "5581999999999|2026-10-21T23:59:00-03:00", só consultas desse telefone são retornadas
// até o horário indicado. Depois dele a trava é ignorada sozinha (evita esquecimento).
const onlyDigits = (s: unknown) => String(s ?? '').replace(/\D/g, '')
const nationalPhone = (s: unknown) => {
  const d = onlyDigits(s)
  return d.length > 11 && d.startsWith('55') ? d.slice(2) : d
}

async function applyTestFilter<T extends { patients?: unknown }>(
  supabase: ReturnType<typeof createClient>,
  appointments: T[] | null,
): Promise<T[]> {
  const list = appointments ?? []
  const { data } = await supabase
    .from('clinic_settings')
    .select('value')
    .eq('key', 'test_only_phone')
    .maybeSingle()

  const [rawPhone, until] = String(data?.value ?? '').split('|')
  const only = nationalPhone(rawPhone)
  if (!only || !until || Date.now() > new Date(until).getTime()) return list

  console.log(`[teste] filtrando apenas o telefone ${only} (até ${until})`)
  return list.filter((a) => nationalPhone((a.patients as { phone?: string } | null)?.phone) === only)
}

const APPOINTMENT_SELECT = `
  id, date, time, status, patient_id, professional_id,
  notified_24h_at,
  patients (id, full_name, phone, email),
  professionals (id, name, specialty)
`

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

    if (mode !== 'confirmacao' && mode !== 'lembrete' && mode !== 'lembrete_dia') {
      return new Response(
        JSON.stringify({ success: false, error: 'mode deve ser "confirmacao", "lembrete" ou "lembrete_dia"' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const today = getBrDate()

    // ── Modo "confirmacao" — scheduler das 10h ───────────────────────────────
    // Primeira mensagem: consultas daqui a 2 dias úteis que ainda não receberam
    // aviso. Quinta cobre segunda, sexta cobre terça.
    if (mode === 'confirmacao') {
      const { start, end } = dayBounds(addBusinessDays(today, 2))

      const [{ data: setting }, { data: appointments, error }] = await Promise.all([
        supabase
          .from('clinic_settings')
          .select('value')
          .eq('key', 'msg_appointment_confirmation')
          .maybeSingle(),
        supabase
          .from('appointments')
          .select(APPOINTMENT_SELECT)
          .eq('status', 'agendado')
          .is('deleted_at', null)
          .gte('date', start)
          .lt('date', end)
          .is('notified_24h_at', null)
          .order('time', { ascending: true }),
      ])

      if (error) throw error

      const message = setting?.value
        ?? 'Olá {{nome_paciente}}, tudo bem? 😊\n\nSua consulta está marcada para o dia *{{data}}* às *{{hora}}*.\n\nConfirme sua presença respondendo *SIM* ou cancele respondendo *NÃO*.\n\n❤️ Clínica Renata Lyra'

      const filtered = await applyTestFilter(supabase, appointments)
      console.log(`[confirmacao] ${filtered.length} consultas para notificar`)

      return new Response(
        JSON.stringify({ success: true, mode, appointments: filtered, message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
      )
    }

    // ── Modo "lembrete" — scheduler das 15h ──────────────────────────────────
    // Dia útil seguinte: quem ainda não confirmou (status agendado) e ainda não
    // recebeu este lembrete. Inclui notified_24h_at para distinguir quem já
    // recebeu a confirmação (lembrete) de quem nunca foi avisado (primeiro aviso).
    if (mode === 'lembrete') {
      const { start, end } = dayBounds(addBusinessDays(today, 1))

      const [{ data: settingLembrete }, { data: settingPrimeira }, { data: appointments, error }] = await Promise.all([
        supabase
          .from('clinic_settings')
          .select('value')
          .eq('key', 'msg_confirmation_12h')
          .maybeSingle(),
        supabase
          .from('clinic_settings')
          .select('value')
          .eq('key', 'msg_appointment_first_only')
          .maybeSingle(),
        supabase
          .from('appointments')
          .select(APPOINTMENT_SELECT)
          .eq('status', 'agendado')
          .is('deleted_at', null)
          .gte('date', start)
          .lt('date', end)
          .is('notified_12h_at', null)
          .order('time', { ascending: true }),
      ])

      if (error) throw error

      // message → lembrete para quem já recebeu a confirmação
      const message = settingLembrete?.value
        ?? '🔔 Ainda aguardamos sua confirmação.\n\nOlá {{nome_paciente}}! Sua consulta está marcada para o dia *{{data}}* às *{{hora}}*. Confirme com SIM ou cancele com NÃO.'

      // message_primeira → primeiro (e único) aviso para quem foi agendado depois da confirmação
      const message_primeira = settingPrimeira?.value
        ?? 'Olá {{nome_paciente}}! 😊\n\nSua consulta com {{profissional}} está marcada para o dia *{{data}}* às *{{hora}}*.\n\nResponda:\n*SIM* para confirmar\n*NÃO* para cancelar\n*REMARCAR* para remarcar'

      const filtered = await applyTestFilter(supabase, appointments)
      console.log(`[lembrete] ${filtered.length} consultas sem confirmação`)

      return new Response(
        JSON.stringify({ success: true, mode, appointments: filtered, message, message_primeira }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
      )
    }

    // ── Modo "lembrete_dia" — scheduler das 8h ───────────────────────────────
    // Consultas de hoje (confirmadas ou não) que ainda não receberam o lembrete
    // do dia. Cobre também quem foi agendado de última hora.
    const { start, end } = dayBounds(today)

    const [{ data: settingDia }, { data: appointments, error }] = await Promise.all([
      supabase
        .from('clinic_settings')
        .select('value')
        .eq('key', 'msg_reminder_day')
        .maybeSingle(),
      supabase
        .from('appointments')
        .select(APPOINTMENT_SELECT)
        .in('status', ['agendado', 'confirmado'])
        .is('deleted_at', null)
        .gte('date', start)
        .lt('date', end)
        .is('notified_3h_at', null)
        .order('time', { ascending: true }),
    ])

    if (error) throw error

    const message = settingDia?.value
      ?? 'Bom dia, {{nome_paciente}}! ☀️\n\nPassando para lembrar da sua consulta *hoje*, dia *{{data}}*, às *{{hora}}* com {{profissional}}.\n\nTe esperamos! 😊\n\n❤️ Clínica Renata Lyra'

    const filtered = await applyTestFilter(supabase, appointments)
    console.log(`[lembrete_dia] ${filtered.length} consultas hoje`)

    return new Response(
      JSON.stringify({ success: true, mode, appointments: filtered, message }),
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
