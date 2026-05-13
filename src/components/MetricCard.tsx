import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from './ui/card';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  delay?: number;
}

export const MetricCard = ({ title, value, icon: Icon, trend, delay = 0 }: MetricCardProps) => {
  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay }}
      className="h-full"
    >
      <Card className="h-full hover:shadow-lg transition-shadow">
        <CardContent className="p-3 sm:p-6 h-full">
          {/* Mobile: linha compacta — ícone | título+valor | (sem coluna) */}
          {/* Desktop: título+valor à esquerda, ícone grande à direita */}
          <div className="flex items-center gap-3 sm:items-start sm:justify-between">
            <div className="bg-primary/10 p-2 rounded-lg shrink-0 sm:hidden">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm text-muted-foreground leading-snug break-words">{title}</p>
              <h3 className="text-lg sm:text-3xl font-bold text-foreground mt-0.5">{value}</h3>
              {trend && <p className="text-xs text-muted-foreground mt-0.5">{trend}</p>}
            </div>
            <div className="hidden sm:flex bg-primary/10 p-3 rounded-lg shrink-0">
              <Icon className="h-6 w-6 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
