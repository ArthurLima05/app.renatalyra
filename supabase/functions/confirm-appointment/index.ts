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
    const { appointmentId } = await req.json()

    if (!appointmentId) {
      throw new Error('appointmentId é obrigatório')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Atualiza status para confirmado
    const { data, error } = await supabase
      .from('appointments')
      .update({ status: 'confirmado' })
      .eq('id', appointmentId)
      .select()
      .single()

    if (error) {
      console.error('Erro ao confirmar agendamento:', error)
      throw error
    }

    console.log('Agendamento confirmado:', appointmentId)

    return new Response(
      JSON.stringify({
        success: true,
        appointment: data
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Erro na função confirm-appointment:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})
