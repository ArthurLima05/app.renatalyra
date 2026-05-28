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
      dashboard:     { canView: false, canCreate: false, canEdit: false, canDelete: false },
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

    // Convida o usuário via Supabase Auth
    const { data: { user }, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName },
      redirectTo: `${appUrl}/aceitar-convite`,
    })

    if (inviteError || !user) {
      console.error('Invite error:', inviteError)
      return new Response(
        JSON.stringify({ error: inviteError?.message ?? 'Falha ao convidar usuário' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
      )
    }

    // Cria o perfil em app_users
    const { error: profileError } = await supabase.from('app_users').insert({
      id: user.id,
      email: user.email,
      full_name: fullName,
      phone: phone ?? null,
      profile,
    })

    if (profileError) {
      console.error('Profile error:', profileError)
    }

    // Cria permissões padrão
    const defaultPerms = getDefaultPermissions(profile)
    const permsRows = Object.entries(defaultPerms).map(([module, p]) => ({
      user_id: user.id,
      module,
      can_view: p.canView,
      can_create: p.canCreate,
      can_edit: p.canEdit,
      can_delete: p.canDelete,
    }))

    const { error: permsError } = await supabase.from('user_permissions').insert(permsRows)
    if (permsError) console.error('Permissions error:', permsError)

    return new Response(
      JSON.stringify({ success: true, userId: user.id }),
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
