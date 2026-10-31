import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log('🧪 Iniciando testes de validação do SnippetGenerator...');

const snippetComponentPath = fs.existsSync(path.resolve('src/components/SnippetGenerator.tsx'))
  ? path.resolve('src/components/SnippetGenerator.tsx')
  : path.resolve('apps/web/src/components/SnippetGenerator.tsx');
const snippetFile = fs.readFileSync(snippetComponentPath, 'utf8');

// 1. Validar que Card, Separator e FolderCode foram removidos
console.log('1. Validando ausência de componentes redundantes (Card, Separator, FolderCode)...');
assert.ok(!snippetFile.includes('@/components/ui/card'), 'Não deve importar @/components/ui/card');
assert.ok(!snippetFile.includes('CardHeader'), 'Não deve conter CardHeader');
assert.ok(!snippetFile.includes('CardTitle'), 'Não deve conter CardTitle');
assert.ok(!snippetFile.includes('CardDescription'), 'Não deve conter CardDescription');
assert.ok(!snippetFile.includes('CardContent'), 'Não deve conter CardContent');
assert.ok(!snippetFile.includes('@/components/ui/separator'), 'Não deve importar @/components/ui/separator');
assert.ok(!snippetFile.includes('FolderCode'), 'Não deve importar ou renderizar FolderCode');
assert.ok(!snippetFile.includes('t.snippets.viewAllSnippets'), 'Não deve referenciar viewAllSnippets');
assert.ok(!snippetFile.includes('snippets/'), 'Não deve exibir rodapé estático de snippets/');
console.log('✅ Componentes redundantes e duplicados foram removidos com sucesso!');

// 2. Validar que Tabs, TabsList, TabsTrigger e ScrollArea estão presentes e organizados
console.log('2. Validando estrutura moderna com Tabs e ScrollArea...');
assert.ok(snippetFile.includes('TabsList'), 'Deve conter TabsList');
assert.ok(snippetFile.includes('TabsTrigger'), 'Deve conter TabsTrigger');
assert.ok(snippetFile.includes('TabsContent'), 'Deve conter TabsContent');
assert.ok(snippetFile.includes('ScrollArea'), 'Deve conter ScrollArea');
assert.ok(snippetFile.includes('copyToClipboard'), 'Deve manter a funcionalidade de cópia');
assert.ok(snippetFile.includes('w-full space-y-4'), 'Deve aplicar espaçamento consistente no Tabs');
console.log('✅ Estrutura limpa de Tabs e ScrollArea validada!');

console.log('\n🎉 TODOS OS TESTES DO SNIPPET GENERATOR PASSARAM COM 100% DE SUCESSO!');
process.exit(0);
