import { motion } from 'framer-motion';
import simboloCinza from '@/assets/SimboloCinza.svg';
import simboloBranco from '@/assets/SimboloBranco.svg';
import { Button } from './ui/button';

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex flex-col items-center justify-center py-16 px-4 text-center"
    >
      <div className="relative mb-6 select-none pointer-events-none">
        <img src={simboloCinza} aria-hidden className="h-20 w-auto opacity-[0.18] dark:hidden" />
        <img src={simboloBranco} aria-hidden className="h-20 w-auto opacity-[0.08] hidden dark:block" />
      </div>

      <h3 className="text-base font-cocon text-foreground/60 mb-1 tracking-[0.03em]">
        {title}
      </h3>

      {description && (
        <p className="text-sm text-muted-foreground max-w-xs">{description}</p>
      )}

      {action && (
        <Button onClick={action.onClick} variant="outline" size="sm" className="mt-5">
          {action.label}
        </Button>
      )}
    </motion.div>
  );
}
