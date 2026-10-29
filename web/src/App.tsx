import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { StatsBar } from './components/StatsBar';
import { DebugConsole } from './components/DebugConsole';
import { EventSimulator } from './components/EventSimulator';
import { ChannelExplorer } from './components/ChannelExplorer';
import { SnippetGenerator } from './components/SnippetGenerator';
import { PasskeyModal } from './components/PasskeyModal';
import { useI18n } from './i18n/context';
import { Terminal, Send, Hash, Code2 } from 'lucide-react';
import { useStatsQuery, useEventsQuery, useDebugStream } from './hooks/api';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

type TabValue = 'console' | 'simulator' | 'channels' | 'snippets';

export const App: React.FC = () => {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<TabValue>('console');
  const [isPaused, setIsPaused] = useState(false);
  const [simulatorChannel, setSimulatorChannel] = useState<string>('pedidos');

  // Real-time debug stream managed via single socket manager and TanStack Query
  const { wsStatus, reconnect } = useDebugStream(isPaused);

  // Queries are single sources of truth - zero state duplication!
  const { data: events = [] } = useEventsQuery();
  const { data: stats } = useStatsQuery();

  const channelsCount = stats?.channels_count ?? 0;

  const handleSelectChannelForTrigger = (channelName: string) => {
    setSimulatorChannel(channelName);
    setActiveTab('simulator');
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Navigation */}
      <Navbar
        wsStatus={wsStatus}
        onReconnectWs={reconnect}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Metric Cards - reads directly from TanStack Query */}
        <StatsBar />

        {/* Tab Navigation */}
        <Tabs
          value={activeTab}
          onValueChange={(val) => setActiveTab(val as TabValue)}
          className="flex flex-col gap-6"
        >
          <TabsList variant="line" className="border-b border-border w-full justify-start pb-0 h-auto gap-2 sm:gap-4 overflow-x-auto">
            <TabsTrigger
              value="console"
              className="py-3 px-3 text-xs sm:text-sm font-medium"
            >
              <Terminal className="size-4 mr-1.5" />
              <span>{t.tabs.debugConsole}</span>
              {events.length > 0 && (
                <Badge variant="secondary" className="ml-1.5 text-xs">
                  {events.length}
                </Badge>
              )}
            </TabsTrigger>

            <TabsTrigger
              value="simulator"
              className="py-3 px-3 text-xs sm:text-sm font-medium"
            >
              <Send className="size-4 mr-1.5" />
              <span>{t.tabs.eventSimulator}</span>
            </TabsTrigger>

            <TabsTrigger
              value="channels"
              className="py-3 px-3 text-xs sm:text-sm font-medium"
            >
              <Hash className="size-4 mr-1.5" />
              <span>{t.tabs.channelsExplorer}</span>
              {channelsCount > 0 && (
                <Badge variant="secondary" className="ml-1.5 text-xs">
                  {channelsCount}
                </Badge>
              )}
            </TabsTrigger>

            <TabsTrigger
              value="snippets"
              className="py-3 px-3 text-xs sm:text-sm font-medium"
            >
              <Code2 className="size-4 mr-1.5" />
              <span>{t.tabs.snippets}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="console" className="mt-0">
            <DebugConsole
              isPaused={isPaused}
              onTogglePause={() => setIsPaused(!isPaused)}
            />
          </TabsContent>

          <TabsContent value="simulator" className="mt-0">
            <EventSimulator
              initialChannel={simulatorChannel}
            />
          </TabsContent>

          <TabsContent value="channels" className="mt-0">
            <ChannelExplorer
              onSelectChannelForTrigger={handleSelectChannelForTrigger}
            />
          </TabsContent>

          <TabsContent value="snippets" className="mt-0">
            <SnippetGenerator
              host={window.location.host}
            />
          </TabsContent>
        </Tabs>
      </main>

      {/* Passkey Modal (autônomo via TanStack Query Auth) */}
      <PasskeyModal />
    </div>
  );
};
