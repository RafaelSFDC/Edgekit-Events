import React, { useState } from 'react';
import { Hash, Users, Lock, Radio, Send, RefreshCw } from 'lucide-react';
import type { ChannelStat } from '../types';
import { useI18n } from '../i18n/context';

interface ChannelExplorerProps {
  channels: Record<string, { user_count: number }>;
  onRefresh: () => void;
  onSelectChannelForTrigger: (channelName: string) => void;
}

export const ChannelExplorer: React.FC<ChannelExplorerProps> = ({
  channels,
  onRefresh,
  onSelectChannelForTrigger,
}) => {
  const { t } = useI18n();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const channelList: ChannelStat[] = Object.entries(channels).map(([name, data]) => ({
    name,
    user_count: data.user_count,
    isPresence: name.startsWith('presence-'),
    isPrivate: name.startsWith('private-'),
  }));

  const handleRefreshClick = () => {
    setIsRefreshing(true);
    onRefresh();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-base font-semibold text-foreground">
            {t.channels.title}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t.channels.subtitle}
          </p>
        </div>
        <button
          onClick={handleRefreshClick}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-secondary hover:bg-zinc-800 text-foreground border border-border transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>{t.channels.refresh}</span>
        </button>
      </div>

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
            <div
              key={ch.name}
              className="bg-secondary/40 border border-border rounded-xl p-4 flex flex-col justify-between hover:border-zinc-700 transition-colors"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  {ch.isPresence ? (
                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <Users className="w-3 h-3" />
                      <span>{t.channels.presenceChannel}</span>
                    </span>
                  ) : ch.isPrivate ? (
                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      <Lock className="w-3 h-3" />
                      <span>{t.channels.privateChannel}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                      <Radio className="w-3 h-3" />
                      <span>{t.channels.publicChannel}</span>
                    </span>
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
              </div>

              <div className="mt-4 pt-3 border-t border-border flex justify-end">
                <button
                  onClick={() => onSelectChannelForTrigger(ch.name)}
                  className="flex items-center space-x-1 text-xs text-sky-400 hover:text-sky-300 font-medium transition-colors"
                >
                  <Send className="w-3 h-3" />
                  <span>{t.channels.triggerInThisChannel}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
