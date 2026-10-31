import React, { useState, useEffect, useCallback } from 'react';
import {
  Send,
  Sparkles,
  CheckCircle2,
  Code,
  AlertTriangle,
  Radio,
  ShoppingCart,
  MessageSquare,
  BellRing,
  Loader2,
  Layers,
} from 'lucide-react';
import { toast } from 'sonner';
import { useForm } from '@tanstack/react-form';
import { z } from 'zod';
import { useI18n } from '../../i18n/context';
import { useTriggerEvent } from '../../hooks/api/use-trigger';
import { useChannelsQuery } from '../../hooks/api/use-channels';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
  FieldSet,
  FieldLegend,
} from '@/components/ui/field';

export interface EventSimulatorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialChannel?: string;
  initialEvent?: string;
}

export interface EventSimulatorFormProps {
  onClose?: () => void;
  initialChannel?: string;
  initialEvent?: string;
  className?: string;
}

export interface SimulatorPreset {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  channel: string;
  event: string;
  payload: Record<string, unknown>;
}

export const SIMULATOR_PRESETS: Record<string, SimulatorPreset> = {
  order: {
    id: 'order',
    title: 'E-commerce: Novo Pedido',
    description: 'Simula checkout finalizado com itens e status de pagamento',
    icon: ShoppingCart,
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
    id: 'chat',
    title: 'Chat: Nova Mensagem',
    description: 'Simula transmissão de mensagem em sala ou canal de conversa',
    icon: MessageSquare,
    channel: 'chat-geral',
    event: 'nova-mensagem',
    payload: {
      user_id: 'usr_789',
      username: 'AlexDev',
      mensagem: 'Olá a todos! Transmissão em tempo real EdgeKit via Cloudflare Workers.',
      timestamp: Date.now(),
    },
  },
  alert: {
    id: 'alert',
    title: 'Sistema: Alerta de Notificação',
    description: 'Simula broadcast de aviso operacional ou rotina concluída',
    icon: BellRing,
    channel: 'alertas-sistema',
    event: 'alerta-disparado',
    payload: {
      nivel: 'aviso',
      titulo: 'Backup Concluído',
      detalhes: 'O backup de dados foi sincronizado com 100% de integridade.',
      tempo_execucao_ms: 320,
    },
  },
};

export const simulatorFormSchema = z.object({
  channel: z
    .string()
    .trim()
    .min(1, 'Informe o nome do canal de destino.')
    .regex(/^[a-zA-Z0-9:_-]+$/, 'Apenas letras, números, hífen, dois-pontos e sublinhado.'),
  event: z
    .string()
    .trim()
    .min(1, 'Informe o nome do evento a ser disparado.'),
  socketId: z.string(),
  payloadText: z.string().refine(
    (val) => {
      try {
        JSON.parse(val);
        return true;
      } catch {
        return false;
      }
    },
    { message: 'O payload deve conter um JSON sintaticamente válido.' }
  ),
});

export type SimulatorFormData = z.infer<typeof simulatorFormSchema>;

export function formatSimulatorError(err: unknown): string {
  if (typeof err === 'string') return err;
  if (
    err &&
    typeof err === 'object' &&
    'message' in err &&
    typeof (err as { message: unknown }).message === 'string'
  ) {
    return (err as { message: string }).message;
  }
  return String(err || '');
}

/**
 * Componente do formulário de simulação de eventos.
 * Autônomo, com TanStack Form, validação com Zod, rolagem independente e rodapé fixo.
 */
