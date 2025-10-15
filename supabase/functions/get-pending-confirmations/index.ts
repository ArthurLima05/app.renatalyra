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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Busca agendamentos com status "agendado"
    const { data: appointments, error } = await supabase
      .from('appointments')
      .select(`
        id,
        date,
        time,
        status,
        notes,
        patient_id,
        professional_id,
        patients (
          id,
          full_name,
          phone,
          email
        ),
        professionals (
          id,
          name,
          specialty
        )
      `)
      .eq('status', 'agendado')
      .order('date', { ascending: true })

    if (error) {
      console.error('Erro ao buscar agendamentos:', error)
      throw error
    }

    console.log(`Encontrados ${appointments?.length || 0} agendamentos pendentes de confirmação`)

    return new Response(
      JSON.stringify({
        success: true,
        appointments: appointments || [],
        count: appointments?.length || 0
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Erro na função get-pending-confirmations:', error)
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
