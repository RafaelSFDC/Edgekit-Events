import React from 'react';
import { PageLayout, PageHeader } from '../components/layout';
import { SnippetGenerator } from '../components/SnippetGenerator';
import { useI18n } from '../i18n/context';
import { Badge } from '@/components/ui/badge';
import { Code2 } from 'lucide-react';

export const SnippetsPage: React.FC = () => {
  const { t } = useI18n();

  return (
    <PageLayout maxWidth="lg">
      <PageHeader
        category="Developer Experience"
        title={t.snippets.title}
        badge="7 Languages & SDKs"
        description={t.snippets.subtitle}
        actions={
          <Badge variant="secondary" className="px-2.5 py-1 text-xs">
            <Code2 className="size-3 mr-1" />
            <span>Zero Lock-in Pusher Protocol</span>
          </Badge>
        }
      />

      <SnippetGenerator />
    </PageLayout>
  );
};
