import React from 'react';
import { Outlet } from '@tanstack/react-router';
import { SidebarProvider } from '@/components/ui/sidebar';
import { TopHeader } from './TopHeader';
import { AppSidebar } from './AppSidebar';
import { PasskeyModal } from '../PasskeyModal';
import { useDebugStream } from '../../hooks/api/use-debug-stream';

export const DashboardLayout: React.FC = () => {
  const { wsStatus } = useDebugStream();

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen w-full bg-background text-foreground flex flex-col">
        {/* Top Header estilo Cloudflare bipartido com Breadcrumbs integrados */}
        <TopHeader wsStatus={wsStatus} />

        {/* Corpo: Sidebar + Main Content Canvas */}
        <div className="flex flex-1 w-full">
          {/* Sidebar lateral */}
          <AppSidebar />

          {/* Canvas principal (sem sub-header redundante) */}
          <main className="flex-1 min-w-0 flex flex-col bg-background/50">
            {/* Conteúdo da Rota Ativa */}
            <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
              <Outlet />
            </div>
          </main>
        </div>

        {/* Modal Global de Autenticação / Passkey */}
        <PasskeyModal />
      </div>
    </SidebarProvider>
  );
};
