import assert from 'node:assert';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ConsoleDataTable } from '../src/components/console/ConsoleDataTable';
import { EventPayloadDialog } from '../src/components/console/EventPayloadDialog';
import { EventSimulatorDialog } from '../src/components/console/EventSimulatorDialog';
import { CreateChannelDialog } from '../src/components/console/CreateChannelDialog';
import { ChannelExplorer } from '../src/components/ChannelExplorer';
import { I18nProvider } from '../src/i18n/context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { DebugEvent } from '../src/types';

async function testConsoleComponents() {
  console.log('🧪 Iniciando testes de validação dos novos componentes do Console (Diorama Care style)...');

  const mockEvents: DebugEvent[] = [
    {
      id: 'ev-1',
      type: 'event_triggered',
      channel: 'pedidos',
      event: 'novo-pedido',
      data: { orderId: 1042, total: 99.5 },
      delivered_to: 2,
      timestamp: 1700000000000,
    },
    {
      id: 'ev-2',
      type: 'client_connected',
      socket_id: 'sock-abc-123',
      timestamp: 1700000005000,
    },
  ];

  // 1. Renderizar ConsoleDataTable com dados
  console.log('1. Validando renderização do ConsoleDataTable com eventos...');
  const tableHtml = renderToStaticMarkup(
    React.createElement(ConsoleDataTable, {
      data: mockEvents,
      onInspectEvent: () => {},
    })
  );

  assert(tableHtml.includes('novo-pedido'), 'Tabela deve conter o evento novo-pedido');
  assert(tableHtml.includes('pedidos'), 'Tabela deve conter o canal pedidos');
  assert(tableHtml.includes('sock-abc-123'), 'Tabela deve conter o socket ID');
  assert(tableHtml.includes('TRIGGER'), 'Badge TRIGGER deve ser renderizado');
  assert(tableHtml.includes('CONNECT'), 'Badge CONNECT deve ser renderizado');
  assert(tableHtml.includes('Buscar por evento'), 'Input de busca deve estar presente');
  assert(tableHtml.includes('Todos os tipos'), 'Select de tipos deve estar presente');
  assert(tableHtml.includes('Por página:'), 'Seletor de paginação deve estar presente');
  console.log('✅ ConsoleDataTable com dados renderizado com sucesso!');

  // 2. Renderizar ConsoleDataTable com lista vazia (Empty State estilo Diorama Care)
  console.log('2. Validando Empty State do ConsoleDataTable...');
  const emptyTableHtml = renderToStaticMarkup(
    React.createElement(ConsoleDataTable, {
      data: [],
      onInspectEvent: () => {},
    })
  );

  assert(emptyTableHtml.includes('Nenhum evento encontrado'), 'Deve exibir empty state');
  console.log('✅ Empty State validado com sucesso!');

  // 3. Validar instanciação segura do EventPayloadDialog
  console.log('3. Validando instanciação do EventPayloadDialog...');
  const nullDialogHtml = renderToStaticMarkup(
    React.createElement(EventPayloadDialog, {
      event: null,
      open: false,
      onOpenChange: () => {},
    })
  );
  assert.strictEqual(nullDialogHtml, '', 'Dialog com event=null não deve renderizar markup');
  console.log('✅ EventPayloadDialog seguro com event=null validado com sucesso!');

  // 4. Validar instanciação segura do EventSimulatorDialog
  console.log('4. Validando instanciação do EventSimulatorDialog...');
  const queryClient = new QueryClient();
  const simDialogHtml = renderToStaticMarkup(
    React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(
        I18nProvider,
        null,
        React.createElement(EventSimulatorDialog, {
          open: false,
          onOpenChange: () => {},
        })
      )
    )
  );
  assert.strictEqual(typeof simDialogHtml, 'string', 'EventSimulatorDialog deve instanciar sem erros');
  console.log('✅ EventSimulatorDialog instanciado com sucesso!');

  // 5. Validar instanciação segura do CreateChannelDialog
  console.log('5. Validando instanciação do CreateChannelDialog...');
  const createChannelDialogHtml = renderToStaticMarkup(
    React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(
        I18nProvider,
        null,
        React.createElement(CreateChannelDialog, {
          open: false,
          onOpenChange: () => {},
        })
      )
    )
  );
  assert.strictEqual(typeof createChannelDialogHtml, 'string', 'CreateChannelDialog deve instanciar sem erros');
  console.log('✅ CreateChannelDialog instanciado com sucesso!');

  // 6. Validar ChannelExplorer com suporte a criação de canais, arquétipos e segurança
  console.log('6. Validando ChannelExplorer integrado com criação de canais e arquétipos...');
  const explorerHtml = renderToStaticMarkup(
    React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(
        I18nProvider,
        null,
        React.createElement(ChannelExplorer, {
          channels: {
            pedidos: {
              user_count: 3,
              category: 'crud',
              visibility: 'public',
              events: ['created', 'updated', 'deleted'],
              isRegistered: true,
            },
            'private-chat': {
              user_count: 1,
              category: 'custom',
              visibility: 'private',
              allowedIps: ['127.0.0.1'],
              autoDestructMinutes: 15,
              isRegistered: true,
            },
          },
          onSelectChannelForTrigger: () => {},
          onCreateChannel: () => {},
        })
      )
    )
  );
  assert(explorerHtml.includes('pedidos'), 'ChannelExplorer deve renderizar o canal pedidos');
  assert(explorerHtml.includes('private-chat'), 'ChannelExplorer deve renderizar o canal private-chat');
  assert(explorerHtml.includes('CRUD / Dados'), 'ChannelExplorer deve renderizar o arquétipo CRUD / Dados');
  assert(explorerHtml.includes('Privado'), 'ChannelExplorer deve renderizar o badge Privado');
  assert(explorerHtml.includes('15m ocioso'), 'ChannelExplorer deve renderizar o TTL de inatividade');
  assert(explorerHtml.includes('Novo Canal'), 'ChannelExplorer deve renderizar o botão Novo Canal');
  console.log('✅ ChannelExplorer com arquétipos e segurança validado com sucesso!');

  console.log('\n🎉 TODOS OS TESTES DOS COMPONENTES DO CONSOLE PASSARAM COM SUCESSO!\n');
  process.exit(0);
}

testConsoleComponents().catch((err) => {
  console.error('❌ Falha nos testes do console:', err);
  process.exit(1);
});
