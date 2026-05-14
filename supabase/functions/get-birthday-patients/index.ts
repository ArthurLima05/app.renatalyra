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

    // Dia e mês atuais no fuso Brasil (UTC-3)
    const now = new Date(Date.now() - 3 * 60 * 60 * 1000)
    const mm = String(now.getUTCMonth() + 1).padStart(2, '0')
    const dd = String(now.getUTCDate()).padStart(2, '0')
    const mmdd = `${mm}-${dd}`

    // Busca todos os pacientes com data de nascimento e telefone preenchidos
    const { data: allPatients, error } = await supabase
      .from('patients')
      .select('id, full_name, phone, birth_date')
      .not('birth_date', 'is', null)
      .not('phone', 'is', null)
      .neq('phone', '')

    if (error) throw error

    // Filtra em JS os que fazem aniversário hoje (birth_date vem como "YYYY-MM-DD")
    const patients = (allPatients ?? []).filter((p: { birth_date: string | null }) => {
      const bd = p.birth_date
      if (!bd) return false
      const parts = bd.split('-')
      return parts[1] === mm && parts[2] === dd
    })

    // Busca template de mensagem configurado
    const { data: setting } = await supabase
      .from('clinic_settings')
      .select('value')
      .eq('key', 'msg_birthday')
      .maybeSingle()

    const birthdayMessage = setting?.value
      ?? 'Olá, {{nome_paciente}}! 🎂 A equipe da Dra. Renata Lyra deseja a você um feliz aniversário! Que este dia seja repleto de alegria e saúde. 🎉'

    console.log(`Encontrados ${patients?.length ?? 0} aniversariante(s) em ${mmdd}`)

    return new Response(
      JSON.stringify({
        success: true,
        patients: patients ?? [],
        count: patients?.length ?? 0,
        birthdayMessage,
        today: mmdd,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    )
  } catch (error) {
    console.error('Erro em get-birthday-patients:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    )
  }
})
