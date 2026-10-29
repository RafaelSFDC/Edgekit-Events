import assert from 'node:assert';
import { queryKeys } from '../src/hooks/api/query-keys';
import { getQueryClient } from '../src/lib/query-client';
import { debugSocketManager } from '../src/services/debug-socket';
import { useStatsQuery } from '../src/hooks/api/use-stats';
import type { DebugEvent } from '../src/types';

// Mock global WebSocket for Node test environment
class MockClientWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  static instances: MockClientWebSocket[] = [];
  public sent: string[] = [];
  public readyState = 0; // CONNECTING
  public onopen: (() => void) | null = null;
  public onmessage: ((event: { data: string }) => void) | null = null;
  public onerror: ((error: any) => void) | null = null;
  public onclose: (() => void) | null = null;

  constructor(public url: string) {
    MockClientWebSocket.instances.push(this);
    // Simulate async connection open
    setTimeout(() => {
      this.readyState = 1; // OPEN
      this.onopen?.();
    }, 10);
  }

  send(data: string) {
    this.sent.push(data);
  }

  close() {
    this.readyState = 3; // CLOSED
    this.onclose?.();
  }
}

// Attach mock WebSocket and window to globalThis
(globalThis as any).WebSocket = MockClientWebSocket;
(globalThis as any).window = {
  location: { protocol: 'https:', host: 'localhost:8787' },
};

async function testRealtimeTanStackQuery() {
  console.log('🧪 Iniciando testes de validação do Realtime com TanStack Query...');

  // 1. Validar QueryKeys para Events
  console.log('1. Validando queryKeys.events...');
  assert.deepStrictEqual(queryKeys.events.all, ['events']);
  console.log('✅ queryKeys.events.all validado com sucesso!');

  // 2. Validar TanStack Query como Single Source of Truth
  console.log('2. Validando integridade do cache TanStack Query para Eventos...');
  const queryClient = getQueryClient();

  const event1: DebugEvent = {
    id: 'ev-1',
    type: 'event_triggered',
    channel: 'pedidos',
    event: 'novo-pedido',
    data: { pedido_id: 1042, total: 249.9 },
    timestamp: Date.now(),
  };

  queryClient.setQueryData<DebugEvent[]>(queryKeys.events.all, [event1]);
  let cached = queryClient.getQueryData<DebugEvent[]>(queryKeys.events.all);
  assert.strictEqual(cached?.length, 1);
  assert.strictEqual(cached[0].id, 'ev-1');
  assert.strictEqual(cached[0].channel, 'pedidos');

  // Adicionar novo evento no início do array (imutável)
  const event2: DebugEvent = {
    id: 'ev-2',
    type: 'client_connected',
    socket_id: '123.456',
    timestamp: Date.now(),
  };
  queryClient.setQueryData<DebugEvent[]>(queryKeys.events.all, (prev = []) => [event2, ...prev]);

  cached = queryClient.getQueryData<DebugEvent[]>(queryKeys.events.all);
  assert.strictEqual(cached?.length, 2);
  assert.strictEqual(cached[0].id, 'ev-2');
  assert.strictEqual(cached[1].id, 'ev-1');

  // Limpeza de cache no TanStack Query
  queryClient.setQueryData<DebugEvent[]>(queryKeys.events.all, []);
  cached = queryClient.getQueryData<DebugEvent[]>(queryKeys.events.all);
  assert.strictEqual(cached?.length, 0);
  console.log('✅ TanStack Query manipula e atualiza eventos sem qualquer duplicação de estado!');

  // 3. Testar debugSocketManager (Singleton & Prevenção de Múltiplas Iniciações)
  console.log('3. Validando DebugSocketManager e prevenção de múltiplas conexões...');
  MockClientWebSocket.instances = [];

  // Iniciar primeira conexão
  debugSocketManager.connect();
  assert.strictEqual(MockClientWebSocket.instances.length, 1, 'Primeira conexão criada');

  // Tentar conectar novamente enquanto conectando/conectado (não deve duplicar!)
  debugSocketManager.connect();
  assert.strictEqual(
    MockClientWebSocket.instances.length,
    1,
    'Não deve criar conexão duplicada! Protegido contra múltiplas iniciações'
  );

  // Aguardar conexão abrir
  await new Promise((r) => setTimeout(r, 20));
  assert.strictEqual(debugSocketManager.getStatus(), 'connected');

  // Tentar conectar de novo com socket já OPEN
  debugSocketManager.connect();
  assert.strictEqual(
    MockClientWebSocket.instances.length,
    1,
    'Mesmo conectado, garante socket único'
  );
  console.log('✅ Prevenção contra múltiplas iniciações validada!');

  // 4. Testar Ingestão de Frames WebSocket direto para o Cache TanStack Query
  console.log('4. Testando ingestão de eventos do WebSocket diretamente no TanStack Query...');
  const currentSocket = MockClientWebSocket.instances[0];

  // Simular recebimento de frame de evento disparado
  currentSocket.onmessage?.({
    data: JSON.stringify({
      type: 'event_triggered',
      channel: 'pedidos',
      event: 'novo-pedido',
      data: { pedido_id: 888 },
      delivered_to: 1,
      timestamp: Date.now(),
    }),
  });

  const updatedEvents = queryClient.getQueryData<DebugEvent[]>(queryKeys.events.all);
  assert.strictEqual(updatedEvents?.length, 1, 'Evento recebido deve estar no cache TanStack Query');
  assert.strictEqual(updatedEvents?.[0].channel, 'pedidos');
  assert.strictEqual(updatedEvents?.[0].event, 'novo-pedido');
  console.log('✅ Evento recebido via WebSocket inserido diretamente no cache TanStack Query!');

  // 5. Testar Modo Pausa
  console.log('5. Testando modo Pausa do Debug Console...');
  debugSocketManager.setPaused(true);
  currentSocket.onmessage?.({
    data: JSON.stringify({
      type: 'event_triggered',
      channel: 'chat',
      event: 'msg',
      data: 'dropped when paused',
      timestamp: Date.now(),
    }),
  });

  const eventsAfterPause = queryClient.getQueryData<DebugEvent[]>(queryKeys.events.all);
  assert.strictEqual(eventsAfterPause?.length, 1, 'Evento não deve ser adicionado durante pausa');
  debugSocketManager.setPaused(false);
  console.log('✅ Modo Pausa funcionando corretamente!');

  // 6. Testar desconexão limpa
  console.log('6. Testando desconexão limpa...');
  debugSocketManager.disconnect();
  assert.strictEqual(debugSocketManager.getStatus(), 'disconnected');
  console.log('✅ Desconexão limpa e reset de estado validados!');

  console.log('\n🎉 TODOS OS TESTES DE REALTIME E TANSTACK QUERY PASSARAM COM SUCESSO!\n');
  process.exit(0);
}

testRealtimeTanStackQuery().catch((err) => {
  console.error('❌ Falha nos testes de realtime query:', err);
  process.exit(1);
});
