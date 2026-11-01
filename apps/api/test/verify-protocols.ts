import assert from "node:assert";
import { verifyAblyAuth } from "../src/services/auth";
import { sseRoute } from "../src/routes/sse";
import { ablyHttpRoute } from "../src/routes/ably-http";
import { simpleApiRoute } from "../src/routes/simple-api";
import type { AppConfig, Env } from "../src/types/env";
import type { MessageRecord } from "../src/types/pusher";

async function runProtocolTests() {
  console.log("🚀 Iniciando testes de Protocolos, SSE e Ably Compatibility...");

  const app: AppConfig = {
    id: "app-default",
    key: "key-default",
    secret: "secret-default",
  };

  // 1. Teste de Autenticação Ably
  console.log("1. Validando autenticação Ably...");

  // 1.1 Basic Auth base64(key:secret)
  const basicCreds = Buffer.from(`${app.key}:${app.secret}`).toString("base64");
  assert.strictEqual(
    verifyAblyAuth(app, `Basic ${basicCreds}`),
    true,
    "Basic Auth com key:secret deve ser aceita"
  );

  // 1.2 Basic Auth base64(appId.key:secret)
  const basicCredsFull = Buffer.from(`${app.id}.${app.key}:${app.secret}`).toString("base64");
  assert.strictEqual(
    verifyAblyAuth(app, `Basic ${basicCredsFull}`),
    true,
    "Basic Auth com appId.key:secret deve ser aceita"
  );

  // 1.3 Bearer Auth
  assert.strictEqual(
    verifyAblyAuth(app, `Bearer ${app.secret}`),
    true,
    "Bearer com app.secret deve ser aceito"
  );

  // 1.4 X-Ably-Key header
  assert.strictEqual(
    verifyAblyAuth(app, null, `${app.key}:${app.secret}`),
    true,
    "Header X-Ably-Key deve ser aceito"
  );

  // 1.5 Query param ?key=
  assert.strictEqual(
    verifyAblyAuth(app, null, null, `${app.key}:${app.secret}`),
    true,
    "Query param ?key= deve ser aceito"
  );

  // 1.6 Credencial inválida
  assert.strictEqual(
    verifyAblyAuth(app, `Basic ${Buffer.from("wrong:credentials").toString("base64")}`),
    false,
    "Credencial inválida deve ser rejeitada"
  );
  console.log("✅ Autenticação Ably validada com sucesso!");

  // 2. Teste de Mock e Rota Ably HTTP
  console.log("2. Validando rotas HTTP de compatibilidade Ably...");

  let lastDoCall: { url: string; method: string; body?: any } | null = null;
  const mockStub = {
    async fetch(requestOrUrl: any, init?: any) {
      const url = typeof requestOrUrl === "string" ? requestOrUrl : requestOrUrl.url;
      const method = init?.method || requestOrUrl?.method || "GET";
      const body = init?.body ? JSON.parse(init.body) : undefined;
      lastDoCall = { url, method, body };

      if (url.includes("/history")) {
        const dummyMessages: MessageRecord[] = [
          {
            id: "msg-1",
            channel: "notificacoes",
            name: "novo-pedido",
            data: { id: 101, valor: 99.9 },
            timestamp: 1730000000000,
          },
        ];
        return Response.json({ channel: "notificacoes", messages: dummyMessages });
      }

      if (url.includes("/channels")) {
        return Response.json({ notificacoes: { user_count: 5 } });
      }

      return Response.json({ success: true });
    },
  };

  const mockEnv: Env = {
    DEFAULT_APP_ID: app.id,
    DEFAULT_APP_KEY: app.key,
    DEFAULT_APP_SECRET: app.secret,
    APP_SESSION: {
      idFromName: () => "mock-do-id" as any,
      get: () => mockStub as any,
    } as any,
  };

  // 2.1 POST /channels/:channel_id/messages (Publicar mensagem simples)
  const ablyPostReq = new Request("http://localhost/channels/pedidos/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Ably-Key": `${app.key}:${app.secret}`,
    },
    body: JSON.stringify({ name: "order.created", data: { id: 10 } }),
  });

  const ablyPostRes = await ablyHttpRoute.fetch(ablyPostReq, mockEnv);
  assert.strictEqual(ablyPostRes.status, 201);
  const ablyPostJson: any = await ablyPostRes.json();
  assert.strictEqual(ablyPostJson.channel, "pedidos");
  assert.ok(ablyPostJson.messageId);
  assert.strictEqual(lastDoCall?.method, "POST");
  assert.ok(lastDoCall?.url.includes("/broadcast"));
  console.log("✅ Ably POST /channels/:channel/messages validado!");

  // 2.2 POST /channels/:channel_id/messages com lote (batch)
  const ablyBatchReq = new Request("http://localhost/channels/pedidos/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Ably-Key": `${app.key}:${app.secret}`,
    },
    body: JSON.stringify([
      { name: "item.added", data: { item: "A" } },
      { name: "item.added", data: { item: "B" } },
    ]),
  });

  const ablyBatchRes = await ablyHttpRoute.fetch(ablyBatchReq, mockEnv);
  assert.strictEqual(ablyBatchRes.status, 201);
  const ablyBatchJson: any = await ablyBatchRes.json();
  assert.strictEqual(ablyBatchJson.published, 2);
  assert.ok(lastDoCall?.url.includes("/broadcast-batch"));
  console.log("✅ Ably POST batch de mensagens validado!");

  // 2.3 GET /channels/:channel_id/messages (History)
  const ablyHistReq = new Request("http://localhost/channels/notificacoes/messages", {
    method: "GET",
    headers: {
      "X-Ably-Key": `${app.key}:${app.secret}`,
    },
  });

  const ablyHistRes = await ablyHttpRoute.fetch(ablyHistReq, mockEnv);
  assert.strictEqual(ablyHistRes.status, 200);
  const ablyHistJson: any = await ablyHistRes.json();
  assert.strictEqual(Array.isArray(ablyHistJson), true);
  assert.strictEqual(ablyHistJson.length, 1);
  assert.strictEqual(ablyHistJson[0].name, "novo-pedido");
  console.log("✅ Ably GET /channels/:channel/messages (History) validado!");

  // 2.4 POST /keys/:key/requestToken
  const ablyTokenReq = new Request(`http://localhost/keys/${app.key}/requestToken`, {
    method: "POST",
    headers: {
      "X-Ably-Key": `${app.key}:${app.secret}`,
    },
  });
  const ablyTokenRes = await ablyHttpRoute.fetch(ablyTokenReq, mockEnv);
  assert.strictEqual(ablyTokenRes.status, 200);
  const ablyTokenJson: any = await ablyTokenRes.json();
  assert.strictEqual(ablyTokenJson.token, app.secret);
  assert.ok(ablyTokenJson.expires > Date.now());
  console.log("✅ Ably POST /keys/:key/requestToken validado!");

  // 3. Teste SSE Route
  console.log("3. Validando rota Server-Sent Events (SSE)...");

  let sseDoForwarded = false;
  const sseMockStub = {
    async fetch(req: any) {
      sseDoForwarded = true;
      const url = typeof req === "string" ? req : req.url;
      assert.ok(url.includes("/events/stream"));
      return new Response(": connected\n\n", {
        headers: { "Content-Type": "text/event-stream" },
      });
    },
  };

  const sseMockEnv: Env = {
    DEFAULT_APP_ID: app.id,
    DEFAULT_APP_KEY: app.key,
    DEFAULT_APP_SECRET: app.secret,
    APP_SESSION: {
      idFromName: () => "mock-do-id" as any,
      get: () => sseMockStub as any,
    } as any,
  };

  // 3.1 Falha sem canal
  const sseNoChanReq = new Request("http://localhost/events/stream");
  const sseNoChanRes = await sseRoute.fetch(sseNoChanReq, sseMockEnv);
  assert.strictEqual(sseNoChanRes.status, 400);

  // 3.2 Sucesso com canal público
  const sseValidReq = new Request("http://localhost/events/stream?channel=notificacoes&key=key-default");
  const sseValidRes = await sseRoute.fetch(sseValidReq, sseMockEnv);
  assert.strictEqual(sseValidRes.status, 200);
  assert.strictEqual(sseValidRes.headers.get("Content-Type"), "text/event-stream");
  assert.strictEqual(sseDoForwarded, true);
  console.log("✅ Rota SSE /events/stream validada com sucesso!");

  // 4. Teste Simple API Batch & History
  console.log("4. Validando POST /api/v1/batch e GET /api/v1/channels/:name/history...");

  // 4.1 POST /api/v1/batch
  const simpleBatchReq = new Request("http://localhost/api/v1/batch", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${app.secret}`,
    },
    body: JSON.stringify({
      batch: [
        { channel: "c1", event: "e1", data: "d1" },
        { channel: "c2", event: "e2", data: "d2" },
      ],
    }),
  });

  const simpleBatchRes = await simpleApiRoute.fetch(simpleBatchReq, mockEnv);
  assert.strictEqual(simpleBatchRes.status, 200);
  assert.ok(lastDoCall?.url.includes("/broadcast-batch"));
  console.log("✅ POST /api/v1/batch validado!");

  // 4.2 GET /api/v1/channels/:name/history
  const simpleHistReq = new Request("http://localhost/api/v1/channels/notificacoes/history", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${app.secret}`,
    },
  });

  const simpleHistRes = await simpleApiRoute.fetch(simpleHistReq, mockEnv);
  assert.strictEqual(simpleHistRes.status, 200);
  const simpleHistJson: any = await simpleHistRes.json();
  assert.strictEqual(simpleHistJson.channel, "notificacoes");
  assert.strictEqual(simpleHistJson.messages.length, 1);
  console.log("✅ GET /api/v1/channels/:name/history validado!");

  console.log("\n🎉 TODOS OS TESTES DE PROTOCOLOS, SSE E ABLY PASSARAM COM SUCESSO!");
}

runProtocolTests().catch((err) => {
  console.error("❌ Testes de protocolos falharam:", err);
  process.exit(1);
});
