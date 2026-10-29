import type { AppStats } from '../types';

export interface AuthStatusResponse {
  authenticated: boolean;
  error?: string;
}

export interface TriggerPayload {
  channel: string;
  event: string;
  data: any;
  socket_id?: string;
}

export interface TriggerResponse {
  success: boolean;
  delivered_to: number;
  channel?: string;
  event?: string;
  error?: string;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

const API_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env
    ? (import.meta.env.VITE_API_BASE_URL as string | undefined)
    : '') || '';

/**
 * 1. Verifica se já existe sessão ativa via Cookie HttpOnly (Sim ou Não)
 * Nenhuma informação sobre tokens, keys ou IDs transita para o cliente
 */
export async function fetchAuthMe(): Promise<AuthStatusResponse> {
  const res = await fetch(`${API_BASE}/api/v1/auth/me`, {
    credentials: 'include',
  });

  if (!res.ok) {
    if (res.status === 401) {
      return { authenticated: false };
    }
    throw new ApiError('Falha ao verificar autenticação.', res.status);
  }

  return res.json();
}

/**
 * 2. Autentica a aplicação via Passkey estabelecendo o Cookie HttpOnly seguro
 * O servidor responde unicamente com { authenticated: true }
 */
export async function loginAuth(passkey: string): Promise<AuthStatusResponse> {
  const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ passkey: passkey.trim() }),
  });

  const data = await res.json().catch(() => ({ authenticated: false }));
  if (!res.ok || !data.authenticated) {
    throw new ApiError(
      data.error || 'Passkey inválida. Verifique sua chave de acesso.',
      res.status
    );
  }

  return { authenticated: true };
}

/**
 * 3. Encerra a sessão removendo o Cookie HttpOnly
 */
export async function logoutAuth(): Promise<AuthStatusResponse> {
  const res = await fetch(`${API_BASE}/api/v1/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  });

  if (!res.ok) {
    throw new ApiError('Falha ao encerrar sessão.', res.status);
  }

  return res.json();
}

/**
 * 4. Obtém as métricas agregadas da aplicação e canais ativos
 */
export async function fetchStats(): Promise<AppStats> {
  const res = await fetch(`${API_BASE}/api/v1/stats`, {
    credentials: 'include',
  });

  if (!res.ok) {
    throw new ApiError('Falha ao buscar estatísticas da aplicação.', res.status);
  }

  return res.json();
}

/**
 * 5. Dispara um evento para canais específicos
 */
export async function triggerEvent(payload: TriggerPayload): Promise<TriggerResponse> {
  const res = await fetch(`${API_BASE}/api/v1/trigger`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new ApiError(data.error || 'Falha ao disparar evento.', res.status);
  }

  return data;
}

/**
 * 6. Registra / Cria um novo canal no Durable Object SQLite com regras e TTL
 */
export async function createChannelApi(
  payload: import('../types').CreateChannelPayload
): Promise<{ success: boolean; channel: any }> {
  const res = await fetch(`${API_BASE}/api/v1/channels`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new ApiError(data.error || 'Falha ao registrar canal.', res.status);
  }

  return data;
}

/**
 * 7. Exclui um canal registrado do Durable Object SQLite
 */
export async function deleteChannelApi(channelName: string): Promise<boolean> {
  const res = await fetch(
    `${API_BASE}/api/v1/channels/${encodeURIComponent(channelName)}`,
    {
      method: 'DELETE',
      credentials: 'include',
    }
  );

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new ApiError(data.error || 'Falha ao excluir canal.', res.status);
  }

  return true;
}

/**
 * 8. Busca a lista completa de canais (registrados + ativos) do Durable Object
 */
export async function fetchChannelsApi(): Promise<Record<string, any>> {
  const res = await fetch(`${API_BASE}/api/v1/channels`, {
    credentials: 'include',
  });

  if (!res.ok) {
    throw new ApiError('Falha ao buscar lista de canais.', res.status);
  }

  const data = await res.json();
  return data.channels || {};
}
