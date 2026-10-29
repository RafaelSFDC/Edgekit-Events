import assert from 'node:assert';
import { queryKeys } from '../web/src/hooks/api/query-keys';
import { defaultListQueryOptions, defaultDetailQueryOptions } from '../web/src/hooks/api/query-defaults';
import { getQueryClient, cacheUtils } from '../web/src/lib/query-client';
import { ApiError } from '../web/src/services/api';

async function testQueryArchitecture() {
  console.log('🧪 Iniciando testes de validação da infraestrutura TanStack Query...');

  // 1. Validar QueryKeys
  console.log('Testing queryKeys factory...');
  assert.deepStrictEqual(queryKeys.auth.all, ['auth']);
  assert.deepStrictEqual(queryKeys.auth.me(), ['auth', 'me']);
  assert.deepStrictEqual(queryKeys.stats.all, ['stats']);
  assert.deepStrictEqual(queryKeys.stats.detail(), ['stats', 'detail']);
  assert.deepStrictEqual(queryKeys.channels.all, ['channels']);
  assert.deepStrictEqual(queryKeys.channels.lists(), ['channels', 'list']);
  assert.deepStrictEqual(queryKeys.channels.detail('orders'), ['channels', 'detail', 'orders']);
  console.log('✅ queryKeys estruturadas e validadas com sucesso!');

  // 2. Validar Query Defaults
  console.log('Testing default query options...');
  assert.strictEqual(defaultListQueryOptions.staleTime, 30000);
  assert.strictEqual(defaultListQueryOptions.retry, false);
  assert.strictEqual(defaultDetailQueryOptions.staleTime, 30000);
  assert.strictEqual(defaultDetailQueryOptions.refetchOnWindowFocus, false);
  console.log('✅ defaultListQueryOptions e defaultDetailQueryOptions validados!');

  // 3. Validar QueryClient Singleton e cacheUtils
  console.log('Testing QueryClient singleton and cacheUtils...');
  const client1 = getQueryClient();
  const client2 = getQueryClient();
  assert.strictEqual(client1, client2, 'QueryClient deve ser um singleton');

  // Testar manipulação de cache com cacheUtils
  const testKey = ['test-entity', 'detail', '1'] as const;
  const testData = { name: 'Edgekit Events', status: 'online' };
  cacheUtils.setQueryData(testKey, testData);

  const cachedData = cacheUtils.getQueryData<typeof testData>(testKey);
  assert.deepStrictEqual(cachedData, testData, 'Dados do cache devem coincidir');

  cacheUtils.removeQuery(testKey);
  const clearedData = cacheUtils.getQueryData(testKey);
  assert.strictEqual(clearedData, undefined, 'Query deve ter sido removida do cache');

  cacheUtils.clearAll();
  console.log('✅ QueryClient singleton e cacheUtils validados com 100% de sucesso!');

  // 4. Validar ApiError
  console.log('Testing ApiError...');
  const err = new ApiError('Não autorizado', 401);
  assert.strictEqual(err.message, 'Não autorizado');
  assert.strictEqual(err.status, 401);
  assert.strictEqual(err.name, 'ApiError');
  console.log('✅ ApiError validado com sucesso!');

  console.log('🎉 TODOS OS TESTES DO TANSTACK QUERY PASSARAM COM SUCESSO!\n');
}

testQueryArchitecture().catch((err) => {
  console.error('❌ Falha nos testes do TanStack Query:', err);
  process.exit(1);
});