export const EventSimulatorForm: React.FC<EventSimulatorFormProps> = ({
  onClose,
  initialChannel = 'pedidos',
  initialEvent = 'novo-pedido',
  className,
}) => {
  const { t } = useI18n();
  const triggerMutation = useTriggerEvent();
  const { data: channelsData } = useChannelsQuery();

  const [activePreset, setActivePreset] = useState<string>('order');

  const form = useForm({
    defaultValues: {
      channel: initialChannel,
      event: initialEvent,
      socketId: '',
      payloadText: JSON.stringify(SIMULATOR_PRESETS.order.payload, null, 2),
    },
    validators: {
      onChange: simulatorFormSchema,
    },
    onSubmit: async ({ value }) => {
      let parsedPayload: Record<string, unknown> = {};
      try {
        parsedPayload = JSON.parse(value.payloadText);
      } catch {
        toast.error(t.simulator.invalidJson);
        return;
      }

      triggerMutation.mutate(
        {
          channel: value.channel.trim(),
          event: value.event.trim(),
          data: parsedPayload,
          socket_id: value.socketId ? value.socketId.trim() : undefined,
        },
        {
          onSuccess: (data) => {
            const delivered = data.delivered_to ?? 0;
            toast.success(
              `Evento disparado com sucesso! Entregue a ${delivered} ${
                delivered === 1 ? 'cliente conectado' : 'clientes conectados'
              }.`
            );
          },
          onError: (err: any) => {
            toast.error(err.message || t.simulator.triggerError);
          },
        }
      );
    },
  });

  // Atualizar quando props externas mudarem
  useEffect(() => {
    if (initialChannel) {
      form.setFieldValue('channel', initialChannel);
    }
    if (initialEvent) {
      form.setFieldValue('event', initialEvent);
    }
  }, [initialChannel, initialEvent, form]);

  // Aplicar preset
  const handleSelectPreset = useCallback(
    (presetKey: string) => {
      const preset = SIMULATOR_PRESETS[presetKey];
      if (!preset) return;

      setActivePreset(presetKey);
      form.setFieldValue('channel', preset.channel);
      form.setFieldValue('event', preset.event);
      form.setFieldValue('payloadText', JSON.stringify(preset.payload, null, 2));
      triggerMutation.reset();
    },
    [form, triggerMutation]
  );

  // Formatar JSON assistido
  const handleFormatJson = useCallback(() => {
    const raw = form.getFieldValue('payloadText');
    try {
      const parsed = JSON.parse(raw);
      form.setFieldValue('payloadText', JSON.stringify(parsed, null, 2));
      toast.success('JSON formatado com sucesso!');
      triggerMutation.reset();
    } catch {
      toast.error(t.simulator.invalidJson);
    }
  }, [form, t.simulator.invalidJson, triggerMutation]);

  return (
    <form
      id="event-simulator-form"
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className={cn('flex flex-col flex-1 min-h-0 overflow-hidden', className)}
    >
      {/* Área central com rolagem independente */}
      <div className="flex-1 overflow-y-auto min-h-0 px-6 py-6 space-y-6">
        {/* 1. SELEÇÃO DE PRESETS / TEMPLATES RÁPIDOS */}
        <FieldSet className="space-y-3">
          <div className="flex items-center justify-between">
            <FieldLegend className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              <span>{t.simulator.templatePreset}</span>
            </FieldLegend>
            <span className="text-xs text-muted-foreground">
              Carregue configurações prontas com 1 clique
            </span>
          </div>

          <div
            role="radiogroup"
            aria-label={t.simulator.templatePreset}
            className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1"
          >
            {Object.values(SIMULATOR_PRESETS).map((preset) => {
              const IconComp = preset.icon;
              const isSelected = activePreset === preset.id;

              return (
                <button
                  type="button"
                  key={preset.id}
                  aria-pressed={isSelected}
                  aria-label={preset.title}
                  onClick={() => handleSelectPreset(preset.id)}
                  className={cn(
                    'flex flex-col justify-between p-3 rounded-lg border text-left transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    isSelected
                      ? 'border-primary bg-primary/5 ring-1 ring-primary shadow-xs'
                      : 'border-border/80 hover:border-border hover:bg-muted/40'
                  )}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 font-medium text-foreground">
                      <div
                        className={cn(
                          'size-7 rounded-md flex items-center justify-center shrink-0',
                          isSelected
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground'
                        )}
                      >
                        <IconComp className="size-4" />
                      </div>
                      <span className="text-xs font-semibold truncate">{preset.title}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                      {preset.description}
                    </p>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground font-mono">
                    <span className="truncate">#{preset.channel}</span>
                    <Badge variant="outline" className="text-[10px] py-0 px-1 font-mono">
                      {preset.event}
                    </Badge>
                  </div>
                </button>
              );
            })}
          </div>
        </FieldSet>

        {/* 2. CANAIS REGISTRADOS & ATIVOS (SUGESTÕES) */}
        {channelsData && Object.keys(channelsData).length > 0 && (
          <div className="rounded-lg border border-border/70 bg-muted/20 p-3 space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-foreground">
              <Layers className="size-3.5 text-primary" />
              <span>Canais e Eventos Registrados na Aplicação:</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {Object.entries(channelsData).map(([chName, chData]) => (
                <button
                  key={chName}
                  type="button"
                  onClick={() => {
                    form.setFieldValue('channel', chName);
                    if (chData.events && chData.events.length > 0) {
                      form.setFieldValue('event', chData.events[0]);
                    }
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-mono border border-border bg-background hover:bg-muted hover:border-border/80 transition-colors cursor-pointer"
                  title={`Selecionar canal ${chName}`}
                >
                  <span className="font-semibold text-primary">#{chName}</span>
                  {chData.events && chData.events.length > 0 && (
                    <span className="text-muted-foreground text-[10px]">
                      ({chData.events.length} ev)
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 3. PARÂMETROS DE DESTINO: CANAL & EVENTO */}
        <FieldSet className="space-y-4">
          <FieldLegend className="flex items-center gap-2">
            <Radio className="size-4 text-primary" />
            <span>Destino da Mensagem WebSocket</span>
          </FieldLegend>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Campo: Nome do Canal */}
            <form.Field name="channel">
              {(channelField) => {
                const hasError =
                  channelField.state.meta.isTouched &&
                  Boolean(channelField.state.meta.errors.length);

                return (
                  <Field data-invalid={hasError}>
                    <FieldLabel htmlFor="sim-channel-input">
                      {t.simulator.channelLabel} *
                    </FieldLabel>
                    <Input
                      id="sim-channel-input"
                      name={channelField.name}
                      value={channelField.state.value}
                      onBlur={channelField.handleBlur}
                      onChange={(e) => {
                        channelField.handleChange(e.target.value);
                        setActivePreset('');
                      }}
                      placeholder={t.simulator.channelPlaceholder}
                      className="font-mono"
                      aria-invalid={hasError}
                    />
                    <FieldDescription>
                      Canal onde os clientes conectados estão ouvindo.
                    </FieldDescription>
                    {hasError && (
                      <FieldError>
                        {channelField.state.meta.errors
                          .map(formatSimulatorError)
                          .filter(Boolean)
                          .join(', ')}
                      </FieldError>
                    )}
                  </Field>
                );
              }}
            </form.Field>

            {/* Campo: Nome do Evento */}
            <form.Field name="event">
              {(eventField) => {
                const hasError =
                  eventField.state.meta.isTouched &&
                  Boolean(eventField.state.meta.errors.length);

                // Verificar se o canal selecionado possui eventos configurados
                const currentChannel = form.getFieldValue('channel');
                const channelConfig = channelsData?.[currentChannel];
                const configuredEvents: string[] = channelConfig?.events || [];

                return (
                  <Field data-invalid={hasError}>
                    <FieldLabel htmlFor="sim-event-input">
                      {t.simulator.eventLabel} *
                    </FieldLabel>
                    <Input
                      id="sim-event-input"
                      name={eventField.name}
                      value={eventField.state.value}
                      onBlur={eventField.handleBlur}
                      onChange={(e) => {
                        eventField.handleChange(e.target.value);
                        setActivePreset('');
                      }}
                      placeholder={t.simulator.eventPlaceholder}
                      className="font-mono"
                      aria-invalid={hasError}
                    />

                    {/* Tags de Eventos Registrados para o canal atual */}
                    {configuredEvents.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[11px] text-muted-foreground mr-1">
                          Sugeridos no canal:
                        </span>
                        {configuredEvents.map((ev) => (
                          <button
                            key={ev}
                            type="button"
                            onClick={() => eventField.handleChange(ev)}
                            className={cn(
                              'px-2 py-0.5 rounded text-xs font-mono border transition-colors cursor-pointer',
                              eventField.state.value === ev
                                ? 'bg-primary text-primary-foreground border-primary font-semibold'
                                : 'bg-muted/60 text-foreground border-border hover:bg-muted'
                            )}
                          >
                            {ev}
                          </button>
                        ))}
                      </div>
                    )}

                    <FieldDescription>
                      Identificador de evento disparado aos clientes inscritos.
                    </FieldDescription>
                    {hasError && (
                      <FieldError>
                        {eventField.state.meta.errors
                          .map(formatSimulatorError)
                          .filter(Boolean)
                          .join(', ')}
                      </FieldError>
                    )}
                  </Field>
                );
              }}
            </form.Field>
          </div>
        </FieldSet>

        {/* 4. EDITOR DE PAYLOAD JSON */}
        <form.Field name="payloadText">
          {(payloadField) => {
            const hasError = Boolean(payloadField.state.meta.errors.length);

            return (
              <FieldSet className="space-y-3">
                <div className="flex items-center justify-between">
                  <FieldLegend className="flex items-center gap-2">
                    <Code className="size-4 text-primary" />
                    <span>{t.simulator.payloadLabel}</span>
                  </FieldLegend>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleFormatJson}
                    className="gap-1.5 text-xs text-primary"
                  >
                    <Code className="size-3.5" />
                    <span>{t.simulator.formatJson}</span>
                  </Button>
                </div>

                <Field data-invalid={hasError}>
                  <Textarea
                    id="sim-payload-textarea"
                    name={payloadField.name}
                    value={payloadField.state.value}
                    onBlur={payloadField.handleBlur}
                    onChange={(e) => {
                      payloadField.handleChange(e.target.value);
                      triggerMutation.reset();
                    }}
                    rows={8}
                    className="font-mono text-sm leading-relaxed resize-y bg-muted/20"
                    aria-invalid={hasError}
                  />

                  {hasError ? (
                    <FieldError>
                      {payloadField.state.meta.errors
                        .map(formatSimulatorError)
                        .filter(Boolean)
                        .join(', ')}
                    </FieldError>
                  ) : (
                    <FieldDescription>
                      Payload JSON válido que será recebido como argumento no callback dos clientes.
                    </FieldDescription>
                  )}
                </Field>
              </FieldSet>
            );
          }}
        </form.Field>

        {/* 5. FEEDBACK DE DISPARO (SUCESSO OU ERRO) */}
        {triggerMutation.isSuccess && (
          <Alert
            variant="default"
            className="p-4 flex items-center gap-3 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 bg-emerald-500/10"
          >
            <CheckCircle2 className="size-5 shrink-0 text-emerald-500" />
            <AlertDescription className="text-sm font-medium leading-relaxed">
              {t.simulator.triggerSuccess} Entregue com sucesso a{' '}
              <strong>{triggerMutation.data?.delivered_to ?? 0}</strong> cliente(s) conectado(s).
            </AlertDescription>
          </Alert>
        )}

        {triggerMutation.isError && (
          <Alert
            variant="destructive"
            className="p-4 flex items-center gap-3"
          >
            <AlertTriangle className="size-5 shrink-0 text-destructive" />
            <AlertDescription className="text-sm font-medium leading-relaxed">
              {triggerMutation.error?.message || t.simulator.triggerError}
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Rodapé Fixo do Dialog */}
      <DialogFooter className="shrink-0 px-6 py-4 border-t border-border bg-muted/40 sm:flex-row sm:justify-end gap-3 m-0 rounded-none">
        {onClose && (
          <Button variant="outline" type="button" onClick={onClose}>
            {t.common.cancel}
          </Button>
        )}

        <form.Subscribe
          selector={(state) => ({
            canSubmit: state.canSubmit,
            isSubmitting: state.isSubmitting,
            channel: state.values.channel,
            event: state.values.event,
          })}
          children={({ canSubmit, isSubmitting, channel, event }) => {
            const isPending = isSubmitting || triggerMutation.isPending;
            const isFilled = Boolean(channel.trim() && event.trim());

            return (
              <Button
                type="submit"
                disabled={!isFilled || !canSubmit || isPending}
                className="gap-2"
              >
                {isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>{t.simulator.triggering}</span>
                  </>
                ) : (
                  <>
                    <Send className="size-4" />
                    <span>{t.simulator.triggerButton}</span>
                  </>
                )}
              </Button>
            );
          }}
        />
      </DialogFooter>
    </form>
  );
};

/**
 * Modal Dialog do Simulador / Disparador de Eventos.
 * Apresenta estrutura com header fixo, rolagem isolada no formulário
 * e rodapé estático na base.
 */
export const EventSimulatorDialog: React.FC<EventSimulatorDialogProps> = ({
  open,
  onOpenChange,
  initialChannel = 'pedidos',
  initialEvent,
}) => {
  const { t } = useI18n();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl sm:max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Cabeçalho Fixo do Dialog */}
        <DialogHeader className="shrink-0 px-6 py-5 border-b border-border bg-card">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <Send className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-semibold text-foreground">
                {t.simulator.title}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-0.5">
                {t.simulator.subtitle}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Formulário com TanStack Form */}
        <EventSimulatorForm
          onClose={() => onOpenChange(false)}
          initialChannel={initialChannel}
          initialEvent={initialEvent}
        />
      </DialogContent>
    </Dialog>
  );
};
