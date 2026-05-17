import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import logoClinica from '@/assets/LightLogo.svg';
import logoClinicaDark from '@/assets/DarkLogo.svg';
import simboloDourado from '@/assets/SimboloDourado.svg';
import simboloBranco from '@/assets/SimboloBranco.svg';
import { motion } from 'framer-motion';

export default function Login() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });
      if (error) throw error;
      navigate('/');
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">

      {/* ── Painel esquerdo — desktop only ─────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden flex-col items-center justify-center p-12"
           style={{ background: 'linear-gradient(160deg, hsl(40,45%,60%) 0%, hsl(40,55%,45%) 100%)' }}>

        {/* Símbolo de fundo */}
        <img src={simboloBranco} aria-hidden="true"
             className="absolute bottom-0 right-0 h-[85%] w-auto opacity-[0.08] pointer-events-none select-none" />

        {/* Conteúdo */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10 flex flex-col items-center text-center gap-8"
        >
          <img src={logoClinicaDark} alt="Clínica Renata Lyra" className="h-48 w-auto object-contain drop-shadow-lg" />

          <div className="space-y-3">
            <h1 className="text-4xl font-cocon text-white leading-tight drop-shadow">
              Bem-vinda de volta
            </h1>
            <p className="text-white/75 text-lg leading-relaxed max-w-xs">
              Sua clínica organizada com elegância e precisão.
            </p>
          </div>

          <div className="w-12 h-0.5 bg-white/40 rounded-full" />

          <p className="text-white/60 text-sm italic font-cocon">
            "Cuidar com excelência, tratar com humanidade."
          </p>
        </motion.div>
      </div>

      {/* ── Painel direito — formulário ─────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center bg-background p-6 relative overflow-hidden">

        {/* Símbolo sutil no fundo — mobile e desktop */}
        <img src={simboloDourado} aria-hidden="true"
             className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[70%] w-auto opacity-[0.05] pointer-events-none select-none dark:hidden" />
        <img src={simboloBranco} aria-hidden="true"
             className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[70%] w-auto opacity-[0.03] pointer-events-none select-none hidden dark:block" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="w-full max-w-sm relative z-10"
        >
          {/* Logo — apenas mobile */}
          <div className="lg:hidden flex justify-center mb-8">
            <img src={logoClinica} alt="Clínica Renata Lyra" className="h-36 w-auto object-contain dark:hidden" />
            <img src={logoClinicaDark} alt="Clínica Renata Lyra" className="h-36 w-auto object-contain hidden dark:block" />
          </div>

          <div className="mb-8 text-center lg:text-left">
            <h1 className="text-3xl font-cocon text-foreground">Entrar</h1>
            <p className="text-muted-foreground mt-1 text-sm">Acesse sua conta para continuar</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="seu@email.com"
                className="h-11"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium">Senha</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
                className="h-11"
                required
              />
            </div>

            <Button type="submit" className="w-full h-11 text-base mt-2" disabled={isLoading}>
              {isLoading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground mt-8">
            Clínica Renata Lyra · Sistema de Gestão
          </p>
        </motion.div>
      </div>
    </div>
  );
}
