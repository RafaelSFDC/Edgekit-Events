import React, { type ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from '../lib/query-client';
import { I18nProvider } from '../i18n/context';
import { ThemeProvider } from '../theme/context';
import { Toaster } from './ui/sonner';

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <I18nProvider>
          {children}
          <Toaster position="bottom-right" richColors />
          {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
        </I18nProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};
