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
    >
      <Card className="hover:shadow-lg transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground mb-1">{title}</p>
              <h3 className="text-3xl font-bold text-foreground mb-2">{value}</h3>
              {trend && (
                <p className="text-sm text-muted-foreground">{trend}</p>
              )}
            </div>
            <div className="bg-primary/10 p-3 rounded-lg">
              <Icon className="h-6 w-6 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
