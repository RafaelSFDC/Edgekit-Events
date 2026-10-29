import React from 'react';
import { Radio, KeyRound, Globe, ExternalLink, RefreshCw, ShieldCheck, Sun, Moon } from 'lucide-react';
import { useI18n } from '../i18n/context';
import { useTheme } from '../theme/context';
import { useAuth } from '../context/auth-context';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface NavbarProps {
  wsStatus: 'connected' | 'connecting' | 'disconnected';
  onReconnectWs: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  wsStatus,
  onReconnectWs,
}) => {
  const { locale, setLocale, t } = useI18n();
  const { resolvedTheme, toggleTheme } = useTheme();
  const { isAuthenticated, openModal } = useAuth();

  return (
    <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-40 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xs">
            <Radio className="size-5 animate-pulse" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold tracking-tight text-foreground text-lg">Edgekit</span>
            <span className="font-semibold text-primary text-lg">Events</span>
          </div>
        </div>

        {/* Status & Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* WebSocket Live Status */}
          <Tooltip>
            <TooltipTrigger
              render={
                <Badge
                  variant="outline"
                  onClick={wsStatus === 'disconnected' ? onReconnectWs : undefined}
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium transition-colors',
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
                      'size-2 rounded-full',
                      wsStatus === 'connected' && 'bg-emerald-500 dark:bg-emerald-400 animate-ping',
                      wsStatus === 'connecting' && 'bg-amber-500 dark:bg-amber-400 animate-pulse',
                      wsStatus === 'disconnected' && 'bg-destructive'
                    )}
                  />
                  <span className="capitalize">
                    {wsStatus === 'connected'
                      ? t.navbar.connected
                      : wsStatus === 'connecting'
                      ? t.navbar.connecting
                      : t.navbar.disconnected}
                  </span>
                  {wsStatus === 'disconnected' && <RefreshCw className="size-3 ml-1" />}
                </Badge>
              }
            />
            {wsStatus === 'disconnected' && <TooltipContent>{t.navbar.reconnect}</TooltipContent>}
          </Tooltip>

          {/* Passkey / Session Trigger Button */}
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant={isAuthenticated ? 'outline' : 'secondary'}
                  size="sm"
                  onClick={openModal}
                  className={cn(
                    'gap-1.5',
                    isAuthenticated &&
                      'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                  )}
                >
                  {isAuthenticated ? (
                    <>
                      <ShieldCheck className="size-3.5 text-emerald-500" />
                      <span>{locale === 'pt-BR' ? 'Passkey Conectada' : 'Passkey Connected'}</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="size-3.5 text-muted-foreground" />
                      <span>{t.navbar.connectSecret}</span>
                    </>
                  )}
                </Button>
              }
            />
            <TooltipContent>
              {isAuthenticated
                ? locale === 'pt-BR'
                  ? 'Sessão autenticada via Passkey (Cookie HttpOnly)'
                  : 'Authenticated Passkey session (HttpOnly cookie)'
                : t.navbar.credentialsTooltip}
            </TooltipContent>
          </Tooltip>

          {/* Language Switcher */}
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLocale(locale === 'pt-BR' ? 'en' : 'pt-BR')}
                  className="flex items-center gap-1 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  <Globe className="size-3.5" />
                  <span className="uppercase font-semibold">
                    {locale === 'pt-BR' ? 'PT' : 'EN'}
                  </span>
                </Button>
              }
            />
            <TooltipContent>{t.navbar.languageTooltip}</TooltipContent>
          </Tooltip>

          {/* Theme Switcher */}
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleTheme}
                  aria-label={t.navbar.themeTooltip}
                  className="flex items-center gap-1 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  {resolvedTheme === 'dark' ? (
                    <>
                      <Sun className="size-3.5 text-amber-400 transition-transform hover:rotate-45" />
                      <span className="hidden sm:inline font-medium">
                        {locale === 'pt-BR' ? 'Claro' : 'Light'}
                      </span>
                    </>
                  ) : (
                    <>
                      <Moon className="size-3.5 text-primary transition-transform hover:-rotate-12" />
                      <span className="hidden sm:inline font-medium">
                        {locale === 'pt-BR' ? 'Escuro' : 'Dark'}
                      </span>
                    </>
                  )}
                </Button>
              }
            />
            <TooltipContent>{t.navbar.themeTooltip}</TooltipContent>
          </Tooltip>

          {/* Docs / Github Link */}
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  render={
                    <a
                      href="https://github.com"
                      target="_blank"
                      rel="noreferrer"
                    />
                  }
                  className="hidden sm:inline-flex text-muted-foreground hover:text-foreground"
                >
                  <ExternalLink className="size-4" />
                </Button>
              }
            />
            <TooltipContent>{t.navbar.docs}</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </header>
  );
};
