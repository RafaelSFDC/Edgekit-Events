import React from 'react';
import { Toaster as Sonner, type ToasterProps } from 'sonner';
import { CheckCircle2, AlertTriangle, AlertOctagon, Info, Loader2 } from 'lucide-react';
import { useTheme } from '../../theme/context';

export const Toaster: React.FC<ToasterProps> = ({ theme, ...props }) => {
  const { resolvedTheme } = useTheme();

  return (
    <Sonner
      theme={theme ?? resolvedTheme}
      className="toaster group"
      icons={{
        success: <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />,
        info: <Info className="w-4 h-4 text-sky-500 dark:text-sky-400" />,
        warning: <AlertTriangle className="w-4 h-4 text-amber-500 dark:text-amber-400" />,
        error: <AlertOctagon className="w-4 h-4 text-rose-500 dark:text-rose-400" />,
        loading: <Loader2 className="w-4 h-4 animate-spin text-sky-500 dark:text-sky-400" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            'bg-card border-border text-foreground text-xs shadow-2xl rounded-xl border flex items-center space-x-2',
          description: 'text-muted-foreground',
          actionButton: 'bg-primary text-primary-foreground text-xs font-semibold rounded-lg',
          cancelButton: 'bg-muted text-muted-foreground text-xs rounded-lg',
        },
      }}
      {...props}
    />
  );
};
