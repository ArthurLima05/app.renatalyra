import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ClinicProvider } from "./contexts/ClinicContext";
import { Layout } from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Agendamentos from "./pages/Agendamentos";
import Pacientes from "./pages/Pacientes";
import ProntuarioPaciente from "./pages/ProntuarioPaciente";
import Financeiro from "./pages/Financeiro";
import Feedbacks from "./pages/Feedbacks";
import Notificacoes from "./pages/Notificacoes";
import FeedbackForm from "./pages/FeedbackForm";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ClinicProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/feedback" element={<FeedbackForm />} />
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/agendamentos" element={<Agendamentos />} />
              <Route path="/pacientes" element={<Pacientes />} />
              <Route path="/pacientes/:id" element={<ProntuarioPaciente />} />
              <Route path="/financeiro" element={<Financeiro />} />
              <Route path="/feedbacks" element={<Feedbacks />} />
              <Route path="/notificacoes" element={<Notificacoes />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ClinicProvider>
  </QueryClientProvider>
);

export default App;
