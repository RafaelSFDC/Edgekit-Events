import React, { useState } from 'react';
import {
  Radio,
  Globe,
  Sun,
  Moon,
  LogOut,
  RefreshCw,
  User,
  ChevronDown,
} from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { useTheme } from '../../theme/context';
import { useAuth } from '../../context/auth-context';
import { useSidebar, SidebarTrigger } from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Link, useRouterState } from '@tanstack/react-router';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

interface TopHeaderProps {
  wsStatus: 'connected' | 'connecting' | 'disconnected';
  onReconnectWs: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({ wsStatus, onReconnectWs }) => {
  const { locale, setLocale, t } = useI18n();
  const { resolvedTheme, toggleTheme } = useTheme();
  const { isAuthenticated, openModal, logout } = useAuth();
  const { state } = useSidebar();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Rota ativa para os breadcrumbs integrados no header
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;

  const getBreadcrumbs = () => {
    switch (pathname) {
      case '/console':
        return t.breadcrumbs.console;
      case '/simulator':
        return t.breadcrumbs.simulator;
      case '/channels':
        return t.breadcrumbs.channels;
      case '/snippets':
        return t.breadcrumbs.snippets;
      case '/':
      default:
        return t.breadcrumbs.overview;
    }
  };

  const currentPage = getBreadcrumbs();

  return (
    <header className="sticky top-0 z-40 flex h-12 w-full border-b border-border bg-card/90 backdrop-blur-md select-none">
      {/* 1. Célula Superior Esquerda (Alinhada com a largura da Sidebar) */}
      <div
        className={cn(
          'flex h-full items-center border-r border-border bg-card transition-[width] duration-200 ease-in-out shrink-0',
          state === 'collapsed'
            ? 'w-[var(--sidebar-width-icon)] justify-center px-0'
            : 'w-full lg:w-[var(--sidebar-width)] justify-between px-3'
        )}
      >
        <Link to="/" className="flex items-center gap-2 overflow-hidden outline-hidden">
          {/* Cloudflare-like Orange/Flame Icon */}
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-500 shadow-xs">
            <Radio className="size-4 animate-pulse" />
          </div>

          {state !== 'collapsed' && (
            <div className="flex items-center gap-1.5 overflow-hidden whitespace-nowrap">
              <span className="font-bold tracking-tight text-foreground text-sm">Edgekit</span>
              <span className="font-semibold text-amber-500 text-sm">Events</span>
              <span className="ml-1 rounded px-1.5 py-0.2 text-[10px] font-mono font-medium bg-muted text-muted-foreground border border-border">
                default
              </span>
            </div>
          )}
        </Link>

        {/* Mobile toggle button */}
        <div className="lg:hidden">
          <SidebarTrigger />
        </div>
      </div>

      {/* 2. Barra Superior Direita (Cyan Box da Cloudflare com Breadcrumbs integrados) */}
      <div className="flex flex-1 items-center justify-between px-3 sm:px-4 gap-3 overflow-hidden">
        {/* Esquerda: Breadcrumbs na barra superior + Trigger desktop */}
        <div className="flex items-center gap-2 overflow-hidden">
          <SidebarTrigger className="hidden lg:flex shrink-0" />
          <Breadcrumb>
            <BreadcrumbList className="text-xs whitespace-nowrap">
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/" className="text-muted-foreground hover:text-foreground">
                    {t.breadcrumbs.home}
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>

              {pathname !== '/' && (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage className="font-semibold text-foreground">
                      {currentPage}
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </>
              )}
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        {/* Direita: Status do WebSocket + Avatar do Usuário */}
        <div className="ml-auto flex items-center gap-2 sm:gap-3 shrink-0">
          <Tooltip>
            <TooltipTrigger
              render={
                <Badge
                  variant="outline"
                  onClick={wsStatus === 'disconnected' ? onReconnectWs : undefined}
                  className={cn(
                    'flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium transition-colors cursor-default',
                    wsStatus === 'connected' &&
                      'border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10',
                    wsStatus === 'connecting' &&
                      'border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10',
                    wsStatus === 'disconnected' &&
                      'border-destructive/30 text-destructive bg-destructive/10 cursor-pointer hover:bg-destructive/20'
                  )}
                >
                  <span
                    className={cn(
                      'size-1.5 rounded-full',
                      wsStatus === 'connected' && 'bg-emerald-500 dark:bg-emerald-400 animate-ping',
                      wsStatus === 'connecting' && 'bg-amber-500 dark:bg-amber-400 animate-pulse',
                      wsStatus === 'disconnected' && 'bg-destructive'
                    )}
                  />
                  <span>
                    {wsStatus === 'connected'
                      ? (locale === 'pt-BR' ? 'Ao vivo' : 'Live')
                      : wsStatus === 'connecting'
                      ? (locale === 'pt-BR' ? 'Conectando...' : 'Connecting...')
                      : (locale === 'pt-BR' ? 'Desconectado' : 'Disconnected')}
                  </span>
                  {wsStatus === 'disconnected' && <RefreshCw className="size-2.5 ml-0.5 animate-spin" />}
                </Badge>
              }
            />
            {wsStatus === 'disconnected' && (
              <TooltipContent>{locale === 'pt-BR' ? 'Reconectar WebSocket' : 'Reconnect WebSocket'}</TooltipContent>
            )}
          </Tooltip>

          {/* Avatar e Menu do Usuário */}
          <div className="relative">
            <button
              onClick={() => setIsProfileOpen((prev) => !prev)}
              className={cn(
                'flex items-center gap-1.5 rounded-full p-1 transition-colors hover:bg-muted outline-hidden cursor-pointer',
                isProfileOpen && 'bg-muted'
              )}
            >
              <div className="size-7 rounded-full bg-muted border border-border flex items-center justify-center text-foreground font-semibold text-xs shadow-2xs">
                <User className="size-3.5 text-muted-foreground" />
              </div>
              <ChevronDown className="size-3 text-muted-foreground" />
            </button>

            {/* Dropdown Menu estilo Cloudflare */}
            {isProfileOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsProfileOpen(false)}
                />
                <div className="absolute right-0 mt-1.5 w-56 rounded-lg border border-border bg-card p-1.5 text-card-foreground shadow-lg z-50 text-xs">
                  {/* Cabeçalho da conta */}
                  <div className="px-2.5 py-2 border-b border-border/80">
                    <p className="font-semibold text-foreground truncate">app-default</p>
                    <p className="text-[11px] text-muted-foreground truncate font-mono">
                      key-default
                    </p>
                  </div>

                  {/* Opções: Idioma e Tema */}
                  <div className="py-1">
                    {/* 1. Trocar Idioma */}
                    <button
                      onClick={() => setLocale(locale === 'pt-BR' ? 'en' : 'pt-BR')}
                      className="flex w-full items-center justify-between rounded px-2.5 py-2 text-left hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Globe className="size-3.5" />
                        <span>{locale === 'pt-BR' ? 'Idioma' : 'Language'}</span>
                      </div>
                      <span className="font-semibold text-[10px] uppercase bg-muted px-1.5 py-0.5 rounded border border-border/70 text-foreground">
                        {locale === 'pt-BR' ? 'PT-BR' : 'EN'}
                      </span>
                    </button>

                    {/* 2. Trocar Tema */}
                    <button
                      onClick={toggleTheme}
                      className="flex w-full items-center justify-between rounded px-2.5 py-2 text-left hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        {resolvedTheme === 'dark' ? (
                          <Moon className="size-3.5 text-primary" />
                        ) : (
                          <Sun className="size-3.5 text-amber-500" />
                        )}
                        <span>{locale === 'pt-BR' ? 'Aparência' : 'Appearance'}</span>
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        {resolvedTheme === 'dark'
                          ? (locale === 'pt-BR' ? 'Escuro' : 'Dark')
                          : (locale === 'pt-BR' ? 'Claro' : 'Light')}
                      </span>
                    </button>
                  </div>

                  {/* 3. Botão de Sair */}
                  <div className="border-t border-border/80 pt-1">
                    <button
                      onClick={() => {
                        setIsProfileOpen(false);
                        if (isAuthenticated) {
                          logout();
                        } else {
                          openModal();
                        }
                      }}
                      className="flex w-full items-center gap-2 rounded px-2.5 py-2 text-left text-destructive hover:bg-destructive/10 transition-colors font-medium cursor-pointer"
                    >
                      <LogOut className="size-3.5" />
                      <span>
                        {isAuthenticated
                          ? (locale === 'pt-BR' ? 'Finalizar sessão' : 'Sign out')
                          : (locale === 'pt-BR' ? 'Conectar' : 'Connect')}
                      </span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
