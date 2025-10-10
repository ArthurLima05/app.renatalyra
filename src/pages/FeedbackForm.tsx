import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Star, CheckCircle2 } from 'lucide-react';
import { PatientOrigin } from '@/types';
import logoClinica from '@/assets/logo-clinica.jpg';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function FeedbackForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [patientName, setPatientName] = useState('');
  const [professionals, setProfessionals] = useState<any[]>([]);
  
  const patientId = searchParams.get('patientId');
  const originParam = searchParams.get('origin') as PatientOrigin | null;
  
  const [formData, setFormData] = useState({
    rating: 0,
    comment: '',
    origin: originParam || 'Outro' as PatientOrigin,
    professionalId: '',
  });

  useEffect(() => {
    const loadData = async () => {
      // Carregar nome do paciente
      if (patientId) {
        const { data: patientData } = await supabase
          .from('patients')
          .select('full_name')
          .eq('id', patientId)
          .single();
        
        if (patientData) {
          setPatientName(patientData.full_name);
        }
      }

      // Carregar profissionais
      const { data: profsData } = await supabase
        .from('professionals')
        .select('*');
      
      if (profsData) {
        setProfessionals(profsData);
      }
      
      setLoading(false);
    };

    loadData();
  }, [patientId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!patientId) {
      toast({ title: 'Erro', description: 'Link inválido', variant: 'destructive' });
      return;
    }

    const { error } = await supabase.from('feedbacks').insert({
      patient_id: patientId,
      rating: formData.rating,
      comment: formData.comment,
      origin: formData.origin,
      date: new Date().toISOString(),
      professional_id: formData.professionalId || null,
    });

    if (error) {
      toast({ title: 'Erro ao enviar feedback', description: error.message, variant: 'destructive' });
      return;
    }

    // Criar notificação se avaliação baixa
    if (formData.rating <= 2) {
      await supabase.from('notifications').insert({
        type: 'feedback',
        title: 'Avaliação baixa recebida',
        message: `${patientName} deu nota ${formData.rating}`,
      });
    }

    setSubmitted(true);
    setTimeout(() => {
      navigate('/');
    }, 3000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!patientId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Link Inválido</h1>
          <p className="text-muted-foreground">
            Este link de feedback não é válido.
          </p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <CheckCircle2 className="h-20 w-20 text-green-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold mb-2">Obrigado pelo seu feedback!</h1>
          <p className="text-muted-foreground">
            Sua opinião é muito importante para nós.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="max-w-2xl mx-auto"
      >
        <div className="text-center mb-8 mt-8">
          <img src={logoClinica} alt="Clínica Renata Lyra" className="h-20 mx-auto mb-4" />
          <h1 className="text-3xl font-bold">Olá, {patientName}!</h1>
          <p className="text-muted-foreground mt-2">
            Sua opinião é muito importante para nós
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Avalie sua Experiência</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="professionalId">Profissional que te atendeu (opcional)</Label>
                <Select
                  value={formData.professionalId}
                  onValueChange={(value) => setFormData({ ...formData, professionalId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o profissional" />
                  </SelectTrigger>
                  <SelectContent>
                    {professionals.map((prof) => (
                      <SelectItem key={prof.id} value={prof.id}>
                        {prof.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="mb-3 block">Avalie nosso atendimento</Label>
                <div className="flex gap-2 justify-center">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <motion.button
                      key={rating}
                      type="button"
                      whileHover={{ scale: 1.2 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setFormData({ ...formData, rating })}
                    >
                      <Star
                        className={`h-10 w-10 cursor-pointer transition-colors ${
                          rating <= formData.rating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    </motion.button>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="comment">Comentário</Label>
                <Textarea
                  id="comment"
                  value={formData.comment}
                  onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                  required
                  placeholder="Conte-nos sobre sua experiência"
                  rows={5}
                />
              </div>

              <div>
                <Label htmlFor="origin">Como nos conheceu?</Label>
                <Select
                  value={formData.origin}
                  onValueChange={(value) => setFormData({ ...formData, origin: value as PatientOrigin })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Google Ads">Google Ads</SelectItem>
                    <SelectItem value="Instagram">Instagram</SelectItem>
                    <SelectItem value="Indicação">Indicação</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={formData.rating === 0}
              >
                Enviar Feedback
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
