import type { AppStats } from '../types';

export interface AuthMeResponse {
  authenticated: boolean;
  app?: {
    id: string;
    key: string;
  };
}

export interface LoginResponse {
  success: boolean;
  authenticated: boolean;
  app?: {
    id: string;
    key: string;
  };
  error?: string;
}

export interface LogoutResponse {
  success: boolean;
  authenticated: boolean;
  message?: string;
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

/**
 * 1. Verifica se já existe sessão ativa via Cookie HttpOnly
 */
export async function fetchAuthMe(): Promise<AuthMeResponse> {
  const res = await fetch('/api/v1/auth/me', {
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
 * 2. Autentica a aplicação via Secret Key estabelecendo o Cookie HttpOnly
 */
export async function loginAuth(secret: string): Promise<LoginResponse> {
  const res = await fetch('/api/v1/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ secret: secret.trim() }),
  });

  const data = await res.json();
  if (!res.ok || !data.authenticated) {
    throw new ApiError(
      data.error || 'Credenciais inválidas. Verifique a Secret Key.',
      res.status
    );
  }

  return data;
}

/**
 * 3. Encerra a sessão removendo o Cookie HttpOnly
 */
export async function logoutAuth(): Promise<LogoutResponse> {
  const res = await fetch('/api/v1/auth/logout', {
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
  const res = await fetch('/api/v1/stats', {
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
  const res = await fetch('/api/v1/trigger', {
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
