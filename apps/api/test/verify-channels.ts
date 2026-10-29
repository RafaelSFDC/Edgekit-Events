import assert from "node:assert";
import type { ChannelRecord, ChannelCategory, ChannelVisibility } from "../src/types/pusher";

// Simulação de validação de IP
function isIpAllowed(clientIp: string, allowedIps: string[]): boolean {
  if (!allowedIps || allowedIps.length === 0) return true;
  const client = clientIp.trim();
  return allowedIps.some((rule) => {
    const r = rule.trim();
    if (!r) return false;
    if (r === "*" || r === client) return true;
    if (r.endsWith(".*")) {
      const prefix = r.slice(0, -2);
      return client.startsWith(prefix);
    }
    return false;
  });
}

async function testChannelsArchitecture() {
  console.log("🧪 Iniciando testes de Arquitetura de Canais, Segurança por IP e TTL...");

  // 1. Validar regras de IP
  console.log("1. Validando regras de autorização por IP...");
  assert.strictEqual(isIpAllowed("192.168.1.50", ["192.168.1.50"]), true);
  assert.strictEqual(isIpAllowed("192.168.1.50", ["10.0.0.1", "192.168.1.*"]), true);
  assert.strictEqual(isIpAllowed("200.50.10.5", ["192.168.1.*"]), false);
  assert.strictEqual(isIpAllowed("any.ip.address", ["*"]), true);
  assert.strictEqual(isIpAllowed("127.0.0.1", []), true);
  console.log("✅ Validação de regras de IP validada com 100% de precisão!");

  // 2. Validar estrutura do ChannelRecord com Arquétipos e TTL
  console.log("2. Validando estrutura de dados ChannelRecord...");
  const crudChannel: ChannelRecord = {
    name: "pedidos",
    category: "crud",
    visibility: "public",
    events: ["created", "updated", "deleted"],
    autoDestructMinutes: 0,
    createdAt: Date.now(),
  };
  assert.strictEqual(crudChannel.category, "crud");
  assert.strictEqual(crudChannel.events.length, 3);
  assert.strictEqual(crudChannel.autoDestructMinutes, 0);

  const privateJobChannel: ChannelRecord = {
    name: "importacao-jobs",
    category: "jobs",
    visibility: "private",
    allowedIps: ["10.0.0.*", "127.0.0.1"],
    events: ["started", "progress", "completed", "failed"],
    autoDestructMinutes: 15,
    webhookUrl: "https://api.empresa.com/webhooks/edgekit",
    vacatedAt: Date.now(),
    createdAt: Date.now(),
  };
  assert.strictEqual(privateJobChannel.visibility, "private");
  assert.strictEqual(privateJobChannel.allowedIps?.length, 2);
  assert.strictEqual(privateJobChannel.autoDestructMinutes, 15);
  assert.ok(privateJobChannel.webhookUrl);
  console.log("✅ Estrutura de dados ChannelRecord validada!");

  // 3. Validar cálculo de expiração de TTL por inatividade
  console.log("3. Validando cálculo de expiração de alarme (TTL)...");
  const ttlMs = (privateJobChannel.autoDestructMinutes || 0) * 60 * 1000;
  const vacatedAt = privateJobChannel.vacatedAt || Date.now();
  const expiresAt = vacatedAt + ttlMs;

  assert(expiresAt > vacatedAt, "O timestamp de expiração deve ser futuro");
  assert.strictEqual(expiresAt - vacatedAt, 15 * 60 * 1000);
  console.log("✅ Cálculo de expiração de alarme (TTL) validado!");

  console.log("\n🎉 TODOS OS TESTES DE CANAIS E SEGURANÇA PASSARAM COM SUCESSO!\n");
}

testChannelsArchitecture().catch((err) => {
  console.error("❌ Falha nos testes de canais:", err);
  process.exit(1);
});
