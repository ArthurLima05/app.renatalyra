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
import logoClinicaDark from '@/assets/DarkLogo.svg';

type Status = 'loading' | 'set-password' | 'error' | 'success';

export default function AceitarConvite() {
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
      const fullUrl = window.location.href;
      const hash = window.location.hash.substring(1);
      const queryParams = new URLSearchParams(window.location.search);

      console.log('[AceitarConvite] URL completa:', fullUrl);
      console.log('[AceitarConvite] hash:', hash);
      console.log('[AceitarConvite] search:', window.location.search);
      console.log('[AceitarConvite] params:', Object.fromEntries(queryParams.entries()));

      // 1. Verifica se há erro no hash da URL (ex: OTP expirado)
      const hashParams = new URLSearchParams(hash);
      const urlError = hashParams.get('error_code') || hashParams.get('error');
      if (urlError) {
        const desc = hashParams.get('error_description') ?? 'Link inválido ou expirado.';
        const msg = decodeURIComponent(desc.replace(/\+/g, ' '));
        console.log('[AceitarConvite] Erro no hash:', urlError, msg);
        setErrorMsg(msg);
        setStatus('error');
        return;
      }

      // 2. Supabase detecta automaticamente a sessão do hash (implicit flow)
      await new Promise(r => setTimeout(r, 400));
      const { data: { session } } = await supabase.auth.getSession();
      console.log('[AceitarConvite] Sessão existente:', !!session);
      if (session) {
        setStatus('set-password');
        return;
      }

      // 3. Tenta token_hash (fluxo PKCE de convite — Supabase recente)
      const tokenHash = queryParams.get('token_hash');
      const otpType = queryParams.get('type');
      console.log('[AceitarConvite] token_hash:', tokenHash, 'type:', otpType);
      if (tokenHash && otpType) {
        const { error, data } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: otpType as any,
        });
        console.log('[AceitarConvite] verifyOtp result:', { error, session: !!data?.session });
        if (error) {
          setErrorMsg(error.message);
          setStatus('error');
        } else {
          setStatus('set-password');
        }
        return;
      }

      // 4. Tenta PKCE — troca o code por sessão
      const code = queryParams.get('code');
      console.log('[AceitarConvite] code:', code);
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        console.log('[AceitarConvite] exchangeCodeForSession error:', error);
        if (error) {
          setErrorMsg(error.message);
          setStatus('error');
        } else {
          setStatus('set-password');
        }
        return;
      }

      console.log('[AceitarConvite] Nenhum parâmetro reconhecido — link inválido');
      setErrorMsg('Link de convite não reconhecido. Solicite um novo convite.');
      setStatus('error');
    };

    init();
  }, []);

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (password.length < 8) { setFormError('A senha deve ter pelo menos 8 caracteres.'); return; }
    if (password !== confirm) { setFormError('As senhas não coincidem.'); return; }

    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setFormError(error.message);
      setSaving(false);
    } else {
      setStatus('success');
      setTimeout(() => navigate('/'), 2500);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm space-y-6"
      >
        {/* Logo */}
        <div className="flex justify-center">
          <img src={logoClinica} alt="Clínica Renata Lyra" className="h-36 w-auto dark:hidden" />
          <img src={logoClinicaDark} alt="Clínica Renata Lyra" className="h-36 w-auto hidden dark:block" />
        </div>

        {/* Loading */}
        {status === 'loading' && (
          <Card>
            <CardContent className="pt-8 pb-8 flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Verificando convite...</p>
            </CardContent>
          </Card>
        )}

        {/* Erro */}
        {status === 'error' && (
          <Card>
            <CardContent className="pt-8 pb-8 flex flex-col items-center gap-4 text-center">
              <XCircle className="h-10 w-10 text-destructive" />
              <div>
                <p className="font-semibold text-base">Link inválido</p>
                <p className="text-sm text-muted-foreground mt-1">{errorMsg}</p>
              </div>
              {errorMsg && (
                <p className="text-xs font-mono bg-muted rounded px-2 py-1 break-all">{errorMsg}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Links de convite expiram em 24 horas. Peça para o administrador enviar um novo convite.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Definir senha */}
        {status === 'set-password' && (
          <Card>
            <CardHeader>
              <CardTitle>Definir senha</CardTitle>
              <CardDescription>Crie uma senha para acessar o sistema.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSetPassword} className="space-y-4">
                <div className="space-y-1">
                  <Label>Nova senha</Label>
                  <div className="relative">
                    <Input
                      type={showPw ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Mínimo 8 caracteres"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Confirmar senha</Label>
                  <Input
                    type={showPw ? 'text' : 'password'}
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="Repita a senha"
                    required
                  />
                </div>
                {formError && <p className="text-sm text-destructive">{formError}</p>}
                <Button type="submit" className="w-full" disabled={saving}>
                  {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Salvando...</> : 'Confirmar senha'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Sucesso */}
        {status === 'success' && (
          <Card>
            <CardContent className="pt-8 pb-8 flex flex-col items-center gap-4 text-center">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
              <div>
                <p className="font-semibold text-base">Senha definida!</p>
                <p className="text-sm text-muted-foreground mt-1">Redirecionando para o sistema...</p>
              </div>
            </CardContent>
          </Card>
        )}
      </motion.div>
    </div>
  );
}
