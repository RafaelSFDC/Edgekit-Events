import React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export interface PageHeaderProps {
  category?: string;
  title: React.ReactNode;
  badge?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  bordered?: boolean;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  category,
  title,
  badge,
  description,
  actions,
  children,
  bordered = true,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col gap-3',
        bordered && 'border-b border-border/60 pb-5',
        className
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Categoria/Supertitle (Ex: "Realtime" ou "Security" na Cloudflare) */}
          {category && (
            <p className="text-xs font-semibold tracking-wider uppercase text-muted-foreground/80 mb-1">
              {category}
            </p>
          )}

          {/* Linha do Título com Badge */}
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {title}
            </h1>

            {badge && (
              typeof badge === 'string' ? (
                <Badge variant="outline" className="text-xs font-mono">
                  {badge}
                </Badge>
              ) : (
                badge
              )
            )}
          </div>

          {/* Descrição contextual */}
          {description && (
            <p className="mt-1.5 text-sm text-muted-foreground max-w-2xl">
              {description}
            </p>
          )}
        </div>

        {/* Ações à direita */}
        {actions && (
          <div className="flex items-center gap-2 shrink-0 sm:self-center">
            {actions}
          </div>
        )}
      </div>

      {/* Linha secundária para links rápidos, documentação ou tabs */}
      {children && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {children}
        </div>
      )}
    </div>
  );
};
