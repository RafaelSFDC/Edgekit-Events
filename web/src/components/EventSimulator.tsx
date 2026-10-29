import React, { useState } from 'react';
import { Send, Sparkles, CheckCircle2, AlertTriangle, Key, Code } from 'lucide-react';
import { useI18n } from '../i18n/context';

interface EventSimulatorProps {
  isAuthenticated: boolean;
  initialChannel?: string;
  onOpenSecretModal: () => void;
  onEventDispatched?: () => void;
}

const PRESETS = {
  order: {
    channel: 'pedidos',
    event: 'novo-pedido',
    payload: {
      pedido_id: 1042,
      cliente: 'Maria Silva',
      valor_total: 249.9,
      itens_count: 3,
      status: 'pago',
      criado_em: new Date().toISOString(),
    },
  },
  chat: {
    channel: 'chat-geral',
    event: 'nova-mensagem',
    payload: {
      user_id: 'usr_789',
      username: 'AlexDev',
      mensagem: 'Olá a todos! Notificação em tempo real funcionando perfeitamente via Cloudflare.',
      timestamp: Date.now(),
    },
  },
  alert: {
    channel: 'alertas-sistema',
    event: 'alerta-disparado',
    payload: {
      nivel: 'aviso',
      titulo: 'Backup Concluído',
      detalhes: 'O backup diário de dados foi finalizado com 100% de integridade.',
      tempo_execucao_ms: 320,
    },
  },
};

export const EventSimulator: React.FC<EventSimulatorProps> = ({
  isAuthenticated,
  initialChannel = 'pedidos',
  onOpenSecretModal,
  onEventDispatched,
}) => {
  const { t } = useI18n();
  const [channel, setChannel] = useState(initialChannel);
  const [event, setEvent] = useState('novo-pedido');
  const [payloadText, setPayloadText] = useState(
    JSON.stringify(PRESETS.order.payload, null, 2)
  );
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  const handleSelectPreset = (key: keyof typeof PRESETS) => {
    const preset = PRESETS[key];
    setChannel(preset.channel);
    setEvent(preset.event);
    setPayloadText(JSON.stringify(preset.payload, null, 2));
    setStatus(null);
  };

  const handleFormatJson = () => {
    try {
      const parsed = JSON.parse(payloadText);
      setPayloadText(JSON.stringify(parsed, null, 2));
      setStatus(null);
    } catch {
      setStatus({ type: 'error', message: t.simulator.invalidJson });
    }
  };

  const handleTrigger = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!channel.trim() || !event.trim()) return;

    if (!isAuthenticated) {
      onOpenSecretModal();
      return;
    }

    let parsedPayload: any;
    try {
      parsedPayload = JSON.parse(payloadText);
    } catch {
      setStatus({ type: 'error', message: t.simulator.invalidJson });
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      // Dispara via sessão autenticada com Cookie HttpOnly automático
      const res = await fetch('/api/v1/trigger', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          channel: channel.trim(),
          event: event.trim(),
          data: parsedPayload,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setStatus({
          type: 'success',
          message: `${t.simulator.triggerSuccess} (Entregue a ${data.delivered_to || 0} conexões)`,
        });
        if (onEventDispatched) onEventDispatched();
      } else {
        setStatus({
          type: 'error',
          message: data.error || t.simulator.triggerError,
        });
      }
    } catch (err: any) {
      setStatus({
        type: 'error',
        message: err.message || t.simulator.triggerError,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
      <div className="mb-6">
        <h3 className="text-base font-semibold text-foreground">
          {t.simulator.title}
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {t.simulator.subtitle}
        </p>
      </div>

      {/* Warning if not authenticated with HttpOnly cookie */}
      {!isAuthenticated && (
        <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
          <div className="flex items-center space-x-3 text-amber-400 text-xs">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>{t.simulator.needSecretWarning}</span>
          </div>
          <button
            onClick={onOpenSecretModal}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-semibold text-xs hover:bg-amber-400 transition-colors shrink-0"
          >
            <Key className="w-3.5 h-3.5" />
            <span>Conectar Agora</span>
          </button>
        </div>
      )}

      {/* Preset template selector */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <span className="text-xs font-medium text-muted-foreground flex items-center space-x-1">
          <Sparkles className="w-3.5 h-3.5 text-sky-400" />
          <span>{t.simulator.templatePreset}</span>
        </span>
        <button
          type="button"
          onClick={() => handleSelectPreset('order')}
          className="px-2.5 py-1 rounded-md text-xs font-medium bg-secondary hover:bg-zinc-800 text-foreground border border-border transition-colors"
        >
          {t.simulator.presetOrder}
        </button>
        <button
          type="button"
          onClick={() => handleSelectPreset('chat')}
          className="px-2.5 py-1 rounded-md text-xs font-medium bg-secondary hover:bg-zinc-800 text-foreground border border-border transition-colors"
        >
          {t.simulator.presetChat}
        </button>
        <button
          type="button"
          onClick={() => handleSelectPreset('alert')}
          className="px-2.5 py-1 rounded-md text-xs font-medium bg-secondary hover:bg-zinc-800 text-foreground border border-border transition-colors"
        >
          {t.simulator.presetAlert}
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleTrigger} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              {t.simulator.channelLabel}
            </label>
            <input
              type="text"
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              placeholder={t.simulator.channelPlaceholder}
              className="w-full bg-secondary border border-border rounded-lg px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground font-mono focus:outline-none focus:ring-1 focus:ring-sky-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              {t.simulator.eventLabel}
            </label>
            <input
              type="text"
              value={event}
              onChange={(e) => setEvent(e.target.value)}
              placeholder={t.simulator.eventPlaceholder}
              className="w-full bg-secondary border border-border rounded-lg px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground font-mono focus:outline-none focus:ring-1 focus:ring-sky-500"
              required
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-foreground">
              {t.simulator.payloadLabel}
            </label>
            <button
              type="button"
              onClick={handleFormatJson}
              className="text-[11px] text-sky-400 hover:underline flex items-center space-x-1"
            >
              <Code className="w-3 h-3" />
              <span>{t.simulator.formatJson}</span>
            </button>
          </div>
          <textarea
            value={payloadText}
            onChange={(e) => setPayloadText(e.target.value)}
            rows={8}
            className="w-full bg-zinc-950 border border-border rounded-lg p-3 text-xs text-emerald-400 font-mono focus:outline-none focus:ring-1 focus:ring-sky-500 resize-y"
            required
          />
        </div>

        {/* Status message */}
        {status && (
          <div
            className={`p-3 rounded-lg border text-xs flex items-center space-x-2 ${
              status.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
            }`}
          >
            {status.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span>{status.message}</span>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center space-x-2 px-5 py-2.5 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 font-semibold rounded-lg text-xs transition-colors shadow-sm shadow-sky-500/20"
          >
            <Send className="w-4 h-4" />
            <span>{loading ? t.simulator.triggering : t.simulator.triggerButton}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
