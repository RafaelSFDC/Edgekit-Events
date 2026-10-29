import React from 'react';
import {
  Terminal,
  Send,
  Hash,
  Code2,
  ArrowRight,
} from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { useI18n } from '../i18n/context';
import { useStatsQuery, useEventsQuery } from '../hooks/api';
import { PageLayout, PageHeader } from '../components/layout';
import { StatsBar } from '../components/StatsBar';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export const OverviewPage: React.FC = () => {
  const { t } = useI18n();
  const { data: stats } = useStatsQuery();
  const { data: events = [] } = useEventsQuery();

  return (
    <PageLayout className="gap-6 pb-12">
      {/* Cabeçalho padrão da Dashboard */}
      <PageHeader
        title={t.breadcrumbs.overview}
        description="Painel de controle e métricas em tempo real do cluster EdgeKit Events"
      />

      {/* 1. Métricas principais do Cluster */}
      <StatsBar />

      {/* 2. Atalhos para as demais páginas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Console ao Vivo */}
        <Card className="hover:border-primary/50 transition-all hover:shadow-xs group">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="size-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
                <Terminal className="size-4.5" />
              </div>
              {events.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {events.length} logs
                </Badge>
              )}
            </div>
            <CardTitle className="text-base mt-3">{t.overview.openConsole}</CardTitle>
            <CardDescription className="text-xs line-clamp-2">
              {t.debugConsole.subtitle}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <Link to="/console" className="block w-full">
              <Button variant="outline" size="sm" className="w-full justify-between text-xs cursor-pointer">
                <span>Acessar</span>
                <ArrowRight className="size-3" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Card 2: Simulador */}
        <Card className="hover:border-primary/50 transition-all hover:shadow-xs group">
          <CardHeader className="pb-3">
            <div className="size-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
              <Send className="size-4.5" />
            </div>
            <CardTitle className="text-base mt-3">{t.overview.testEvent}</CardTitle>
            <CardDescription className="text-xs line-clamp-2">
              {t.simulator.subtitle}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <Link to="/simulator" className="block w-full">
              <Button variant="outline" size="sm" className="w-full justify-between text-xs cursor-pointer">
                <span>Disparar</span>
                <ArrowRight className="size-3" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Card 3: Canais */}
        <Card className="hover:border-primary/50 transition-all hover:shadow-xs group">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="size-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
                <Hash className="size-4.5" />
              </div>
              <Badge variant="secondary" className="text-xs">
                {stats?.channels_count ?? 0} ativos
              </Badge>
            </div>
            <CardTitle className="text-base mt-3">{t.overview.exploreChannels}</CardTitle>
            <CardDescription className="text-xs line-clamp-2">
              {t.channels.subtitle}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <Link to="/channels" className="block w-full">
              <Button variant="outline" size="sm" className="w-full justify-between text-xs cursor-pointer">
                <span>Explorar</span>
                <ArrowRight className="size-3" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Card 4: SDKs & Snippets */}
        <Card className="hover:border-primary/50 transition-all hover:shadow-xs group">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="size-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
                <Code2 className="size-4.5" />
              </div>
            </div>
            <CardTitle className="text-base mt-3">{t.overview.viewDocs}</CardTitle>
            <CardDescription className="text-xs line-clamp-2">
              {t.snippets.subtitle}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <Link to="/snippets" className="block w-full">
              <Button variant="outline" size="sm" className="w-full justify-between text-xs cursor-pointer">
                <span>Ver Códigos</span>
                <ArrowRight className="size-3" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
};
