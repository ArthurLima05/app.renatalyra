import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { DEMO_MODE } from '@/lib/demoMode';

export type UserRole = 'admin' | 'secretaria' | null;

const useUserRoleDemo = () => {
  const { user } = useAuth();
  const role: UserRole = user ? 'admin' : null;
  return { role, loading: false, isAdmin: role === 'admin', isSecretaria: false };
};

const useUserRoleReal = () => {
  const { user } = useAuth();
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setRole(null);
      setLoading(false);
      return;
    }

    const fetchRole = async () => {
      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .limit(1);

        if (error) console.error('Error fetching user role:', error);
        setRole((data?.[0]?.role as UserRole) ?? null);
      } catch (err) {
        setRole(null);
      } finally {
        setLoading(false);
      }
    };

    fetchRole();
  }, [user]);

  return { role, loading, isAdmin: role === 'admin', isSecretaria: role === 'secretaria' };
};

export const useUserRole = DEMO_MODE ? useUserRoleDemo : useUserRoleReal;
