import React from 'react';
import { useRouterState } from '@tanstack/react-router';
import { PageLayout, PageHeader } from '../components/layout';
import { EventSimulator } from '../components/EventSimulator';
import { useI18n } from '../i18n/context';
import { Badge } from '@/components/ui/badge';
import { Zap } from 'lucide-react';

export const SimulatorPage: React.FC = () => {
  const { t } = useI18n();
  const routerState = useRouterState();
  const searchObj = (routerState.location.search ?? {}) as Record<string, any>;
  const initialChannel = typeof searchObj?.channel === 'string' ? searchObj.channel : undefined;

  return (
    <PageLayout maxWidth="md">
      <PageHeader
        category="Testing & Verification"
        title={t.simulator.title}
        badge="Pusher REST API"
        description={t.simulator.subtitle}
        actions={
          <Badge variant="secondary" className="px-2.5 py-1 text-xs">
            <Zap className="size-3 mr-1 text-amber-500" />
            <span>POST /apps/:appId/events</span>
          </Badge>
        }
      />

      <EventSimulator initialChannel={initialChannel} />
    </PageLayout>
  );
};
