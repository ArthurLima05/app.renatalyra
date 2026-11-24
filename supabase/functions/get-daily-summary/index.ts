import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0'

// Resumo diário (financeiro + agenda) para a Dra., enviado pelo n8n via WhatsApp.
// Somente leitura. Retorna a mensagem já formatada e a lista de destinatários
// (clinic_settings.daily_summary_phones, separados por vírgula) — nenhum número
// fica no código.
//
// GET/POST  ?date=YYYY-MM-DD   (opcional; padrão = hoje no horário de Brasília)
// Header:   x-api-key = N8N_WEBHOOK_SECRET

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  })

const BRL = (v: number) =>
  'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const METHOD_LABEL: Record<string, string> = {
  pix: 'PIX',
  dinheiro: 'Dinheiro',
  cartao_credito: 'Cartão de crédito',
  cartao_debito: 'Cartão de débito',
  boleto: 'Boleto',
  cheque: 'Cheque',
}

const SESSION_TYPE_LABEL: Record<string, string> = {
  primeira_consulta: 'Primeira consulta',
  consulta_avulsa: 'Consulta avulsa',
  retorno: 'Retorno',
}

const clean = (s: string | null | undefined) => (s ?? '').trim()
const capitalize = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)
// "MARIA DA SILVA SANTOS" -> "Maria Santos"
const shortName = (full: string | null | undefined) => {
  // ignora apelidos/observações no cadastro: "SEVERINO NEVES - (Sabiá)" -> "SEVERINO NEVES"
  const base = clean(full).replace(/\(.*?\)/g, ' ').split(' - ')[0]
  const parts = base.toLowerCase().split(/\s+/).filter((p) => /[a-zà-ú]/i.test(p))
  if (parts.length === 0) return 'Paciente não identificado'
  const pick = parts.length > 1 ? [parts[0], parts[parts.length - 1]] : parts
  return pick.map(capitalize).join(' ')
}
const methodText = (method: string | null, installments: number | null) => {
  if (!method) return 'Forma não informada'
  const label = METHOD_LABEL[method] ?? method
  return method === 'cartao_credito' && installments && installments > 1 ? `${label} (${installments}x)` : label
}

const WEEKDAYS = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']

