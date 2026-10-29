import React, { useState } from 'react';
import { Hash, Users, Lock, Radio, Send, RefreshCw } from 'lucide-react';
import type { ChannelStat } from '../types';
import { useI18n } from '../i18n/context';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface ChannelExplorerProps {
  channels: Record<string, { user_count: number }>;
  onRefresh: () => void;
  onSelectChannelForTrigger: (channelName: string) => void;
  isRefreshing?: boolean;
}

export const ChannelExplorer: React.FC<ChannelExplorerProps> = ({
  channels,
  onRefresh,
  onSelectChannelForTrigger,
  isRefreshing: externalRefreshing,
}) => {
  const { t } = useI18n();
  const [internalRefreshing, setInternalRefreshing] = useState(false);

  const isRefreshing = externalRefreshing ?? internalRefreshing;

  const channelList: ChannelStat[] = Object.entries(channels).map(([name, data]) => ({
    name,
    user_count: data.user_count,
    isPresence: name.startsWith('presence-'),
    isPrivate: name.startsWith('private-'),
  }));

  const handleRefreshClick = () => {
    setInternalRefreshing(true);
    onRefresh();
    setTimeout(() => setInternalRefreshing(false), 500);
  };

  return (
    <Card className="shadow-sm">
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
          className="flex items-center space-x-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>{t.channels.refresh}</span>
        </Button>
      </CardHeader>

      <CardContent>
        {channelList.length === 0 ? (
          <div className="py-16 text-center">
            <Hash className="w-10 h-10 mx-auto text-zinc-600 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              {t.channels.noChannels}
            </p>
            <p className="text-xs text-zinc-500 mt-1">
              Conecte um cliente via <code className="text-zinc-400">pusher-js</code> ou dispare um evento para abrir um canal.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {channelList.map((ch) => (
              <Card
                key={ch.name}
                className="bg-secondary/40 border-border/80 flex flex-col justify-between hover:border-zinc-700 transition-colors"
              >
                <CardContent className="p-4 pb-2">
                  <div className="flex items-center justify-between mb-2">
                    {ch.isPresence ? (
                      <Badge variant="outline" className="space-x-1 text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                        <Users className="w-3 h-3" />
                        <span>{t.channels.presenceChannel}</span>
                      </Badge>
                    ) : ch.isPrivate ? (
                      <Badge variant="outline" className="space-x-1 text-[10px] bg-indigo-500/10 text-indigo-400 border-indigo-500/20">
                        <Lock className="w-3 h-3" />
                        <span>{t.channels.privateChannel}</span>
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="space-x-1 text-[10px] bg-sky-500/10 text-sky-400 border-sky-500/20">
                        <Radio className="w-3 h-3" />
                        <span>{t.channels.publicChannel}</span>
                      </Badge>
                    )}

                    <span className="text-xs text-zinc-400 font-medium">
                      {t.channels.listenersCount(ch.user_count)}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2 my-2">
                    <Hash className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="font-mono font-semibold text-sm text-foreground break-all">
                      {ch.name}
                    </span>
                  </div>
                </CardContent>

                <CardFooter className="p-4 pt-2 border-t border-border/60 flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onSelectChannelForTrigger(ch.name)}
                    className="text-xs text-sky-400 hover:text-sky-300 font-medium p-0 h-auto"
                  >
                    <Send className="w-3 h-3 mr-1" />
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
