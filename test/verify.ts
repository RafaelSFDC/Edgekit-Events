import assert from "node:assert";
import { md5, hmacSha256Hex, constantTimeEquals, generateSocketId } from "../src/services/crypto";
import { verifyPusherHttpSignature, verifyChannelAuth, verifySimpleBearerAuth } from "../src/services/auth";

async function runTests() {
  console.log("🚀 Iniciando testes de validação dos serviços...");

  // 1. Teste MD5
  console.log("Testing MD5...");
  assert.strictEqual(md5(""), "d41d8cd98f00b204e9800998ecf8427e");
  assert.strictEqual(md5("hello world"), "5eb63bbbe01eeed093cb22bb8f5acdc3");
  assert.strictEqual(md5('{"name":"test","data":"abc"}'), "ee6017de608a4925d35ca6d73dd04793");
  console.log("✅ MD5 validado!");

  // 2. Teste HMAC-SHA256
  console.log("Testing HMAC-SHA256...");
  const sig = await hmacSha256Hex("my-secret", "hello world");
  assert.strictEqual(typeof sig, "string");
  assert.strictEqual(sig.length, 64);
  console.log("✅ HMAC-SHA256 validado!");

  // 3. Teste Socket ID Generator
  console.log("Testing Socket ID format...");
  const socketId = generateSocketId();
  assert.match(socketId, /^\d+\.\d+$/);
  console.log(`✅ Socket ID válido: ${socketId}`);

  // 4. Teste Auth de Canal Privado e Presença
  console.log("Testing Channel Auth...");
  const app = { id: "app-default", key: "key-default", secret: "secret-default" };
  
  // Assinatura privada esperada: sha256(secret, socket_id:channel)
  const privateSig = await hmacSha256Hex(app.secret, `${socketId}:private-chat`);
  const validPrivate = await verifyChannelAuth(
    app,
    socketId,
    "private-chat",
    `${app.key}:${privateSig}`
  );
  assert.strictEqual(validPrivate, true);

  const invalidPrivate = await verifyChannelAuth(
    app,
    socketId,
    "private-chat",
    `${app.key}:invalid-signature`
  );
  assert.strictEqual(invalidPrivate, false);
  console.log("✅ Auth de Canal Privado validada!");

  // Teste Presença: sha256(secret, socket_id:channel:channel_data)
  const channelData = JSON.stringify({ user_id: "user_123", user_info: { name: "Test" } });
  const presenceSig = await hmacSha256Hex(app.secret, `${socketId}:presence-room:${channelData}`);
  const validPresence = await verifyChannelAuth(
    app,
    socketId,
    "presence-room",
    `${app.key}:${presenceSig}`,
    channelData
  );
  assert.strictEqual(validPresence, true);
  console.log("✅ Auth de Canal Presença validada!");

  // 5. Teste Pusher REST HTTP Signature
  console.log("Testing Pusher REST HTTP Signature...");
  const body = JSON.stringify({ name: "my-event", channel: "my-channel", data: "test" });
  const bodyMd5 = md5(body);
  const timestamp = Math.floor(Date.now() / 1000).toString();

  const queryParams = new URLSearchParams();
  queryParams.set("auth_key", app.key);
  queryParams.set("auth_timestamp", timestamp);
  queryParams.set("auth_version", "1.0");
  queryParams.set("body_md5", bodyMd5);

  const sortedKeys = Array.from(queryParams.keys()).sort();
  const sortedQuery = sortedKeys.map(k => `${k}=${queryParams.get(k)}`).join("&");
  const stringToSign = `POST\n/apps/${app.id}/events\n${sortedQuery}`;
  const validHttpSig = await hmacSha256Hex(app.secret, stringToSign);

  queryParams.set("auth_signature", validHttpSig);

  const httpCheck = await verifyPusherHttpSignature(
    app,
    "POST",
    `/apps/${app.id}/events`,
    queryParams,
    body
  );
  assert.strictEqual(httpCheck.valid, true);
  console.log("✅ Pusher REST Signature validada com sucesso!");

  // 6. Teste Simple Bearer Auth
  console.log("Testing Simple Bearer Auth...");
  assert.strictEqual(verifySimpleBearerAuth(app, `Bearer ${app.secret}`), true);
  assert.strictEqual(verifySimpleBearerAuth(app, null, app.secret), true);
  assert.strictEqual(verifySimpleBearerAuth(app, "Bearer wrong-secret"), false);
  console.log("✅ Simple Bearer Auth validada!");

  console.log("\n🎉 TODOS OS TESTES PASSARAM COM SUCESSO!");
}

runTests().catch((err) => {
  console.error("❌ Testes falharam:", err);
  process.exit(1);
});