// Brasília = UTC-3 (sem horário de verão desde 2019).
const BRT = '-03:00'
const dayStart = (ymd: string) => new Date(`${ymd}T00:00:00${BRT}`)
const addDays = (ymd: string, n: number) => {
  const d = new Date(`${ymd}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}
const todayBRT = () => new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const expectedKey = Deno.env.get('N8N_WEBHOOK_SECRET')
    if (!expectedKey) return json({ success: false, error: 'Serviço não configurado' }, 503)
    if (req.headers.get('x-api-key') !== expectedKey) {
      return json({ success: false, error: 'Não autorizado' }, 401)
    }

    const url = new URL(req.url)
    const dateParam = url.searchParams.get('date')
    if (dateParam && !/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      return json({ success: false, error: 'date deve ser YYYY-MM-DD' }, 400)
    }
    const day = dateParam ?? todayBRT()
    const next = addDays(day, 1)
    const monthFirst = `${day.slice(0, 7)}-01`

    const t0 = dayStart(day).toISOString()
    const t1 = dayStart(next).toISOString()
    const tMonth = dayStart(monthFirst).toISOString()
    const t7 = dayStart(addDays(day, 8)).toISOString() // próximos 7 dias após o dia

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const [dayTx, monthTx, apptToday, apptTomorrow, overdue, upcoming, setting] = await Promise.all([
      // A forma de pagamento costuma estar na sessão (não é copiada para a transação),
      // por isso buscamos a sessão junto e usamos a dela como reserva.
      supabase.from('transactions').select(`
          type, amount, date, description, category, payment_method, installment_count,
          patients ( full_name ),
          professionals ( name ),
          sessions ( type, session_type, payment_method, installment_count, professionals ( name ) )
        `)
        .gte('date', t0).lt('date', t1).order('date'),
      supabase.from('transactions').select('amount')
        .eq('type', 'entrada').gte('date', tMonth).lt('date', t1),
      supabase.from('appointments').select('status')
        .gte('date', t0).lt('date', t1).is('deleted_at', null),
      supabase.from('appointments').select('status')
        .gte('date', t1).lt('date', dayStart(addDays(day, 2)).toISOString())
        .is('deleted_at', null).in('status', ['agendado', 'confirmado']),
      supabase.from('installments').select('amount')
        .eq('paid', false).lt('predicted_date', t0),
      supabase.from('installments').select('amount')
        .eq('paid', false).gte('predicted_date', t1).lt('predicted_date', t7),
      supabase.from('clinic_settings').select('value')
        .eq('key', 'daily_summary_phones').maybeSingle(),
    ])

    for (const r of [dayTx, monthTx, apptToday, apptTomorrow, overdue, upcoming]) {
      if (r.error) throw r.error
    }

    const sum = (rows: { amount: number | string }[] | null) =>
      (rows ?? []).reduce((a, r) => a + Number(r.amount), 0)

    // Financeiro do dia — cada lançamento já com forma de pagamento, origem e profissional resolvidos
    // deno-lint-ignore no-explicit-any
    const rows = (dayTx.data ?? []).map((t: any) => {
      const s = t.sessions ?? null
      const method: string | null = t.payment_method ?? s?.payment_method ?? null
      const installments: number | null = t.installment_count ?? s?.installment_count ?? null
      const procedure =
        clean(s?.type) ||
        clean(clean(t.description).replace(/^Pagamento\s*-\s*/i, '')) ||
        SESSION_TYPE_LABEL[s?.session_type] ||
        clean(t.category) ||
        'Sem descrição'
      return {
        type: t.type as string,
        amount: Number(t.amount),
        method,
        installments,
        procedure: capitalize(procedure),
        patient: t.patients?.full_name ? shortName(t.patients.full_name) : null,
        professional: clean(t.professionals?.name ?? s?.professionals?.name) || null,
        description: clean(t.description) || clean(t.category) || 'Sem descrição',
      }
    })
    const entradas = rows.filter((t) => t.type === 'entrada')
    const saidas = rows.filter((t) => t.type === 'saida')
    const totalEntradas = sum(entradas)
    const totalSaidas = sum(saidas)
    const saldo = totalEntradas - totalSaidas

    // Resumo por forma de pagamento (com quantidade de lançamentos)
    const byMethod = new Map<string, { total: number; n: number }>()
    for (const t of entradas) {
      const key = t.method ?? '__none__'
      const cur = byMethod.get(key) ?? { total: 0, n: 0 }
      byMethod.set(key, { total: cur.total + t.amount, n: cur.n + 1 })
    }
    const methodLines = [...byMethod.entries()]
      .sort((a, b) => b[1].total - a[1].total)
      .map(([m, v]) => `• ${m === '__none__' ? 'Forma não informada' : (METHOD_LABEL[m] ?? m)}: ${BRL(v.total)} (${v.n})`)

    // Só mostra o profissional quando houver mais de um no dia
    const showProfessional = new Set(entradas.map((t) => t.professional).filter(Boolean)).size > 1
    const entryLines = entradas.flatMap((t, i) => [
      `${i + 1}. *${t.patient ?? t.procedure}*${t.patient ? ` — ${t.procedure}` : ''}`,
      `    ${methodText(t.method, t.installments)} · ${BRL(t.amount)}${showProfessional && t.professional ? ` · ${t.professional}` : ''}`,
    ])
    const exitLines = saidas.map((t) => `• ${t.description}: ${BRL(t.amount)}${t.method ? ` (${methodText(t.method, t.installments)})` : ''}`)

    // Agenda do dia
    const count = (s: string) => (apptToday.data ?? []).filter((a) => a.status === s).length
    const realizados = count('realizado')
    const faltas = count('falta')
    const cancelados = count('cancelado')
    const amanha = apptTomorrow.data?.length ?? 0

    // Parcelas
    const overdueRows = overdue.data ?? []
    const overdueTotal = sum(overdueRows)
    const upcomingTotal = sum(upcoming.data)

    const monthTotal = sum(monthTx.data)

    const [y, m, d] = day.split('-')
    const weekday = WEEKDAYS[new Date(`${day}T12:00:00Z`).getUTCDay()]

    const lines: string[] = [
      '📊 *Resumo do dia — Clínica Renata Lyra*',
      `${weekday}, ${d}/${m}/${y}`,
      '',
      '💰 *Financeiro*',
      `• Entradas: ${BRL(totalEntradas)}`,
      `• Saídas: ${BRL(totalSaidas)}`,
      `• *Saldo do dia: ${BRL(saldo)}*`,
      '',
      ...(entradas.length > 0
        ? [
            '💳 *Por forma de pagamento*',
            ...methodLines,
            '',
            `🧾 *Entradas do dia (${entradas.length})*`,
            ...entryLines,
            '',
          ]
        : ['🧾 Nenhuma entrada registrada hoje.', '']),
      ...(saidas.length > 0 ? [`📤 *Saídas do dia (${saidas.length})*`, ...exitLines, ''] : []),
      '📅 *Agenda*',
      `• Atendimentos realizados: ${realizados}`,
      `• Faltas: ${faltas}`,
      `• Cancelamentos: ${cancelados}`,
      `• Agendados para amanhã: ${amanha}`,
      '',
      '⏳ *Atenção*',
      `• Parcelas vencidas em aberto: ${overdueRows.length} (${BRL(overdueTotal)})`,
      `• Parcelas a receber nos próximos 7 dias: ${BRL(upcomingTotal)}`,
      '',
      '📈 *No mês*',
      `• Faturamento acumulado: ${BRL(monthTotal)}`,
      '',
      'Bom descanso, Dra.! 🦷',
    ]

    const recipients = (setting.data?.value ?? '')
      .split(',')
      .map((p: string) => p.replace(/\D/g, ''))
      .filter((p: string) => p.length >= 10)

    return json({
      success: true,
      date: day,
      message: lines.join('\n'),
      recipients,
      totals: {
        entradas: totalEntradas,
        saidas: totalSaidas,
        saldo,
        realizados,
        faltas,
        cancelados,
        amanha,
        parcelasVencidas: overdueRows.length,
        faturamentoMes: monthTotal,
      },
    })
  } catch (error) {
    console.error('Erro em get-daily-summary:', error)
    return json({ success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' }, 500)
  }
})
