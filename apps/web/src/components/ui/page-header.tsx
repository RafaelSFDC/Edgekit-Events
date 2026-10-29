import * as React from "react";
import { cn } from "@/lib/utils";

export interface PageHeaderProps extends Omit<React.ComponentProps<"header">, "title"> {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}

/**
 * Componente padronizado para o cabeçalho de todas as páginas da aplicação.
 * Exibe título e subtítulo alinhados à esquerda e consome automaticamente
 * botões e ações passados como `children` ou prop `actions`, posicionando-os no lado direito.
 * Baseado na implementação de Diorama Drive.
 */
export function PageHeader({
  title,
  subtitle,
  description,
  actions,
  children,
  className,
  ...props
}: PageHeaderProps) {
  const resolvedSubtitle = subtitle ?? description;

  return (
    <header
      className={cn(
        "flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4",
        className,
      )}
      {...props}
    >
      {(title || resolvedSubtitle) && (
        <div className="space-y-1">
          {title &&
            (typeof title === "string" ? (
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {title}
              </h1>
            ) : (
              title
            ))}
          {resolvedSubtitle &&
            (typeof resolvedSubtitle === "string" ? (
              <p className="text-base text-muted-foreground mt-1 leading-relaxed">
                {resolvedSubtitle}
              </p>
            ) : (
              resolvedSubtitle
            ))}
        </div>
      )}

      {(actions || children) && (
        <div className="flex items-center gap-2 shrink-0">
          {actions}
          {children}
        </div>
      )}
    </header>
  );
}
PageHeader.displayName = "PageHeader";

export function PageHeaderTitle({
  className,
  children,
  ...props
}: React.ComponentProps<"h1">) {
  return (
    <h1
      className={cn("text-2xl font-bold tracking-tight text-foreground", className)}
      {...props}
    >
      {children}
    </h1>
  );
}

export function PageHeaderDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      className={cn("text-base text-muted-foreground mt-1 leading-relaxed", className)}
      {...props}
    />
  );
}

export function PageHeaderActions({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex items-center gap-2 shrink-0", className)}
      {...props}
    />
  );
}
