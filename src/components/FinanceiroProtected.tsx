import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Financeiro from '@/pages/Financeiro';

const FINANCE_PASSWORD = 'renatalyra2025';
const SESSION_KEY = 'finance_access';

export const FinanceiroProtected = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Verifica se já tem acesso na sessão atual
    const hasAccess = sessionStorage.getItem(SESSION_KEY) === 'true';
    setIsAuthenticated(hasAccess);
    setLoading(false);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password === FINANCE_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, 'true');
      setIsAuthenticated(true);
      toast({
        title: "Acesso permitido",
        description: "Bem-vinda, Dra. Renata Lyra!",
      });
    } else {
      toast({
        title: "Acesso negado",
        description: "Senha incorreta. Tente novamente.",
        variant: "destructive",
      });
      setPassword('');
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">Área Restrita</CardTitle>
            <CardDescription>
              Esta seção é protegida. Apenas usuários autorizados podem acessar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Input
                  type="password"
                  placeholder="Digite a senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full">
                Acessar Financeiro
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <Financeiro />;
};
