import React from 'react';
import { Radio, Key, Globe, ExternalLink, RefreshCw, ShieldCheck } from 'lucide-react';
import { useI18n } from '../i18n/context';
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

  return (
    <header className="border-b border-border bg-card/60 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 shadow-sm shadow-sky-500/20">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold tracking-tight text-foreground text-lg">Edgekit</span>
              <span className="font-semibold text-sky-400 text-lg">Events</span>
              <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider bg-sky-500/10 text-sky-400 border-sky-500/20 px-1.5 py-0.5">
                DO Realtime
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground hidden sm:block">
              {t.navbar.brandSubtitle}
            </p>
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
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : wsStatus === 'connecting'
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                : 'bg-rose-500/10 text-rose-400 border-rose-500/30 cursor-pointer hover:bg-rose-500/20'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                wsStatus === 'connected'
                  ? 'bg-emerald-400 animate-ping'
                  : wsStatus === 'connecting'
                  ? 'bg-amber-400 animate-pulse'
                  : 'bg-rose-400'
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
              <span className="text-zinc-500">Key:</span>
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
                ? 'border-sky-500/30 bg-sky-500/10 text-sky-400 hover:bg-sky-500/20'
                : ''
            }
          >
            {isAuthenticated ? (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
                <span className="hidden sm:inline">Sessão Segura Ativa</span>
                <span className="sm:hidden">Sessão</span>
              </>
            ) : (
              <>
                <Key className="w-3.5 h-3.5 text-zinc-400" />
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
