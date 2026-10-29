import {
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { OverviewPage } from './pages/OverviewPage';
import { ConsolePage } from './pages/ConsolePage';
import { SimulatorPage } from './pages/SimulatorPage';
import { ChannelsPage } from './pages/ChannelsPage';
import { SnippetsPage } from './pages/SnippetsPage';

// 1. Rota raiz que envelopa o DashboardLayout (TopHeader + Sidebar + Breadcrumbs + Outlet)
const rootRoute = createRootRoute({
  component: DashboardLayout,
});

// 2. Rota inicial: Visão Geral / Overview
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: OverviewPage,
});

// 3. Rota de Console ao Vivo
const consoleRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/console',
  component: ConsolePage,
});

// 4. Rota do Simulador de Eventos
const simulatorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/simulator',
  component: SimulatorPage,
});

// 5. Rota do Explorador de Canais
const channelsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/channels',
  component: ChannelsPage,
});

// 6. Rota de Snippets & SDKs
const snippetsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/snippets',
  component: SnippetsPage,
});

// 7. Montagem da Árvore de Rotas
const routeTree = rootRoute.addChildren([
  indexRoute,
  consoleRoute,
  simulatorRoute,
  channelsRoute,
  snippetsRoute,
]);

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
});

// Tipagem global estrita para o TanStack Router
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
