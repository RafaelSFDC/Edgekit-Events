import React from 'react';
import { Users, Hash, Zap, Cpu } from 'lucide-react';
import { useI18n } from '../i18n/context';
import { useStatsQuery } from '../hooks/api/use-stats';
import { useEventsQuery } from '../hooks/api/use-events';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface StatsBarProps {
  activeSockets?: number;
  channelsCount?: number;
  sessionEventsCount?: number;
  isHibernating?: boolean;
}

export const StatsBar: React.FC<StatsBarProps> = ({
  activeSockets: propActiveSockets,
  channelsCount: propChannelsCount,
  sessionEventsCount: propSessionEventsCount,
  isHibernating: propIsHibernating,
}) => {
  const { t } = useI18n();
  const { data: stats } = useStatsQuery();
  const { data: events = [] } = useEventsQuery();

  const activeSockets = propActiveSockets ?? stats?.active_sockets ?? 0;
  const channelsCount = propChannelsCount ?? stats?.channels_count ?? 0;
  const sessionEventsCount = propSessionEventsCount ?? events.length;
  const isHibernating = propIsHibernating ?? (activeSockets === 0);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
      {/* 1. Conexões Ativas */}
      <Card className="shadow-xs border-border/80">
        <CardContent className="p-4 sm:p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              {t.stats.activeConnections}
            </p>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-bold tracking-tight text-foreground">
                {activeSockets}
              </span>
              <span className="text-xs text-muted-foreground hidden sm:inline">
                {t.stats.activeSockets}
              </span>
            </div>
          </div>
          <div className="size-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <Users className="size-5" />
          </div>
        </CardContent>
      </Card>

      {/* 2. Canais Ocupados */}
      <Card className="shadow-xs border-border/80">
        <CardContent className="p-4 sm:p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              {t.stats.occupiedChannels}
            </p>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-bold tracking-tight text-foreground">
                {channelsCount}
              </span>
              <span className="text-xs text-muted-foreground hidden sm:inline">
                {t.stats.totalChannels}
              </span>
            </div>
          </div>
          <div className="size-10 rounded-lg bg-secondary text-secondary-foreground border border-border flex items-center justify-center">
            <Hash className="size-5" />
          </div>
        </CardContent>
      </Card>

      {/* 3. Eventos na Sessão */}
      <Card className="shadow-xs border-border/80">
        <CardContent className="p-4 sm:p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              {t.stats.sessionEvents}
            </p>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-bold tracking-tight text-foreground">
                {sessionEventsCount}
              </span>
              <span className="text-xs text-muted-foreground hidden sm:inline">
                {t.stats.monitoredEvents}
              </span>
            </div>
          </div>
          <div className="size-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <Zap className="size-5" />
          </div>
        </CardContent>
      </Card>

      {/* 4. Estado de Hibernação do DO */}
      <Card className="shadow-xs border-border/80">
        <CardContent className="p-4 sm:p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              {t.stats.hibernation}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <Badge
                variant={isHibernating ? 'outline' : 'default'}
                className="text-xs"
              >
                {isHibernating ? t.stats.hibernationIdle : t.stats.hibernationActive}
              </Badge>
            </div>
            <span className="text-xs text-muted-foreground block mt-1">
              Cloudflare Workers Edge
            </span>
          </div>
          <div
            className={cn(
              'size-10 rounded-lg flex items-center justify-center border',
              isHibernating
                ? 'bg-muted text-muted-foreground border-border'
                : 'bg-primary/10 border-primary/20 text-primary'
            )}
          >
            <Cpu className="size-5" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
