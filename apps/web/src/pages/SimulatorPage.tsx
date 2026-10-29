import React from 'react';
import { useRouterState } from '@tanstack/react-router';
import { PageLayout } from '../components/layout/PageLayout';
import { PageHeader } from '@/components/ui/page-header';
import { EventSimulator } from '../components/EventSimulator';
import { useI18n } from '../i18n/context';

export const SimulatorPage: React.FC = () => {
  const { t } = useI18n();
  const routerState = useRouterState();
  const searchObj = (routerState.location.search ?? {}) as Record<string, any>;
  const initialChannel = typeof searchObj?.channel === 'string' ? searchObj.channel : undefined;

  return (
    <PageLayout>
      <PageHeader
        title={t.simulator.title}
        subtitle={t.simulator.subtitle}
      />

      <EventSimulator initialChannel={initialChannel} />
    </PageLayout>
  );
};
