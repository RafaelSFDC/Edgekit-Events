import React from 'react';
import { Users, Hash, Zap, Cpu } from 'lucide-react';
import { useI18n } from '../i18n/context';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface StatsBarProps {
  activeSockets: number;
  channelsCount: number;
  sessionEventsCount: number;
  isHibernating: boolean;
}

export const StatsBar: React.FC<StatsBarProps> = ({
  activeSockets,
  channelsCount,
  sessionEventsCount,
  isHibernating,
}) => {
  const { t } = useI18n();

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
      {/* 1. Conexões Ativas */}
      <Card className="p-0 border-border/80 shadow-sm">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              {t.stats.activeConnections}
            </p>
            <div className="flex items-baseline space-x-1.5 mt-1">
              <span className="text-2xl font-bold tracking-tight text-foreground">
                {activeSockets}
              </span>
              <span className="text-xs text-muted-foreground hidden sm:inline">
                {t.stats.activeSockets}
              </span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
            <Users className="w-5 h-5" />
          </div>
        </CardContent>
      </Card>

      {/* 2. Canais Ocupados */}
      <Card className="p-0 border-border/80 shadow-sm">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              {t.stats.occupiedChannels}
            </p>
            <div className="flex items-baseline space-x-1.5 mt-1">
              <span className="text-2xl font-bold tracking-tight text-foreground">
                {channelsCount}
              </span>
              <span className="text-xs text-muted-foreground hidden sm:inline">
                {t.stats.totalChannels}
              </span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Hash className="w-5 h-5" />
          </div>
        </CardContent>
      </Card>

      {/* 3. Eventos na Sessão */}
      <Card className="p-0 border-border/80 shadow-sm">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              {t.stats.sessionEvents}
            </p>
            <div className="flex items-baseline space-x-1.5 mt-1">
              <span className="text-2xl font-bold tracking-tight text-foreground">
                {sessionEventsCount}
              </span>
              <span className="text-xs text-muted-foreground hidden sm:inline">
                {t.stats.monitoredEvents}
              </span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Zap className="w-5 h-5" />
          </div>
        </CardContent>
      </Card>

      {/* 4. Estado de Hibernação do DO */}
      <Card className="p-0 border-border/80 shadow-sm">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              {t.stats.hibernation}
            </p>
            <div className="flex items-center space-x-2 mt-1">
              <Badge
                variant={isHibernating ? 'outline' : 'default'}
                className={
                  isHibernating
                    ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10'
                    : 'bg-sky-500 text-slate-950'
                }
              >
                {isHibernating ? t.stats.hibernationIdle : t.stats.hibernationActive}
              </Badge>
            </div>
            <span className="text-[11px] text-muted-foreground block mt-1">
              Cloudflare Workers Edge
            </span>
          </div>
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center border ${
              isHibernating
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : 'bg-sky-500/10 border-sky-500/20 text-sky-400'
            }`}
          >
            <Cpu className="w-5 h-5" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
