import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const fieldVariants = cva(
  'group/field flex w-full flex-col gap-1.5 data-[invalid=true]:text-destructive',
  {
    variants: {
      orientation: {
        vertical: 'flex-col [&>*]:w-full [&>.sr-only]:w-auto',
        horizontal: 'flex-row items-center justify-between gap-4',
      },
    },
    defaultVariants: {
      orientation: 'vertical',
    },
  }
);

export interface FieldProps
  extends React.ComponentProps<'div'>,
    VariantProps<typeof fieldVariants> {
  'data-invalid'?: boolean;
}

export function Field({
  className,
  orientation = 'vertical',
  'data-invalid': dataInvalid,
  ...props
}: FieldProps) {
  return (
    <div
      role="group"
      data-slot="field"
      data-orientation={orientation}
      data-invalid={dataInvalid ? 'true' : undefined}
      className={cn(fieldVariants({ orientation }), className)}
      {...props}
    />
  );
}

export function FieldGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="field-group"
      className={cn('flex flex-col gap-4', className)}
      {...props}
    />
  );
}

export function FieldSet({ className, ...props }: React.ComponentProps<'fieldset'>) {
  return (
    <fieldset
      data-slot="fieldset"
      className={cn('flex flex-col gap-3 rounded-lg border border-border/70 p-4', className)}
      {...props}
    />
  );
}

export function FieldLegend({ className, ...props }: React.ComponentProps<'legend'>) {
  return (
    <legend
      data-slot="field-legend"
      className={cn('text-sm font-semibold text-foreground px-1.5', className)}
      {...props}
    />
  );
}

export function FieldLabel({ className, ...props }: React.ComponentProps<typeof Label>) {
  return (
    <Label
      data-slot="field-label"
      className={cn('text-sm font-medium leading-none text-foreground select-none', className)}
      {...props}
    />
  );
}

export function FieldDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      data-slot="field-description"
      className={cn('text-xs text-muted-foreground', className)}
      {...props}
    />
  );
}

export function FieldError({ className, children, ...props }: React.ComponentProps<'p'>) {
  if (!children) return null;
  return (
    <p
      data-slot="field-error"
      className={cn('text-xs font-medium text-destructive mt-0.5', className)}
      {...props}
    >
      {children}
    </p>
  );
}
