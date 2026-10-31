import assert from 'node:assert';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nProvider } from '../src/i18n/context';
import {
  EventSimulatorDialog,
  EventSimulatorForm,
  simulatorFormSchema,
  SIMULATOR_PRESETS,
} from '../src/components/console/EventSimulatorDialog';

async function testSimulatorDialog() {
  console.log('🧪 Iniciando testes de validação do novo EventSimulatorDialog (TanStack Form + Base UI)...');

  // 1. Validar Presets do Simulador
  console.log('1. Validando presets e templates pré-configurados...');
  assert(SIMULATOR_PRESETS.order, 'Preset de Pedido deve existir');
  assert(SIMULATOR_PRESETS.chat, 'Preset de Chat deve existir');
  assert(SIMULATOR_PRESETS.alert, 'Preset de Alerta deve existir');

  assert.strictEqual(SIMULATOR_PRESETS.order.channel, 'pedidos');
  assert.strictEqual(SIMULATOR_PRESETS.chat.channel, 'chat-geral');
  assert.strictEqual(SIMULATOR_PRESETS.alert.channel, 'alertas-sistema');

  for (const [key, preset] of Object.entries(SIMULATOR_PRESETS)) {
    const jsonStr = JSON.stringify(preset.payload);
    assert.doesNotThrow(() => JSON.parse(jsonStr), `Payload do preset ${key} deve ser JSON válido`);
  }
  console.log('✅ Presets validados com sucesso!');

  // 2. Validar Schema Zod (simulatorFormSchema)
  console.log('2. Validando schema Zod (simulatorFormSchema)...');
  const validData = {
    channel: 'pedidos',
    event: 'novo-pedido',
    socketId: '',
    payloadText: '{"id": 1042, "status": "pago"}',
  };

  const validResult = simulatorFormSchema.safeParse(validData);
  assert(validResult.success, 'Dados válidos devem passar na validação do schema');

  // Canal vazio
  const emptyChannelResult = simulatorFormSchema.safeParse({ ...validData, channel: '' });
  assert(!emptyChannelResult.success, 'Canal vazio deve falhar na validação');

  // Canal com espaços/caracteres inválidos
  const invalidChannelResult = simulatorFormSchema.safeParse({ ...validData, channel: 'meu canal teste' });
  assert(!invalidChannelResult.success, 'Canal com espaço deve falhar na validação');

  // Evento vazio
  const emptyEventResult = simulatorFormSchema.safeParse({ ...validData, event: '' });
  assert(!emptyEventResult.success, 'Evento vazio deve falhar na validação');

  // Payload JSON corrompido
  const invalidJsonResult = simulatorFormSchema.safeParse({ ...validData, payloadText: '{invalid:json' });
  assert(!invalidJsonResult.success, 'Payload com JSON sintaticamente inválido deve falhar');
  console.log('✅ Schema Zod validado em todos os cenários!');

  // 3. Validar instanciação do Dialog
  console.log('3. Validando instanciação do EventSimulatorDialog...');
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
        React.createElement(EventSimulatorDialog, {
          open: false,
          onOpenChange: () => {},
        })
      )
    )
  );
  assert.strictEqual(typeof dialogMarkup, 'string', 'EventSimulatorDialog deve instanciar sem erros');
  console.log('✅ EventSimulatorDialog instanciado com sucesso!');

  // 4. Validar renderização e estrutura DOM do EventSimulatorForm
  console.log('4. Validando renderização e estrutura DOM do EventSimulatorForm...');
  const formMarkup = renderToStaticMarkup(
    React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(
        I18nProvider,
        null,
        React.createElement(EventSimulatorForm, {
          onClose: () => {},
          initialChannel: 'pedidos',
          initialEvent: 'novo-pedido',
        })
      )
    )
  );

  // Verificação de formulário estruturado e rolagem interna
  assert(
    formMarkup.includes('id="event-simulator-form"'),
    'Deve conter o formulário estruturado id event-simulator-form'
  );
  assert(
    formMarkup.includes('overflow-y-auto'),
    'Deve conter a área de rolagem independente (overflow-y-auto)'
  );
  assert(
    formMarkup.includes('data-slot="dialog-footer"'),
    'Deve conter o rodapé fixo DialogFooter'
  );

  // Verificação dos primitivos Field
  assert(
    formMarkup.includes('data-slot="field"'),
    'Deve utilizar os primitivos de formulário Field'
  );
  assert(
    formMarkup.includes('data-slot="field-label"'),
    'Deve utilizar FieldLabel'
  );
  assert(
    formMarkup.includes('data-slot="fieldset"'),
    'Deve utilizar FieldSet'
  );
  assert(
    formMarkup.includes('data-slot="field-legend"'),
    'Deve utilizar FieldLegend'
  );

  // Verificação dos Templates / Presets
  assert(
    formMarkup.includes('role="radiogroup"'),
    'Templates devem estar agrupados em radiogroup'
  );
  assert(
    formMarkup.includes('E-commerce: Novo Pedido'),
    'Deve listar template E-commerce'
  );
  assert(
    formMarkup.includes('Chat: Nova Mensagem'),
    'Deve listar template Chat'
  );
  assert(
    formMarkup.includes('Sistema: Alerta de Notificação') || formMarkup.includes('Sistema: Alerta de Notifica'),
    'Deve listar template Sistema'
  );

  // Verificação de inputs
  assert(
    formMarkup.includes('sim-channel-input'),
    'Input de canal deve estar presente'
  );
  assert(
    formMarkup.includes('sim-event-input'),
    'Input de evento deve estar presente'
  );
  assert(
    formMarkup.includes('sim-payload-textarea'),
    'Textarea de payload deve estar presente'
  );

  // Verificação do botão de formatação de JSON
  assert(
    formMarkup.includes('Formatar JSON'),
    'Botão de formatação de JSON deve estar presente'
  );

  // Verificação de padronização de tamanhos: ausência de modificadores arbitrários
  assert(
    !formMarkup.includes('size="xs"'),
    'Não deve conter variantes size="xs"'
  );
  assert(
    !formMarkup.includes('h-6 px-1.5 text-xs'),
    'Não deve conter botões comprimidos (h-6)'
  );

  console.log('✅ Estrutura DOM e layout do EventSimulatorForm validados com 100% de conformidade!');

  console.log('\n🎉 TODOS OS TESTES DO EVENT SIMULATOR DIALOG PASSARAM COM SUCESSO!');
}

testSimulatorDialog()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Falha nos testes do EventSimulatorDialog:', err);
    process.exit(1);
  });
