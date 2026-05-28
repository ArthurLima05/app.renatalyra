import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type ModulePerms = { canView: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean }
type PermsMap = Record<string, ModulePerms>

function getDefaultPermissions(profile: string): PermsMap {
  const all: Record<string, PermsMap> = {
    administrador: {
      agenda:        { canView: true,  canCreate: true,  canEdit: true,  canDelete: true },
      dashboard:     { canView: true,  canCreate: false, canEdit: false, canDelete: false },
      pacientes:     { canView: true,  canCreate: true,  canEdit: true,  canDelete: true },
      financeiro:    { canView: true,  canCreate: true,  canEdit: true,  canDelete: true },
      profissionais: { canView: true,  canCreate: true,  canEdit: true,  canDelete: true },
      notificacoes:  { canView: true,  canCreate: false, canEdit: false, canDelete: true },
      configuracoes: { canView: true,  canCreate: true,  canEdit: true,  canDelete: true },
    },
    auxiliar_tecnico: {
      agenda:        { canView: true,  canCreate: false, canEdit: false, canDelete: false },
      dashboard:     { canView: false, canCreate: false, canEdit: false, canDelete: false },
      pacientes:     { canView: true,  canCreate: false, canEdit: true,  canDelete: false },
      financeiro:    { canView: false, canCreate: false, canEdit: false, canDelete: false },
      profissionais: { canView: true,  canCreate: false, canEdit: false, canDelete: false },
      notificacoes:  { canView: true,  canCreate: false, canEdit: false, canDelete: false },
      configuracoes: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    },
    profissional: {
      agenda:        { canView: true,  canCreate: false, canEdit: true,  canDelete: false },
      dashboard:     { canView: false, canCreate: false, canEdit: false, canDelete: false },
      pacientes:     { canView: true,  canCreate: false, canEdit: true,  canDelete: false },
      financeiro:    { canView: false, canCreate: false, canEdit: false, canDelete: false },
      profissionais: { canView: true,  canCreate: false, canEdit: false, canDelete: false },
      notificacoes:  { canView: true,  canCreate: false, canEdit: false, canDelete: false },
      configuracoes: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    },
    financeiro: {
      agenda:        { canView: true,  canCreate: false, canEdit: false, canDelete: false },
      dashboard:     { canView: true,  canCreate: false, canEdit: false, canDelete: false },
      pacientes:     { canView: false, canCreate: false, canEdit: false, canDelete: false },
      financeiro:    { canView: true,  canCreate: true,  canEdit: true,  canDelete: false },
      profissionais: { canView: false, canCreate: false, canEdit: false, canDelete: false },
      notificacoes:  { canView: true,  canCreate: false, canEdit: false, canDelete: false },
      configuracoes: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    },
    gestor_relacionamento: {
      agenda:        { canView: true,  canCreate: false, canEdit: false, canDelete: false },
      dashboard:     { canView: true,  canCreate: false, canEdit: false, canDelete: false },
      pacientes:     { canView: true,  canCreate: false, canEdit: true,  canDelete: false },
      financeiro:    { canView: false, canCreate: false, canEdit: false, canDelete: false },
      profissionais: { canView: false, canCreate: false, canEdit: false, canDelete: false },
      notificacoes:  { canView: true,  canCreate: false, canEdit: false, canDelete: false },
      configuracoes: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    },
    recepcionista: {
      agenda:        { canView: true,  canCreate: true,  canEdit: true,  canDelete: false },
      dashboard:     { canView: false, canCreate: false, canEdit: false, canDelete: false },
      pacientes:     { canView: true,  canCreate: true,  canEdit: true,  canDelete: false },
      financeiro:    { canView: false, canCreate: false, canEdit: false, canDelete: false },
      profissionais: { canView: true,  canCreate: false, canEdit: false, canDelete: false },
      notificacoes:  { canView: true,  canCreate: false, canEdit: false, canDelete: false },
      configuracoes: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    },
    marketing: {
      agenda:        { canView: false, canCreate: false, canEdit: false, canDelete: false },
      dashboard:     { canView: true,  canCreate: false, canEdit: false, canDelete: false },
      pacientes:     { canView: false, canCreate: false, canEdit: false, canDelete: false },
      financeiro:    { canView: true,  canCreate: false, canEdit: false, canDelete: false },
      profissionais: { canView: false, canCreate: false, canEdit: false, canDelete: false },
      notificacoes:  { canView: false, canCreate: false, canEdit: false, canDelete: false },
      configuracoes: { canView: false, canCreate: false, canEdit: false, canDelete: false },
      funil:         { canView: true,  canCreate: true,  canEdit: true,  canDelete: true  },
    },
  }
  return all[profile] ?? all['recepcionista']
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { email, fullName, phone, profile } = await req.json()

    if (!email || !fullName || !profile) {
      return new Response(
        JSON.stringify({ error: 'email, fullName e profile são obrigatórios' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const appUrl = Deno.env.get('APP_URL') ?? 'https://app.renatalyra.com.br'

    // Tenta gerar link de convite; se o usuário já existe, gera link de recuperação
    let linkData: any = null
    let inviteError: any = null

    const inviteResult = await supabase.auth.admin.generateLink({
      type: 'invite',
      email,
      options: { data: { full_name: fullName }, redirectTo: `${appUrl}/aceitar-convite` },
    })

    if (inviteResult.error) {
      // Usuário já existe — gera recovery link
      const recoveryResult = await supabase.auth.admin.generateLink({
        type: 'recovery',
        email,
        options: { redirectTo: `${appUrl}/aceitar-convite` },
      })
      if (recoveryResult.error) {
        inviteError = recoveryResult.error
      } else {
        linkData = recoveryResult.data
      }
    } else {
      linkData = inviteResult.data
    }

    if (inviteError || !linkData?.user) {
      console.error('Link error:', inviteError)
      return new Response(
        JSON.stringify({ error: inviteError?.message ?? 'Falha ao gerar link' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
      )
    }

    const user = linkData.user
    const inviteLink = linkData.properties?.action_link ?? null

    // Upsert perfil em app_users (cria ou ignora se já existe)
    const { error: profileError } = await supabase.from('app_users').upsert({
      id: user.id,
      email: user.email,
      full_name: fullName,
      phone: phone ?? null,
      profile,
    }, { onConflict: 'id', ignoreDuplicates: true })

    if (profileError) {
      console.error('Profile error:', profileError)
    }

    // Upsert permissões padrão
    const defaultPerms = getDefaultPermissions(profile)
    const permsRows = Object.entries(defaultPerms).map(([module, p]) => ({
      user_id: user.id,
      module,
      can_view: p.canView,
      can_create: p.canCreate,
      can_edit: p.canEdit,
      can_delete: p.canDelete,
    }))

    const { error: permsError } = await supabase.from('user_permissions')
      .upsert(permsRows, { onConflict: 'user_id,module', ignoreDuplicates: true })
    if (permsError) console.error('Permissions error:', permsError)

    return new Response(
      JSON.stringify({ success: true, userId: user.id, inviteLink }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    )
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido'
    console.error('Erro em invite-user:', msg)
    return new Response(
      JSON.stringify({ error: msg }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    )
  }
})
