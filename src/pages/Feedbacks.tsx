import { motion } from 'framer-motion';
import { useClinic } from '@/contexts/ClinicContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Star, TrendingUp, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function Feedbacks() {
  const { feedbacks, professionals } = useClinic();

  const averageRating = feedbacks.length > 0
    ? (feedbacks.reduce((acc, f) => acc + f.rating, 0) / feedbacks.length).toFixed(1)
    : '0.0';

  const lowRatingCount = feedbacks.filter(f => f.rating <= 2).length;

  // Simular palavras mais citadas
  const topWords = ['atendimento', 'profissional', 'ambiente', 'pontualidade', 'resultados'];

  const getRatingStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
      />
    ));
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <h1 className="text-3xl font-bold text-foreground">Feedbacks</h1>
        <p className="text-muted-foreground">Análise da satisfação dos pacientes</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Nota Média</p>
                  <h3 className="text-3xl font-bold text-foreground">{averageRating}</h3>
                  <div className="flex gap-1 mt-2">
                    {getRatingStars(Math.round(parseFloat(averageRating)))}
                  </div>
                </div>
                <div className="bg-primary/10 p-3 rounded-lg">
                  <Star className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total de Feedbacks</p>
                  <h3 className="text-3xl font-bold text-foreground">{feedbacks.length}</h3>
                  <p className="text-xs text-muted-foreground mt-2">Este mês</p>
                </div>
                <div className="bg-primary/10 p-3 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Avaliações Baixas</p>
                  <h3 className="text-3xl font-bold text-destructive">{lowRatingCount}</h3>
                  <p className="text-xs text-muted-foreground mt-2">Notas ≤ 2</p>
                </div>
                <div className="bg-destructive/10 p-3 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-destructive" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Top 5 Palavras Mais Citadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {topWords.map((word, index) => (
                <Badge key={index} variant="secondary" className="text-sm px-4 py-2">
                  {word}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Feedbacks Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {feedbacks.slice().reverse().map((feedback, index) => {
                const professional = professionals.find(p => p.id === feedback.professionalId);
                return (
                  <motion.div
                    key={feedback.id}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.5 + index * 0.05 }}
                    className="p-4 border rounded-lg"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold">{feedback.patientName}</p>
                        <p className="text-sm text-muted-foreground">
                          {feedback.date.toLocaleDateString('pt-BR')} • {feedback.origin}
                        </p>
                        {professional && (
                          <p className="text-sm text-muted-foreground">
                            Profissional: {professional.name}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        {getRatingStars(feedback.rating)}
                      </div>
                    </div>
                    <p className="text-sm">{feedback.comment}</p>
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
