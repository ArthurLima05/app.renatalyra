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
      <Card className="h-full group metric-hover transition-all duration-200">
        <CardContent className="p-4 sm:p-5 h-full flex flex-col justify-between gap-3">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs sm:text-sm text-muted-foreground leading-snug">{title}</p>
            <div className="bg-primary/10 group-hover:bg-primary/16 p-2 rounded-lg shrink-0 transition-colors">
              <Icon className="h-4 w-4 text-primary" />
            </div>
          </div>
          <div>
            <span className="text-2xl sm:text-3xl font-bold text-foreground font-body tabular-nums">
              {value}
            </span>
            {trend && <p className="text-xs text-muted-foreground mt-1">{trend}</p>}
          </div>
          <div className="h-px bg-primary/15 rounded-full" />
        </CardContent>
      </Card>
    </motion.div>
  );
};
