import React from 'react';
import { Radio, Key, Globe, ExternalLink, RefreshCw, ShieldCheck } from 'lucide-react';
import { useI18n } from '../i18n/context';

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
  appId,
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
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                DO Realtime
              </span>
            </div>
            <p className="text-xs text-muted-foreground hidden sm:block">
              {t.navbar.brandSubtitle}
            </p>
          </div>
        </div>

        {/* Status & Actions */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* WebSocket Live Status */}
          <div
            onClick={wsStatus === 'disconnected' ? onReconnectWs : undefined}
            title={wsStatus === 'disconnected' ? t.navbar.reconnect : undefined}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
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
          </div>

          {/* App Key Badge if loaded */}
          {appKey && (
            <div className="hidden md:flex items-center space-x-1 px-2.5 py-1 rounded-md bg-secondary/80 border border-border text-xs text-muted-foreground">
              <span className="text-zinc-500">Key:</span>
              <code className="text-foreground font-mono">{appKey}</code>
            </div>
          )}

          {/* App Secret / Session Trigger Button */}
          <button
            onClick={onOpenSecretModal}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-all ${
              isAuthenticated
                ? 'bg-sky-500/10 text-sky-400 border-sky-500/30 hover:bg-sky-500/20'
                : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700'
            }`}
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
          </button>

          {/* Language Switcher */}
          <button
            onClick={() => setLocale(locale === 'pt-BR' ? 'en' : 'pt-BR')}
            title={t.navbar.languageTooltip}
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-md bg-secondary/80 border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <Globe className="w-3.5 h-3.5" />
            <span className="uppercase font-semibold">{locale === 'pt-BR' ? 'PT' : 'EN'}</span>
          </button>

          {/* Docs / Github Link */}
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            title={t.navbar.docs}
            className="hidden sm:flex items-center space-x-1 p-2 rounded-md text-muted-foreground hover:text-foreground transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
    </header>
  );
};
