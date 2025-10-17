import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ClinicProvider } from "./contexts/ClinicContext";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import Agendamentos from "./pages/Agendamentos";
import Pacientes from "./pages/Pacientes";
import ProntuarioPaciente from "./pages/ProntuarioPaciente";
import { FinanceiroProtected } from "./components/FinanceiroProtected";
import Feedbacks from "./pages/Feedbacks";
import Notificacoes from "./pages/Notificacoes";
import FeedbackForm from "./pages/FeedbackForm";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/feedback" element={<FeedbackForm />} />
          <Route element={<ProtectedRoute><ClinicProvider><Layout /></ClinicProvider></ProtectedRoute>}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/agendamentos" element={<Agendamentos />} />
            <Route path="/pacientes" element={<Pacientes />} />
            <Route path="/pacientes/:id" element={<ProntuarioPaciente />} />
            <Route path="/prontuario/:id" element={<ProntuarioPaciente />} />
            <Route path="/financeiro" element={<FinanceiroProtected />} />
            <Route path="/feedbacks" element={<Feedbacks />} />
            <Route path="/notificacoes" element={<Notificacoes />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
