import React, { useState } from 'react';
import { Send, Sparkles, CheckCircle2, AlertTriangle, Key, Code } from 'lucide-react';
import { useI18n } from '../i18n/context';
import { useTriggerEvent } from '../hooks/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

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
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  const triggerMutation = useTriggerEvent();
  const loading = triggerMutation.isPending;

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

    setStatus(null);

    try {
      const data = await triggerMutation.mutateAsync({
        channel: channel.trim(),
        event: event.trim(),
        data: parsedPayload,
      });

      setStatus({
        type: 'success',
        message: `${t.simulator.triggerSuccess} (Entregue a ${data.delivered_to || 0} conexões)`,
      });
      onEventDispatched?.();
    } catch (err: any) {
      setStatus({
        type: 'error',
        message: err.message || t.simulator.triggerError,
      });
    }
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-6">
        <CardTitle className="text-base font-semibold text-foreground">
          {t.simulator.title}
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground mt-0.5">
          {t.simulator.subtitle}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Warning if not authenticated with HttpOnly cookie */}
        {!isAuthenticated && (
          <Alert className="bg-amber-500/10 border-amber-500/30 text-amber-400 flex items-center justify-between p-4">
            <div className="flex items-center space-x-3 text-xs">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <AlertDescription className="text-amber-300 font-medium">
                {t.simulator.needSecretWarning}
              </AlertDescription>
            </div>
            <Button
              size="sm"
              onClick={onOpenSecretModal}
              className="bg-amber-500 text-slate-950 font-semibold hover:bg-amber-400 shrink-0"
            >
              <Key className="w-3.5 h-3.5 mr-1.5" />
              <span>Conectar Agora</span>
            </Button>
          </Alert>
        )}

        {/* Preset template selector */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground flex items-center space-x-1 mr-1">
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            <span>{t.simulator.templatePreset}</span>
          </span>
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={() => handleSelectPreset('order')}
          >
            {t.simulator.presetOrder}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={() => handleSelectPreset('chat')}
          >
            {t.simulator.presetChat}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={() => handleSelectPreset('alert')}
          >
            {t.simulator.presetAlert}
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleTrigger} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="sim-channel" className="text-xs font-medium text-foreground">
                {t.simulator.channelLabel}
              </Label>
              <Input
                id="sim-channel"
                type="text"
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                placeholder={t.simulator.channelPlaceholder}
                className="font-mono text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sim-event" className="text-xs font-medium text-foreground">
                {t.simulator.eventLabel}
              </Label>
              <Input
                id="sim-event"
                type="text"
                value={event}
                onChange={(e) => setEvent(e.target.value)}
                placeholder={t.simulator.eventPlaceholder}
                className="font-mono text-xs"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="sim-payload" className="text-xs font-medium text-foreground">
                {t.simulator.payloadLabel}
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={handleFormatJson}
                className="text-[11px] text-sky-400 hover:text-sky-300"
              >
                <Code className="w-3 h-3 mr-1" />
                <span>{t.simulator.formatJson}</span>
              </Button>
            </div>
            <Textarea
              id="sim-payload"
              value={payloadText}
              onChange={(e) => setPayloadText(e.target.value)}
              rows={8}
              className="bg-zinc-950 font-mono text-xs text-emerald-400 resize-y"
              required
            />
          </div>

          {/* Status message */}
          {status && (
            <Alert
              variant={status.type === 'error' ? 'destructive' : 'default'}
              className={`p-3 text-xs flex items-center space-x-2 ${
                status.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : ''
              }`}
            >
              {status.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0" />
              )}
              <AlertDescription className="font-medium text-inherit">
                {status.message}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold"
            >
              <Send className="w-4 h-4 mr-2" />
              <span>{loading ? t.simulator.triggering : t.simulator.triggerButton}</span>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
