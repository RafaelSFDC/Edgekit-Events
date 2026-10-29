import React from 'react';
import { Radio, Key, Globe, ExternalLink, RefreshCw, ShieldCheck, Sun, Moon } from 'lucide-react';
import { useI18n } from '../i18n/context';
import { useTheme } from '../theme/context';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface NavbarProps {
  wsStatus: 'connected' | 'connecting' | 'disconnected';
  isAuthenticated: boolean;
  appId?: string;
  appKey?: string;
  onOpenSecretModal: () => void;
  onReconnectWs: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  wsStatus,
  isAuthenticated,
  appKey,
  onOpenSecretModal,
  onReconnectWs,
}) => {
  const { locale, setLocale, t } = useI18n();
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-40 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-600 dark:text-sky-400 shadow-sm shadow-sky-500/20">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="font-bold tracking-tight text-foreground text-lg">Edgekit</span>
            <span className="font-semibold text-sky-600 dark:text-sky-400 text-lg">Events</span>
          </div>
        </div>

        {/* Status & Actions */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* WebSocket Live Status */}
          <Badge
            variant="outline"
            onClick={wsStatus === 'disconnected' ? onReconnectWs : undefined}
            title={wsStatus === 'disconnected' ? t.navbar.reconnect : undefined}
            className={`flex items-center space-x-1.5 px-2.5 py-1 text-xs font-medium transition-colors ${
              wsStatus === 'connected'
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                : wsStatus === 'connecting'
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 cursor-pointer hover:bg-rose-500/20'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                wsStatus === 'connected'
                  ? 'bg-emerald-500 dark:bg-emerald-400 animate-ping'
                  : wsStatus === 'connecting'
                  ? 'bg-amber-500 dark:bg-amber-400 animate-pulse'
                  : 'bg-rose-500 dark:bg-rose-400'
              }`}
            />
            <span className="capitalize">
              {wsStatus === 'connected'
                ? t.navbar.connected
                : wsStatus === 'connecting'
                ? t.navbar.connecting
                : t.navbar.disconnected}
            </span>
            {wsStatus === 'disconnected' && (
              <RefreshCw className="w-3 h-3 ml-1" />
            )}
          </Badge>

          {/* App Key Badge if loaded */}
          {appKey && (
            <Badge variant="outline" className="hidden md:flex items-center space-x-1 bg-secondary/80 border-border text-xs text-muted-foreground font-normal">
              <span className="text-muted-foreground/80">Key:</span>
              <code className="text-foreground font-mono">{appKey}</code>
            </Badge>
          )}

          {/* App Secret / Session Trigger Button */}
          <Button
            variant={isAuthenticated ? 'outline' : 'secondary'}
            size="sm"
            onClick={onOpenSecretModal}
            className={
              isAuthenticated
                ? 'border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400 hover:bg-sky-500/20'
                : ''
            }
          >
            {isAuthenticated ? (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                <span className="hidden sm:inline">Sessão Segura Ativa</span>
                <span className="sm:hidden">Sessão</span>
              </>
            ) : (
              <>
                <Key className="w-3.5 h-3.5 text-muted-foreground" />
                <span>{t.navbar.connectSecret}</span>
              </>
            )}
          </Button>

          {/* Language Switcher */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocale(locale === 'pt-BR' ? 'en' : 'pt-BR')}
            title={t.navbar.languageTooltip}
            className="flex items-center space-x-1 px-2.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <Globe className="w-3.5 h-3.5" />
            <span className="uppercase font-semibold">{locale === 'pt-BR' ? 'PT' : 'EN'}</span>
          </Button>

          {/* Theme Switcher */}
          <Button
            variant="outline"
            size="sm"
            onClick={toggleTheme}
            title={t.navbar.themeTooltip}
            aria-label={t.navbar.themeTooltip}
            className="flex items-center space-x-1 px-2.5 text-xs text-muted-foreground hover:text-foreground"
          >
            {resolvedTheme === 'dark' ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400 transition-transform hover:rotate-45" />
                <span className="hidden sm:inline font-medium">
                  {locale === 'pt-BR' ? 'Claro' : 'Light'}
                </span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-sky-600 transition-transform hover:-rotate-12" />
                <span className="hidden sm:inline font-medium">
                  {locale === 'pt-BR' ? 'Escuro' : 'Dark'}
                </span>
              </>
            )}
          </Button>

          {/* Docs / Github Link */}
          <Button
            variant="ghost"
            size="icon-sm"
            render={
              <a
                href="https://github.com"
                target="_blank"
                rel="noreferrer"
                title={t.navbar.docs}
              />
            }
            className="hidden sm:inline-flex text-muted-foreground hover:text-foreground"
          >
            <ExternalLink className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </header>
  );
};
