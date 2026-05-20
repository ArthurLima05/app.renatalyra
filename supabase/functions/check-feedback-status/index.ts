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
    const { phone, markAsSent } = await req.json()

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

    // Busca paciente pelo telefone (tenta formatos diferentes)
    let patient = null
    const { data: p1 } = await supabase
      .from('patients')
      .select('id, full_name, feedback_given, feedback_sent_at')
      .eq('phone', phone)
      .maybeSingle()

    if (p1) {
      patient = p1
    } else if (phone.length === 12 && phone.startsWith('55')) {
      const phoneWithNine = phone.slice(0, 4) + '9' + phone.slice(4)
      const { data: p2 } = await supabase
        .from('patients')
        .select('id, full_name, feedback_given, feedback_sent_at')
        .eq('phone', phoneWithNine)
        .maybeSingle()
      if (p2) patient = p2
    }

    if (!patient) {
      // Paciente não encontrado — permite envio (não bloqueia)
      console.log(`Paciente não encontrado para ${phone} — permite envio`)
      return new Response(
        JSON.stringify({ shouldSend: true, reason: 'patient_not_found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
      )
    }

    // Bloqueia se paciente já avaliou a clínica
    if (patient.feedback_given) {
      console.log(`${patient.full_name} já avaliou a clínica — feedback não enviado`)
      return new Response(
        JSON.stringify({ shouldSend: false, reason: 'already_reviewed', patientName: patient.full_name }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
      )
    }

    // Se markAsSent = true, registra o envio
    if (markAsSent) {
      await supabase
        .from('patients')
        .update({ feedback_sent_at: new Date().toISOString() })
        .eq('id', patient.id)

      console.log(`Feedback enviado para ${patient.full_name} — marcado como enviado`)
    }

    return new Response(
      JSON.stringify({ shouldSend: true, patientName: patient.full_name, patientId: patient.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    )
  } catch (error) {
    console.error('Erro em check-feedback-status:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    )
  }
})
