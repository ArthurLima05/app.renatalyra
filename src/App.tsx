import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ClinicProvider } from "./contexts/ClinicContext";
import { ProntuarioProvider } from "./contexts/ProntuarioContext";
import { AdminProvider } from "./contexts/AdminContext";
import { PermissionsProvider, usePermissionsCtx } from "./contexts/PermissionsContext";

import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import Agendamentos from "./pages/Agendamentos";
import Pacientes from "./pages/Pacientes";
import ProntuarioPaciente from "./pages/ProntuarioPaciente";
import Financeiro from "./pages/Financeiro";
import Notificacoes from "./pages/Notificacoes";
import Profissionais from "./pages/Profissionais";
import Configuracoes from "./pages/Configuracoes";
import Funil from "./pages/Funil";
import Login from "./pages/Login";
import AnamnesePaciente from "./pages/AnamnesePaciente";
import AceitarConvite from "./pages/AceitarConvite";
import RedefinirSenha from "./pages/RedefinirSenha";
import NotFound from "./pages/NotFound";
import ImportacaoAgendamentos from "./pages/ImportacaoAgendamentos";
import PalpiteCopa from "./pages/PalpiteCopa";
import PalpitesCopa from "./pages/PalpitesCopa";

const queryClient = new QueryClient();

// Bloqueia a rota apenas se o usuário não tiver NENHUMA permissão no módulo.
// Quando há permissões parciais (ex: canCreate sem canView), a página é exibida
// e controla internamente o que mostrar com base nas permissões específicas.
function ModuleRoute({ module, children }: { module: string; children: React.ReactNode }) {
  const { hasAnyPermission, loading } = usePermissionsCtx();
  if (loading) return null;
  if (!hasAnyPermission(module)) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground/50"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </div>
        <div>
          <p className="font-semibold text-foreground">Acesso restrito</p>
          <p className="text-sm text-muted-foreground mt-1">Você não tem permissão para acessar este módulo.</p>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}

const ORDERED_MODULES = [
  { module: 'agenda',         path: '/agendamentos' },
  { module: 'dashboard',      path: '/dashboard' },
  { module: 'pacientes',      path: '/pacientes' },
  { module: 'financeiro',     path: '/financeiro' },
  { module: 'profissionais',  path: '/profissionais' },
  { module: 'notificacoes',   path: '/notificacoes' },
  { module: 'funil',          path: '/funil' },
  { module: 'configuracoes',  path: '/configuracoes' },
];

function InitialRoute() {
  const { hasAnyPermission, loading } = usePermissionsCtx();
  if (loading) return null;
  for (const { module, path } of ORDERED_MODULES) {
    if (hasAnyPermission(module)) return <Navigate to={path} replace />;
  }
  return <Navigate to="/dashboard" replace />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/aceitar-convite" element={<AceitarConvite />} />
          <Route path="/redefinir-senha" element={<RedefinirSenha />} />
          <Route path="/anamnese/:token" element={<AnamnesePaciente />} />
          <Route path="/palpite-copa" element={<PalpiteCopa />} />
          <Route element={
            <ProtectedRoute>
              <ClinicProvider>
                <ProntuarioProvider>
                  <AdminProvider>
                    <PermissionsProvider>
                      <Layout />
                    </PermissionsProvider>
                  </AdminProvider>
                </ProntuarioProvider>
              </ClinicProvider>
            </ProtectedRoute>
          }>
            <Route path="/" element={<InitialRoute />} />
            <Route path="/agendamentos" element={
              <ModuleRoute module="agenda"><Agendamentos /></ModuleRoute>
            } />
            <Route path="/dashboard" element={
              <ModuleRoute module="dashboard"><Dashboard /></ModuleRoute>
            } />
            <Route path="/pacientes" element={
              <ModuleRoute module="pacientes"><Pacientes /></ModuleRoute>
            } />
            <Route path="/pacientes/:id" element={
              <ModuleRoute module="pacientes"><ProntuarioPaciente /></ModuleRoute>
            } />
            <Route path="/prontuario/:id" element={
              <ModuleRoute module="pacientes"><ProntuarioPaciente /></ModuleRoute>
            } />
            <Route path="/financeiro" element={
              <ModuleRoute module="financeiro"><Financeiro /></ModuleRoute>
            } />
            <Route path="/notificacoes" element={
              <ModuleRoute module="notificacoes"><Notificacoes /></ModuleRoute>
            } />
            <Route path="/profissionais" element={
              <ModuleRoute module="profissionais"><Profissionais /></ModuleRoute>
            } />
            <Route path="/configuracoes" element={
              <ModuleRoute module="configuracoes"><Configuracoes /></ModuleRoute>
            } />
            <Route path="/funil" element={
              <ModuleRoute module="funil"><Funil /></ModuleRoute>
            } />
            <Route path="/importacao-agendamentos" element={<ImportacaoAgendamentos />} />
            <Route path="/palpites-copa" element={<PalpitesCopa />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
