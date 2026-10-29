# Contribuindo com o Cloudflare Realtime

Obrigado pelo interesse em contribuir! Este projeto é 100% open-source e construído para ajudar desenvolvedores a terem WebSockets sem custos exorbitantes de infraestrutura.

---

## 🛠️ Ambiente de Desenvolvimento Local

### Pré-requisitos
- **Node.js**: v20 ou superior (recomendado v22+)
- **npm**: v9 ou superior

### Passos para rodar localmente

1. Faça um fork do repositório e clone:
   ```bash
   git clone https://github.com/seu-usuario/cloudflare-realtime.git
   cd cloudflare-realtime
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Inicie o emulador da Cloudflare (Workers + Durable Objects):
   ```bash
   npm run dev
   ```

4. Abra [`examples/frontend-client/index.html`](examples/frontend-client/index.html) no navegador para testar a comunicação WebSocket em tempo real.

---

## 🧪 Testes e Checagem de Tipos

Antes de abrir um Pull Request, certifique-se de que todos os testes e a checagem de tipos do TypeScript passam sem nenhum erro:

```bash
# Executa a checagem de tipos do TypeScript
npm run typecheck

# Executa os testes automatizados
npm test
```

---

## 💡 Sugestões e Relato de Bugs

- Para relatar problemas ou bugs, abra uma [Issue no GitHub](https://github.com/seu-usuario/cloudflare-realtime/issues).
- Para novas funcionalidades, discuta previamente via Issues antes de enviar grandes PRs.
