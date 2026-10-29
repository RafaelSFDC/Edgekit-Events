import React from 'react';
import { useNavigate } from '@tanstack/react-router';
import { PageLayout, PageHeader } from '../components/layout';
import { ChannelExplorer } from '../components/ChannelExplorer';
import { useI18n } from '../i18n/context';
import { useStatsQuery } from '../hooks/api';
import { Badge } from '@/components/ui/badge';
import { Hash } from 'lucide-react';

export const ChannelsPage: React.FC = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { data: stats } = useStatsQuery();

  const handleSelectChannel = (channelName: string) => {
    navigate({
      to: '/simulator',
      search: { channel: channelName } as any,
    });
  };

  return (
    <PageLayout>
      <PageHeader
        category="Channels & Presence"
        title={t.channels.title}
        badge="Live Subscriptions"
        description={t.channels.subtitle}
        actions={
          <Badge variant="secondary" className="px-2.5 py-1 text-xs">
            <Hash className="size-3 mr-1" />
            <span>{stats?.channels_count ?? 0} {t.stats.occupiedChannels}</span>
          </Badge>
        }
      />

      <ChannelExplorer onSelectChannelForTrigger={handleSelectChannel} />
    </PageLayout>
  );
};
