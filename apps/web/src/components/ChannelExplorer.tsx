import React from 'react';
import { Hash, Users, Lock, Radio, Send, RefreshCw } from 'lucide-react';
import type { ChannelStat } from '../types';
import { useI18n } from '../i18n/context';
import { useStatsQuery } from '../hooks/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from '@/components/ui/empty';

interface ChannelExplorerProps {
  channels?: Record<string, { user_count: number }>;
  onRefresh?: () => void;
  onSelectChannelForTrigger: (channelName: string) => void;
  isRefreshing?: boolean;
}

export const ChannelExplorer: React.FC<ChannelExplorerProps> = ({
  channels: propChannels,
  onRefresh: propOnRefresh,
  onSelectChannelForTrigger,
  isRefreshing: propIsRefreshing,
}) => {
  const { t } = useI18n();
  const { data: statsData, isFetching, refetch } = useStatsQuery();

  const channels = propChannels ?? statsData?.channels ?? {};
  const isRefreshing = propIsRefreshing ?? isFetching;

  const channelList: ChannelStat[] = Object.entries(channels).map(([name, data]) => ({
    name,
    user_count: data.user_count,
    isPresence: name.startsWith('presence-'),
    isPrivate: name.startsWith('private-'),
  }));

  const handleRefreshClick = () => {
    if (propOnRefresh) {
      propOnRefresh();
    } else {
      refetch();
    }
  };

  return (
    <Card className="shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between pb-6">
        <div>
          <CardTitle className="text-base font-semibold text-foreground">
            {t.channels.title}
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground mt-0.5">
            {t.channels.subtitle}
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefreshClick}
          disabled={isRefreshing}
          className="gap-1.5"
        >
          <RefreshCw className={`size-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>{t.channels.refresh}</span>
        </Button>
      </CardHeader>

      <CardContent>
        {channelList.length === 0 ? (
          <Empty className="py-16">
            <EmptyMedia variant="icon">
              <Hash className="size-4 text-muted-foreground" />
            </EmptyMedia>
            <EmptyHeader>
              <EmptyTitle>{t.channels.noChannels}</EmptyTitle>
              <EmptyDescription>
                Conecte um cliente via{' '}
                <code className="text-foreground font-mono">pusher-js</code> ou dispare um evento para abrir um canal.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {channelList.map((ch) => (
              <Card
                key={ch.name}
                className="shadow-xs bg-card border-border/80 flex flex-col justify-between hover:border-primary/40 transition-colors"
              >
                <CardContent className="p-4 pb-2">
                  <div className="flex items-center justify-between mb-2">
                    {ch.isPresence ? (
                      <Badge
                        variant="outline"
                        className="gap-1 text-xs border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                      >
                        <Users className="size-3" />
                        <span>{t.channels.presenceChannel}</span>
                      </Badge>
                    ) : ch.isPrivate ? (
                      <Badge
                        variant="outline"
                        className="gap-1 text-xs border-border text-foreground bg-secondary"
                      >
                        <Lock className="size-3" />
                        <span>{t.channels.privateChannel}</span>
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="gap-1 text-xs border-primary/30 text-primary bg-primary/10"
                      >
                        <Radio className="size-3" />
                        <span>{t.channels.publicChannel}</span>
                      </Badge>
                    )}

                    <span className="text-xs text-muted-foreground font-medium">
                      {t.channels.listenersCount(ch.user_count)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 my-2">
                    <Hash className="size-4 text-muted-foreground shrink-0" />
                    <span className="font-mono font-semibold text-sm text-foreground break-all">
                      {ch.name}
                    </span>
                  </div>
                </CardContent>

                <CardFooter className="p-4 pt-2 border-t border-border/60 flex justify-end">
                  <Button
                    variant="link"
                    size="xs"
                    onClick={() => onSelectChannelForTrigger(ch.name)}
                    className="text-xs text-primary gap-1 p-0 h-auto"
                  >
                    <Send className="size-3" />
                    <span>{t.channels.triggerInThisChannel}</span>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
