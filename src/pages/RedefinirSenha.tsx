import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CheckCircle2, XCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import logoClinica from '@/assets/LightLogo.svg';

const EASE = [0.25, 0.46, 0.45, 0.94] as const;

type Status = 'loading' | 'set-password' | 'error' | 'success';

export default function RedefinirSenha() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    const init = async () => {
      const hash = window.location.hash.substring(1);
      const hashParams = new URLSearchParams(hash);
      const queryParams = new URLSearchParams(window.location.search);

      // Verifica erro no hash (link expirado, OTP inválido, etc.)
      const urlError = hashParams.get('error_code') || hashParams.get('error');
      if (urlError) {
        const desc = hashParams.get('error_description') ?? 'Link inválido ou expirado.';
        setErrorMsg(decodeURIComponent(desc.replace(/\+/g, ' ')));
        setStatus('error');
        return;
      }

      // Aguarda o Supabase processar o token do hash (implicit flow)
      await new Promise(r => setTimeout(r, 400));
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setStatus('set-password');
        return;
      }

      // Fluxo PKCE (token_hash na query string)
      const tokenHash = queryParams.get('token_hash');
      const otpType = queryParams.get('type');
      if (tokenHash && otpType === 'recovery') {
        const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' });
        if (error) {
          setErrorMsg('Link inválido ou expirado. Solicite um novo.');
          setStatus('error');
          return;
        }
        setStatus('set-password');
        return;
      }

      setErrorMsg('Link inválido ou expirado. Solicite um novo na tela de login.');
      setStatus('error');
    };

    init();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (password.length < 8) { setFormError('A senha deve ter pelo menos 8 caracteres.'); return; }
    if (password !== confirm) { setFormError('As senhas não coincidem.'); return; }

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      await supabase.auth.signOut();
      setStatus('success');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erro ao redefinir a senha.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: 'hsl(40 25% 96%)' }}
    >
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: EASE }}
        className="w-full max-w-[380px]"
      >
        <div className="mb-6 flex justify-center">
          <img src={logoClinica} alt="Clínica Renata Lyra" className="h-20 w-auto" />
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Redefinir senha</CardTitle>
            <CardDescription>
              {status === 'loading' && 'Verificando link…'}
              {status === 'set-password' && 'Escolha uma nova senha para a sua conta.'}
              {status === 'error' && 'Não foi possível validar o link.'}
              {status === 'success' && 'Senha atualizada com sucesso.'}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {status === 'loading' && (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}

            {status === 'error' && (
              <div className="flex flex-col items-center gap-4 py-4">
                <XCircle className="h-12 w-12 text-destructive" />
                <p className="text-sm text-center text-muted-foreground">{errorMsg}</p>
                <Button variant="outline" className="w-full" onClick={() => navigate('/login')}>
                  Voltar ao login
                </Button>
              </div>
            )}

            {status === 'success' && (
              <div className="flex flex-col items-center gap-4 py-4">
                <CheckCircle2 className="h-12 w-12 text-green-500" />
                <p className="text-sm text-center text-muted-foreground">
                  Sua senha foi atualizada. Faça login com a nova senha.
                </p>
                <Button className="w-full" onClick={() => navigate('/login')}>
                  Ir para o login
                </Button>
              </div>
            )}

            {status === 'set-password' && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="password">Nova senha</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPw ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Mínimo 8 caracteres"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      tabIndex={-1}
                    >
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="confirm">Confirmar nova senha</Label>
                  <Input
                    id="confirm"
                    type={showPw ? 'text' : 'password'}
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="Repita a senha"
                    required
                  />
                </div>

                {formError && (
                  <p className="text-sm text-destructive">{formError}</p>
                )}

                <Button type="submit" className="w-full" disabled={saving}>
                  {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando…</> : 'Salvar nova senha'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
