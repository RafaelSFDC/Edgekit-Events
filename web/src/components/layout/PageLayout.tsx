import React from 'react';
import { cn } from '@/lib/utils';

export interface PageLayoutProps extends React.ComponentProps<'div'> {
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  children: React.ReactNode;
}

export const PageLayout: React.FC<PageLayoutProps> = ({
  maxWidth = 'xl',
  className,
  children,
  ...props
}) => {
  const maxWidthClasses = {
    sm: 'max-w-3xl',
    md: 'max-w-4xl',
    lg: 'max-w-5xl',
    xl: 'max-w-7xl',
    full: 'max-w-full',
  }[maxWidth];

  return (
    <div
      className={cn(
        'w-full mx-auto flex flex-col gap-6 animate-in fade-in-50 duration-200',
        maxWidthClasses,
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
