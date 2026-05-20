import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import logoClinica from '@/assets/LightLogo.svg';
import fotoDra from '@/assets/_MF_9787.jpg';
import { motion } from 'framer-motion';

const EASE = [0.25, 0.46, 0.45, 0.94] as const;

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
    <div className="login-light min-h-screen flex">

      {/* ── Lado esquerdo — foto ─────────────────────────────────────────────── */}
      <div className="hidden lg:block lg:w-[55%] relative overflow-hidden">
        {/* Foto */}
        <img
          src={fotoDra}
          alt="Dra. Renata Lyra"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />

        {/* Overlay gradiente — escurece nas bordas, preserva o centro */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/10 via-transparent to-black/60" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/10" />

        {/* Marca d'água do símbolo — canto inferior esquerdo */}
        <div className="absolute bottom-10 left-10 right-10">
          <div className="flex items-end justify-between">
            {/* Tagline */}
            <div className="space-y-1">
              <p className="text-white/50 text-xs tracking-[0.15em] uppercase font-cocon">
                Sistema de Gestão
              </p>
              <p className="text-white/80 text-sm tracking-[0.08em] font-cocon">
                Clínica Odontológica
              </p>
            </div>
            {/* Linha dourada decorativa */}
            <div className="h-px w-20 bg-gradient-to-l from-white/50 to-transparent" />
          </div>
        </div>
      </div>

      {/* ── Lado direito — formulário ────────────────────────────────────────── */}
      <div
        className="flex-1 flex flex-col relative overflow-hidden"
        style={{ background: 'hsl(40 25% 96%)' }}
      >
        {/* Linha dourada vertical — separação */}
        <div className="hidden lg:block absolute left-0 top-[12%] bottom-[12%] w-px bg-gradient-to-b from-transparent via-primary/35 to-transparent" />

        {/* Padrão sutil de fundo — pontilhado dourado */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(hsl(40 45% 50%) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />

        {/* Rodapé fixo no fundo */}
        <p
          className="absolute bottom-8 left-0 right-0 text-center text-[10px] font-cocon tracking-[0.12em] uppercase z-10"
          style={{ color: 'hsl(40 8% 60%)' }}
        >
          Renata Lyra · Clínica Odontológica
        </p>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: EASE }}
          className="relative z-10 flex flex-col w-full max-w-[360px] mx-auto px-4 pt-6 pb-16"
        >
          {/* Logo — sempre light, independente do tema */}
          <div className="mb-5">
            <img
              src={logoClinica}
              alt="Clínica Renata Lyra"
              className="h-28 w-auto"
            />
          </div>

          {/* Listra dourada */}
          <div className="mb-6">
            <div
              className="h-[1.5px] w-32 rounded-full"
              style={{ background: 'linear-gradient(90deg, transparent, hsl(40 45% 60%), hsl(40 55% 72%), hsl(40 45% 60%), transparent)' }}
            />
          </div>

          {/* Título */}
          <div className="mb-6">
            <h1
              className="text-5xl leading-tight mb-2"
              style={{ color: 'hsl(40 5% 16%)', letterSpacing: '0.02em' }}
            >
              Bem-vinda
            </h1>
            <p
              className="font-cocon tracking-[0.04em] text-sm"
              style={{ color: 'hsl(40 8% 50%)' }}
            >
              Acesse o sistema para continuar
            </p>
          </div>

            {/* Formulário — estilo editorial com linha inferior */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-1">
                <Label
                  htmlFor="email"
                  className="text-[11px] tracking-[0.1em] uppercase"
                  style={{ color: 'hsl(40 8% 50%)' }}
                >
                  E-mail
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="seu@email.com"
                  className="border-0 border-b rounded-none bg-transparent h-11 px-0 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/35"
                  style={{ borderBottomColor: 'hsl(40 20% 76%)', borderBottomWidth: '1px', color: 'hsl(40 5% 16%)' }}
                  required
                />
              </div>

              <div className="space-y-1">
                <Label
                  htmlFor="password"
                  className="text-[11px] tracking-[0.1em] uppercase"
                  style={{ color: 'hsl(40 8% 50%)' }}
                >
                  Senha
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  className="border-0 border-b rounded-none bg-transparent h-11 px-0 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/35"
                  style={{ borderBottomColor: 'hsl(40 20% 76%)', borderBottomWidth: '1px', color: 'hsl(40 5% 16%)' }}
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-sm tracking-[0.06em] uppercase mt-4"
                disabled={isLoading}
              >
                {isLoading ? 'Entrando…' : 'Entrar'}
              </Button>
            </form>
        </motion.div>
      </div>
    </div>
  );
}
