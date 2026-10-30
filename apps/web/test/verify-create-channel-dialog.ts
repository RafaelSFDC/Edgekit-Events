import assert from 'node:assert';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nProvider } from '../src/i18n/context';
import {
  CreateChannelDialog,
  CreateChannelForm,
  resolveChannelName,
  channelFormSchema,
} from '../src/components/console/CreateChannelDialog';

async function testCreateChannelDialog() {
  console.log('🧪 Iniciando testes de validação do novo CreateChannelDialog (TanStack Form + Base UI)...');

  // 1. Validar função pura de normalização e prefixação de nomes de canal
  console.log('1. Validando regras de resolução de nomes de canal (resolveChannelName)...');
  
  // Casos de presença:
  assert.strictEqual(
    resolveChannelName('lobby', 'presence', 'public'),
    'presence-lobby',
    'Canal de presença deve receber o prefixo presence-'
  );
  assert.strictEqual(
    resolveChannelName('presence-room', 'presence', 'public'),
    'presence-room',
    'Canal que já contém presence- não deve duplicar o prefixo'
  );

  // Casos de canais privados:
  assert.strictEqual(
    resolveChannelName('pedidos', 'crud', 'private'),
    'private-pedidos',
    'Canal privado deve receber o prefixo private-'
  );
  assert.strictEqual(
    resolveChannelName('private-financeiro', 'crud', 'private'),
    'private-financeiro',
    'Canal privado já com prefixo não deve duplicar private-'
  );
  assert.strictEqual(
    resolveChannelName('presence-chat', 'presence', 'private'),
    'presence-chat',
    'Canal presence tem precedência e não deve adicionar private- sobre presence-'
  );

  // Casos de canais públicos:
  assert.strictEqual(
    resolveChannelName('notificacoes-gerais', 'notifications', 'public'),
    'notificacoes-gerais',
    'Canal público mantém o nome limpo'
  );

  // Sanitização de caracteres:
  assert.strictEqual(
    resolveChannelName('Meu Canal #1', 'custom', 'public'),
    'meu-canal--1',
    'Caracteres especiais e espaços devem ser convertidos em hífen'
  );
  assert.strictEqual(
    resolveChannelName('', 'custom', 'public'),
    '',
    'Nome vazio deve retornar string vazia'
  );
  console.log('✅ Regras de resolução de nomes validadas com sucesso!');

  // 2. Validar Schema de Validação Zod
  console.log('2. Validando schema Zod (channelFormSchema)...');
  const validData = {
    category: 'crud',
    rawName: 'pedidos',
    visibility: 'public',
    allowedIpsText: '',
    eventsList: ['created', 'updated'],
    ttlOption: '0',
    customTtlMinutes: '30',
    webhookUrl: 'https://exemplo.com/webhook',
    sendActivation: true,
    selectedEvent: 'created',
    payloadText: '{"status": "ok"}',
  };

  const parseResult = channelFormSchema.safeParse(validData);
  assert(parseResult.success, 'Dados válidos devem passar pelo schema');

  // Nome muito curto (< 2 caracteres)
  const shortNameResult = channelFormSchema.safeParse({ ...validData, rawName: 'a' });
  assert(!shortNameResult.success, 'Nome menor que 2 caracteres deve falhar');

  // Caracteres inválidos no nome
  const invalidNameResult = channelFormSchema.safeParse({ ...validData, rawName: 'canal@teste!' });
  assert(!invalidNameResult.success, 'Caracteres especiais não permitidos no nome devem falhar');

  // JSON inválido no payload
  const invalidJsonResult = channelFormSchema.safeParse({ ...validData, payloadText: '{invalid:json' });
  assert(!invalidJsonResult.success, 'JSON inválido no payload deve falhar');

  // Webhook URL com protocolo inválido
  const invalidWebhookResult = channelFormSchema.safeParse({ ...validData, webhookUrl: 'ftp://invalido' });
  assert(!invalidWebhookResult.success, 'Webhook sem http/https deve falhar');

  // Lista de eventos vazia
  const emptyEventsResult = channelFormSchema.safeParse({ ...validData, eventsList: [] });
  assert(!emptyEventsResult.success, 'Lista de eventos vazia deve falhar');
  console.log('✅ Schema Zod validado em todos os cenários!');

  // 3. Validar instanciação segura do componente Dialog
  console.log('3. Validando instanciação do CreateChannelDialog...');
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const dialogMarkup = renderToStaticMarkup(
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
  assert.strictEqual(typeof dialogMarkup, 'string', 'CreateChannelDialog deve instanciar sem erros');
  console.log('✅ CreateChannelDialog instanciado com sucesso!');

  // 4. Validar renderização do formulário desacoplado CreateChannelForm
  console.log('4. Validando renderização e estrutura DOM do CreateChannelForm...');
  const formMarkup = renderToStaticMarkup(
    React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(
        I18nProvider,
        null,
        React.createElement(CreateChannelForm, {
          onClose: () => {},
          onSuccess: () => {},
        })
      )
    )
  );

  // Verificação de elementos semânticos do formulário e rolagem
  assert(
    formMarkup.includes('id="create-channel-form"'),
    'Deve conter o formulário estruturado com id create-channel-form'
  );
  assert(
    formMarkup.includes('overflow-y-auto'),
    'Deve conter a área de rolagem independente (overflow-y-auto)'
  );
  assert(
    formMarkup.includes('data-slot="dialog-footer"'),
    'Deve conter o rodapé fixo DialogFooter'
  );

  // Verificação dos campos e primitivos Field
  assert(
    formMarkup.includes('data-slot="field"'),
    'Deve utilizar os primitivos de formulário Field'
  );
  assert(
    formMarkup.includes('data-slot="field-label"'),
    'Deve utilizar FieldLabel'
  );
  assert(
    formMarkup.includes('role="radiogroup"'),
    'Arquétipos devem estar agrupados com papel de acessibilidade radiogroup'
  );
  assert(
    formMarkup.includes('CRUD / Dados'),
    'Deve listar arquétipo CRUD / Dados'
  );
  assert(
    formMarkup.includes('Notificações'),
    'Deve listar arquétipo Notificações'
  );
  assert(
    formMarkup.includes('Ciclo de Jobs'),
    'Deve listar arquétipo Ciclo de Jobs'
  );
  assert(
    formMarkup.includes('Salas &amp; Presença') || formMarkup.includes('Salas & Presença'),
    'Deve listar arquétipo Presença'
  );
  assert(
    formMarkup.includes('Customizado'),
    'Deve listar arquétipo Customizado'
  );

  // Verificação dos campos de identificação
  assert(
    formMarkup.includes('channel-raw-name'),
    'Input de nome do canal deve estar presente'
  );

  // Verificação do preview de integração client-side
  assert(
    formMarkup.includes('pusher.subscribe'),
    'Deve incluir o snippet de código com pusher.subscribe'
  );
  assert(
    formMarkup.includes('channel.bind'),
    'Deve incluir o binding de evento no snippet'
  );

  // Verificação de padronização de tamanhos: inputs e botões não devem ter classes de compactação impróprias
  assert(
    !formMarkup.includes('h-6 px-1.5 text-xs'),
    'Não deve conter botões comprimidos arbitrariamente (h-6)'
  );

  console.log('✅ Estrutura DOM e layout do CreateChannelForm validados com 100% de conformidade!');

  console.log('\n🎉 TODOS OS TESTES DO CREATE CHANNEL DIALOG PASSARAM COM SUCESSO!');
}

testCreateChannelDialog().catch((err) => {
  console.error('❌ Falha nos testes do CreateChannelDialog:', err);
  process.exit(1);
});
