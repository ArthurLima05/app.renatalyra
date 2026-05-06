import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

type PermMap = Record<string, {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}>;

interface PermissionsContextType {
  isAdmin: boolean;
  loading: boolean;
  canView: (module: string) => boolean;
  canCreate: (module: string) => boolean;
  canEdit: (module: string) => boolean;
  canDelete: (module: string) => boolean;
  hasAnyPermission: (module: string) => boolean;
}

const PermissionsContext = createContext<PermissionsContextType>({
  isAdmin: false,
  loading: true,
  canView: () => false,
  canCreate: () => false,
  canEdit: () => false,
  canDelete: () => false,
  hasAnyPermission: () => false,
});

export const usePermissionsCtx = () => useContext(PermissionsContext);

export const PermissionsProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [perms, setPerms] = useState<PermMap>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); return; }

    const load = async () => {
      // Verifica se é admin pela tabela user_roles
      const { data: roleRows } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .limit(1);

      if (roleRows?.[0]?.role === 'admin') {
        setIsAdmin(true);
        setLoading(false);
        return;
      }

      // Carrega permissões do usuário pela tabela user_permissions
      const { data } = await (supabase as any)
        .from('user_permissions')
        .select('module, can_view, can_create, can_edit, can_delete')
        .eq('user_id', user.id);

      const map: PermMap = {};
      for (const row of data || []) {
        map[row.module] = {
          canView: row.can_view,
          canCreate: row.can_create,
          canEdit: row.can_edit,
          canDelete: row.can_delete,
        };
      }
      setPerms(map);
      setLoading(false);
    };

    load();
  }, [user, authLoading]);

  const canView   = useCallback((m: string) => isAdmin || (perms[m]?.canView   ?? false), [isAdmin, perms]);
  const canCreate = useCallback((m: string) => isAdmin || (perms[m]?.canCreate ?? false), [isAdmin, perms]);
  const canEdit   = useCallback((m: string) => isAdmin || (perms[m]?.canEdit   ?? false), [isAdmin, perms]);
  const canDelete = useCallback((m: string) => isAdmin || (perms[m]?.canDelete ?? false), [isAdmin, perms]);
  const hasAnyPermission = useCallback((m: string) => {
    if (isAdmin) return true;
    const p = perms[m];
    return !!(p?.canView || p?.canCreate || p?.canEdit || p?.canDelete);
  }, [isAdmin, perms]);

  return (
    <PermissionsContext.Provider value={{ isAdmin, loading, canView, canCreate, canEdit, canDelete, hasAnyPermission }}>
      {children}
    </PermissionsContext.Provider>
  );
};
