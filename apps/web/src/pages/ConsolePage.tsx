import React, { useState } from 'react';
import { PageLayout, PageHeader } from '../components/layout';
import { DebugConsole } from '../components/DebugConsole';
import { useI18n } from '../i18n/context';
import { useEventsQuery } from '../hooks/api';
import { Badge } from '@/components/ui/badge';
import { Terminal } from 'lucide-react';

export const ConsolePage: React.FC = () => {
  const { t } = useI18n();
  const [isPaused, setIsPaused] = useState(false);
  const { data: events = [] } = useEventsQuery();

  return (
    <PageLayout>
      <PageHeader
        category="Realtime & Observability"
        title={t.debugConsole.title}
        badge="WebSocket Stream"
        description={t.debugConsole.subtitle}
        actions={
          <Badge variant="secondary" className="px-2.5 py-1 text-xs">
            <Terminal className="size-3 mr-1.5" />
            <span>{events.length} {events.length === 1 ? 'evento' : 'eventos capturados'}</span>
          </Badge>
        }
      />

      <DebugConsole
        isPaused={isPaused}
        onTogglePause={() => setIsPaused((prev) => !prev)}
      />
    </PageLayout>
  );
};
