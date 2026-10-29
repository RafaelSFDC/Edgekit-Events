import React, { useState } from 'react';
import { PageLayout } from '../components/layout/PageLayout';
import { PageHeader } from '@/components/ui/page-header';
import { DebugConsole } from '../components/DebugConsole';
import { useI18n } from '../i18n/context';

export const ConsolePage: React.FC = () => {
  const { t } = useI18n();
  const [isPaused, setIsPaused] = useState(false);

  return (
    <PageLayout>
      <PageHeader
        title={t.debugConsole.title}
        subtitle={t.debugConsole.subtitle}
      />

      <DebugConsole
        isPaused={isPaused}
        onTogglePause={() => setIsPaused((prev) => !prev)}
      />
    </PageLayout>
  );
};
