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

    const { data: patient } = await supabase
      .from('patients')
      .select('id, full_name')
      .eq('phone', phone)
      .maybeSingle()

    if (!patient) {
      return new Response(
        JSON.stringify({ hasAppointment: false, patientName: '', patientPhone: phone }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
      )
    }

    // Usa fuso de Brasília para não virar o dia às 21h UTC
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })

    const { data: appointments } = await supabase
      .from('appointments')
      .select('id')
      .eq('patient_id', patient.id)
      .in('status', ['agendado', 'confirmado'])
      .gte('date', today)
      .limit(1)

    console.log(`Paciente ${patient.full_name} — agendamento futuro: ${(appointments?.length ?? 0) > 0}`)

    return new Response(
      JSON.stringify({
        hasAppointment: (appointments?.length ?? 0) > 0,
        patientName: patient.full_name,
        patientPhone: phone,
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
