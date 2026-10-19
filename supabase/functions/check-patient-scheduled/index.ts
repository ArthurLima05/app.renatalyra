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
    // 1. Valida a API key do n8n
    const apiKey = req.headers.get('x-api-key')
    const expectedKey = Deno.env.get('N8N_WEBHOOK_SECRET')

    if (!expectedKey) {
      console.error('N8N_WEBHOOK_SECRET não configurado')
      return new Response(
        JSON.stringify({ error: 'Serviço não configurado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 503 },
      )
    }

    if (!apiKey || apiKey !== expectedKey) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 },
      )
    }

    // 2. Valida o payload
    const { phone } = await req.json()

    if (!phone) {
      return new Response(
        JSON.stringify({ error: 'phone é obrigatório' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // O n8n envia o telefone com DDI ("5511999998888"), mas o cadastro pode ter sido
    // salvo com ou sem o 55. Busca as duas variações direto no banco (evita o limite
    // de 1000 linhas do PostgREST).
    const digits = String(phone).replace(/\D/g, '')
    const national = digits.length > 11 && digits.startsWith('55') ? digits.slice(2) : digits
    const variants = [digits, national, '55' + national]

    const { data: matches } = await supabase
      .from('patients')
      .select('id, full_name')
      .in('phone', variants)

    const patient = matches?.[0] ?? null
    const patientIds = (matches ?? []).map((p: { id: string }) => p.id)

    if (!patient) {
      return new Response(
        JSON.stringify({ hasAppointment: false, patientName: '' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
      )
    }

    // Usa fuso de Brasília para não virar o dia às 21h UTC
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })

    const { data: appointments } = await supabase
      .from('appointments')
      .select('id')
      .in('patient_id', patientIds)
      .is('deleted_at', null)
      .in('status', ['agendado', 'confirmado'])
      .gte('date', today)
      .limit(1)

    console.log(`Paciente ${patient.full_name} — agendamento futuro: ${(appointments?.length ?? 0) > 0}`)

    return new Response(
      JSON.stringify({
        hasAppointment: (appointments?.length ?? 0) > 0,
        patientName: patient.full_name,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    )
  } catch (error) {
    console.error('Erro em check-patient-scheduled:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    )
  }
})
