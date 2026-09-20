import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { DEMO_MODE } from '@/lib/demoMode';
import { demoGetUser, onDemoAuthChange, DemoUser } from '@/lib/demoAuth';

const useAuthDemo = () => {
  const [user, setUser] = useState<DemoUser | null>(() => demoGetUser());
  const [loading, setLoading] = useState(false);

  useEffect(() => onDemoAuthChange(() => setUser(demoGetUser())), []);

  return { user: user as unknown as User | null, loading };
};

const useAuthReal = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { user, loading };
};

export const useAuth = DEMO_MODE ? useAuthDemo : useAuthReal;
