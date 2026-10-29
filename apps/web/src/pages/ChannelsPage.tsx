import React from 'react';
import { useNavigate } from '@tanstack/react-router';
import { PageLayout } from '../components/layout/PageLayout';
import { PageHeader } from '@/components/ui/page-header';
import { ChannelExplorer } from '../components/ChannelExplorer';
import { useI18n } from '../i18n/context';

export const ChannelsPage: React.FC = () => {
  const { t } = useI18n();
  const navigate = useNavigate();

  const handleSelectChannel = (channelName: string) => {
    navigate({
      to: '/console',
      search: { channel: channelName } as any,
    });
  };

  return (
    <PageLayout>
      <PageHeader
        title={t.channels.title}
        subtitle={t.channels.subtitle}
      />

      <ChannelExplorer onSelectChannelForTrigger={handleSelectChannel} />
    </PageLayout>
  );
};
