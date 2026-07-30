import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const DEFAULT_MSG = 'Olá {{nome_paciente}}, Fran aqui do Consultório Dra. Renata Lyra.\n\nNotamos que há uma pendência em seu CPF em nosso sistema.\nPodemos contar com seu pagamento para hoje?\n\nÉ possivel?'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // 1. Valida a API key do n8n
    const apiKey = req.headers.get('x-api-key')
    const expectedKey = Deno.env.get('N8N_WEBHOOK_SECRET')

    if (!expectedKey) {
      console.error('N8N_WEBHOOK_SECRET não configurado')
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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Parcelas não pagas, vencidas há exatamente ~2 dias (janela de 48h a 72h),
    // ainda não notificadas. A janela evita repescar parcelas antigas (vencidas
    // há 10, 20 dias) toda vez que o fluxo roda.
    const windowStart = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString()
    const windowEnd = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()

    const { data: installments, error } = await supabase
      .from('installments')
      .select(`
        id,
        amount,
        predicted_date,
        installment_number,
        total_installments,
        session_id,
        sessions (
          id,
          patient_id,
          type,
          patients (
            id,
            full_name,
            phone,
            cpf
          )
        )
      `)
      .eq('paid', false)
      .is('overdue_notified_at', null)
      .gte('predicted_date', windowStart)
      .lt('predicted_date', windowEnd)

    if (error) throw error

    const { data: setting } = await supabase
      .from('clinic_settings')
      .select('value')
      .eq('key', 'msg_pix_overdue')
      .maybeSingle()

    const message = setting?.value ?? DEFAULT_MSG

    const items = (installments ?? [])
      .filter((i: any) => i.sessions?.patients?.phone)
      .map((i: any) => ({
        installmentId: i.id,
        amount: i.amount,
        predictedDate: i.predicted_date,
        installmentNumber: i.installment_number,
        totalInstallments: i.total_installments,
        procedure: i.sessions?.type ?? null,
        patientId: i.sessions?.patients?.id,
        patientName: i.sessions?.patients?.full_name,
        patientPhone: i.sessions?.patients?.phone,
        patientCpf: i.sessions?.patients?.cpf ?? null,
      }))

    console.log(`Encontradas ${items.length} parcela(s) vencida(s) há ~2 dias`)

    return new Response(
      JSON.stringify({
        success: true,
        count: items.length,
        items,
        message,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    )
  } catch (error) {
    console.error('Erro em get-overdue-installments:', error)
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    )
  }
})
