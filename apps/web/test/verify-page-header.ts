import assert from 'node:assert';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  PageHeader,
  PageHeaderTitle,
  PageHeaderDescription,
  PageHeaderActions,
} from '../src/components/ui/page-header';

async function testPageHeader() {
  console.log('🧪 Iniciando testes de validação do componente PageHeader...');

  // 1. Título e subtítulo simples
  const html1 = renderToStaticMarkup(
    React.createElement(PageHeader, {
      title: 'Console ao Vivo',
      subtitle: 'Stream WebSocket de eventos em tempo real',
    })
  );
  assert(html1.includes('Console ao Vivo'), 'Deve renderizar o título');
  assert(html1.includes('Stream WebSocket de eventos em tempo real'), 'Deve renderizar o subtítulo');
  assert(!html1.includes('shrink-0'), 'Não deve ter container de ações quando não houver botões');
  console.log('✅ Renderização de título e subtítulo validada!');

  // 2. Suporte a description como alias de subtitle
  const html2 = renderToStaticMarkup(
    React.createElement(PageHeader, {
      title: 'Visão Geral',
      description: 'Painel de métricas',
    })
  );
  assert(html2.includes('Painel de métricas'), 'Deve suportar description');
  console.log('✅ Suporte a description como alias validado!');

  // 3. Ações via children
  const html3 = renderToStaticMarkup(
    React.createElement(
      PageHeader,
      {
        title: 'Canais',
        subtitle: 'Lista de canais',
      },
      React.createElement('button', { type: 'button' }, 'Novo Canal')
    )
  );
  assert(html3.includes('Novo Canal'), 'Deve renderizar botões passados via children');
  assert(html3.includes('shrink-0'), 'Deve conter container de ações à direita');
  console.log('✅ Renderização de botões de ação via children validada!');

  // 4. Ações via prop actions
  const html4 = renderToStaticMarkup(
    React.createElement(PageHeader, {
      title: 'Simulador',
      subtitle: 'Disparo de eventos',
      actions: React.createElement('button', { type: 'button' }, 'Enviar'),
    })
  );
  assert(html4.includes('Enviar'), 'Deve renderizar botão passado via prop actions');
  assert(html4.includes('shrink-0'), 'Deve conter container de ações à direita');
  console.log('✅ Renderização de ações via prop actions validada!');

  // 5. Subcomponentes exportados
  const htmlSub = renderToStaticMarkup(
    React.createElement(
      'div',
      null,
      React.createElement(PageHeaderTitle, null, 'Custom Title'),
      React.createElement(PageHeaderDescription, null, 'Custom Desc'),
      React.createElement(PageHeaderActions, null, React.createElement('button', null, 'Click'))
    )
  );
  assert(htmlSub.includes('Custom Title'), 'Subcomponente PageHeaderTitle ok');
  assert(htmlSub.includes('Custom Desc'), 'Subcomponente PageHeaderDescription ok');
  assert(htmlSub.includes('Click'), 'Subcomponente PageHeaderActions ok');
  console.log('✅ Subcomponentes (PageHeaderTitle, PageHeaderDescription, PageHeaderActions) validados!');

  console.log('🎉 TODOS OS TESTES DO PAGEHEADER PASSARAM COM 100% DE SUCESSO!');
}

testPageHeader();
