import React, { useState, useCallback } from 'react';
import {
  Plus,
  Lock,
  Globe,
  Radio,
  Copy,
  Check,
  Sparkles,
  Send,
  ShieldAlert,
  Clock,
  Database,
  Bell,
  Cpu,
  Users,
  Sliders,
  X,
  Webhook,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useForm } from '@tanstack/react-form';
import { z } from 'zod';
import { useI18n } from '../../i18n/context';
import { useCreateChannel } from '../../hooks/api/use-channels';
import { useTriggerEvent } from '../../hooks/api/use-trigger';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
  FieldSet,
  FieldLegend,
} from '@/components/ui/field';
import { cn } from '@/lib/utils';
import type { ChannelCategory, ChannelVisibility } from '../../types';

export interface CreateChannelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChannelCreated?: (channelName: string) => void;
}

export interface CreateChannelFormProps {
  onClose?: () => void;
  onSuccess?: (channelName: string) => void;
  className?: string;
}

interface ArchetypeDefinition {
  category: ChannelCategory;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  events: string[];
  visibility: ChannelVisibility;
  placeholder: string;
  samplePayload: Record<string, unknown>;
}

export const ARCHETYPES: Record<ChannelCategory, ArchetypeDefinition> = {
  crud: {
    category: 'crud',
    name: 'crud',
    icon: Database,
    title: 'CRUD / Dados',
    description: 'Sincronização em tempo real de entidades de banco de dados',
    events: ['created', 'updated', 'deleted'],
    visibility: 'public',
    placeholder: 'pedidos',
    samplePayload: { id: 1042, action: 'created', timestamp: new Date().toISOString() },
  },
  notifications: {
    category: 'notifications',
    name: 'notifications',
    icon: Bell,
    title: 'Notificações',
    description: 'Alertas, broadcasts informativos e mensagens de sistema',
    events: ['alert', 'broadcast', 'info'],
    visibility: 'public',
    placeholder: 'alertas',
    samplePayload: { level: 'info', message: 'Sistema atualizado com sucesso' },
  },
  jobs: {
    category: 'jobs',
    name: 'jobs',
    icon: Cpu,
    title: 'Ciclo de Jobs',
    description: 'Tarefas em background e pipelines assíncronos',
    events: ['started', 'progress', 'completed', 'failed'],
    visibility: 'private',
    placeholder: 'importacao-relatorio',
    samplePayload: { jobId: 'job_99', progress: 100, status: 'completed' },
  },
  presence: {
    category: 'presence',
    name: 'presence',
    icon: Users,
    title: 'Salas & Presença',
    description: 'Controle de membros online e estados de presença em tempo real',
    events: ['member:joined', 'member:left', 'status:update'],
    visibility: 'public',
    placeholder: 'lobby',
    samplePayload: { status: 'online', last_seen: new Date().toISOString() },
  },
  custom: {
    category: 'custom',
    name: 'custom',
    icon: Sliders,
    title: 'Customizado',
    description: 'Configuração flexível com convenções livres de eventos',
    events: ['channel:init'],
    visibility: 'public',
    placeholder: 'meu-canal',
    samplePayload: { message: 'Canal inicializado com sucesso' },
  },
};

/**
 * Normaliza o nome do canal de acordo com regras de protocolo do Pusher / Durable Object:
 * - Canais de presença sempre iniciam com 'presence-'
 * - Canais privados iniciam com 'private-' (a menos que já sejam 'presence-')
 */
export function resolveChannelName(
  rawName: string,
  category: ChannelCategory,
  visibility: ChannelVisibility
): string {
  const clean = rawName.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  if (!clean) return '';

  if (category === 'presence') {
    return clean.startsWith('presence-') ? clean : `presence-${clean}`;
  }
  if (visibility === 'private' && !clean.startsWith('private-') && !clean.startsWith('presence-')) {
    return `private-${clean}`;
  }
  return clean;
}

export function formatError(err: unknown): string {
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

export const channelFormSchema = z.object({
  category: z.enum(['crud', 'notifications', 'jobs', 'presence', 'custom']),
  rawName: z
    .string()
    .trim()
    .min(2, 'O nome deve ter no mínimo 2 caracteres.')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Apenas letras, números, hífen (-) e sublinhado (_).'),
  visibility: z.enum(['public', 'private']),
  allowedIpsText: z.string(),
  eventsList: z.array(z.string()).min(1, 'Defina pelo menos 1 evento para o canal.'),
  ttlOption: z.string(),
  customTtlMinutes: z
    .string()
    .refine((val) => !val || parseInt(val, 10) >= 1, {
      message: 'O tempo customizado deve ser de pelo menos 1 minuto.',
    }),
  webhookUrl: z
    .string()
    .trim()
    .refine((val) => !val || /^https?:\/\/.+/i.test(val), {
      message: 'URL inválida. Deve iniciar com http:// ou https://',
    }),
  sendActivation: z.boolean(),
  selectedEvent: z.string(),
  payloadText: z.string().refine(
    (val) => {
      try {
        JSON.parse(val);
        return true;
      } catch {
        return false;
      }
    },
    { message: 'Payload inválido. Insira um JSON sintaticamente correto.' }
  ),
});

export type ChannelFormData = z.infer<typeof channelFormSchema>;

/**
 * Componente de Formulário autônomo com TanStack Form e Zod.
 * Utiliza rolagem interna e rodapé fixo com botões de tamanho padrão.
 */
export const CreateChannelForm: React.FC<CreateChannelFormProps> = ({
  onClose,
  onSuccess,
  className,
}) => {
  const { t } = useI18n();
  const createChannelMutation = useCreateChannel();
  const triggerMutation = useTriggerEvent();

  const [hasCopied, setHasCopied] = useState(false);
  const [newEventTag, setNewEventTag] = useState('');

  const form = useForm({
    defaultValues: {
      category: 'crud' as ChannelCategory,
      rawName: '',
      visibility: 'public' as ChannelVisibility,
      allowedIpsText: '',
      eventsList: ARCHETYPES.crud.events,
      ttlOption: '0',
      customTtlMinutes: '30',
      webhookUrl: '',
      sendActivation: true,
      selectedEvent: 'created',
      payloadText: JSON.stringify(ARCHETYPES.crud.samplePayload, null, 2),
    },
    validators: {
      onChange: channelFormSchema,
    },
    onSubmit: async ({ value }) => {
      const resolvedName = resolveChannelName(value.rawName, value.category, value.visibility);
      if (!resolvedName) {
        toast.error('Informe um nome válido para o canal.');
        return;
      }

      const parsedIps = (value.allowedIpsText || '')
        .split(',')
        .map((ip) => ip.trim())
        .filter(Boolean);

      let resolvedTtl = 0;
      if (value.ttlOption === '-1') {
        resolvedTtl = Math.max(1, parseInt(value.customTtlMinutes || '30', 10) || 5);
      } else {
        resolvedTtl = parseInt(value.ttlOption, 10) || 0;
      }

      let parsedPayload: Record<string, unknown> = {};
      if (value.sendActivation) {
        try {
          parsedPayload = JSON.parse(value.payloadText);
        } catch {
          toast.error(t.simulator.invalidJson);
          return;
        }
      }

      createChannelMutation.mutate(
        {
          name: resolvedName,
          category: value.category,
          visibility: value.visibility,
          allowedIps: parsedIps.length > 0 ? parsedIps : undefined,
          events: value.eventsList.length > 0 ? value.eventsList : ['channel:init'],
          autoDestructMinutes: resolvedTtl,
          webhookUrl: value.webhookUrl ? value.webhookUrl.trim() : undefined,
        },
        {
          onSuccess: () => {
            if (value.sendActivation) {
              triggerMutation.mutate({
                channel: resolvedName,
                event: value.selectedEvent || value.eventsList[0] || 'channel:init',
                data: parsedPayload,
              });
            }

            toast.success(t.createChannelModal.successToast(resolvedName));
            onSuccess?.(resolvedName);
            form.reset();
          },
          onError: (err: any) => {
            toast.error(err.message || 'Falha ao registrar canal no Durable Object.');
          },
        }
      );
    },
  });

  // Troca de arquétipo com atualização sincronizada no formulário
  const handleSelectArchetype = useCallback(
    (archCategory: ChannelCategory) => {
      const arch = ARCHETYPES[archCategory];
      form.setFieldValue('category', archCategory);
      form.setFieldValue('eventsList', arch.events);
      form.setFieldValue('visibility', arch.visibility);
      form.setFieldValue('selectedEvent', arch.events[0] || 'channel:init');
      form.setFieldValue('payloadText', JSON.stringify(arch.samplePayload, null, 2));

      // Se mudar para presença e o nome não possuir prefixo, sugere presence-
      const currentRaw = form.getFieldValue('rawName');
      if (archCategory === 'presence') {
        if (!currentRaw.startsWith('presence-')) {
          form.setFieldValue(
            'rawName',
            currentRaw ? `presence-${currentRaw.replace(/^(private-|presence-)/, '')}` : 'presence-'
          );
        }
      } else if (currentRaw.startsWith('presence-')) {
        form.setFieldValue('rawName', currentRaw.replace(/^presence-/, ''));
      }
    },
    [form]
  );

  // Adição de nova tag de evento
  const handleAddEventTag = useCallback(() => {
    const cleanTag = newEventTag.trim().toLowerCase().replace(/[^a-z0-9:_-]/g, '-');
    if (!cleanTag) return;

    const currentList = form.getFieldValue('eventsList');
    if (!currentList.includes(cleanTag)) {
      const nextList = [...currentList, cleanTag];
      form.setFieldValue('eventsList', nextList);
      if (!form.getFieldValue('selectedEvent')) {
        form.setFieldValue('selectedEvent', cleanTag);
      }
      setNewEventTag('');
    }
  }, [form, newEventTag]);

  // Remoção de tag de evento
  const handleRemoveEventTag = useCallback(
    (eventToRemove: string) => {
      const currentList = form.getFieldValue('eventsList');
      const nextList = currentList.filter((ev) => ev !== eventToRemove);
      form.setFieldValue('eventsList', nextList);

      if (form.getFieldValue('selectedEvent') === eventToRemove) {
        form.setFieldValue('selectedEvent', nextList[0] || '');
      }
    },
    [form]
  );

  return (
    <form
      id="create-channel-form"
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className={cn('flex flex-col flex-1 min-h-0 overflow-hidden', className)}
    >
      {/* Conteúdo Rolável Independente */}
      <div className="flex-1 overflow-y-auto min-h-0 px-6 py-6 space-y-6">
        {/* 1. SELEÇÃO DE ARQUÉTIPO & PROPÓSITO */}
        <form.Field name="category">
          {(categoryField) => (
            <Field data-invalid={Boolean(categoryField.state.meta.errors.length)}>
              <div className="flex items-center justify-between">
                <FieldLabel className="text-sm font-semibold">
                  {t.createChannelModal.archetypeLabel}
                </FieldLabel>
                <span className="text-xs text-muted-foreground">
                  Define convenções e padrões recomendados
                </span>
              </div>

              <div
                role="radiogroup"
                aria-label={t.createChannelModal.archetypeLabel}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1"
              >
                {Object.values(ARCHETYPES).map((arch) => {
                  const IconComponent = arch.icon;
                  const isSelected = categoryField.state.value === arch.category;
                  return (
                    <button
                      type="button"
                      key={arch.category}
                      aria-pressed={isSelected}
                      aria-label={arch.title}
                      onClick={() => handleSelectArchetype(arch.category)}
                      className={cn(
                        'flex flex-col justify-between p-3.5 rounded-lg border text-left transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        isSelected
                          ? 'border-primary bg-primary/5 ring-1 ring-primary shadow-xs'
                          : 'border-border/80 hover:border-border hover:bg-muted/40'
                      )}
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1.5 font-medium text-foreground">
                          <div
                            className={cn(
                              'size-7 rounded-md flex items-center justify-center shrink-0',
                              isSelected
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-muted-foreground'
                            )}
                          >
                            <IconComponent className="size-4" />
                          </div>
                          <span className="text-sm font-semibold">{arch.title}</span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {arch.description}
                        </p>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
                        <span className="font-mono text-[11px] truncate">
                          {arch.events.slice(0, 2).join(', ')}
                          {arch.events.length > 2 && '...'}
                        </span>
                        <Badge
                          variant={isSelected ? 'default' : 'secondary'}
                          className="text-[10px] font-medium uppercase px-1.5 py-0"
                        >
                          {arch.visibility}
                        </Badge>
                      </div>
                    </button>
                  );
                })}
              </div>
            </Field>
          )}
        </form.Field>

        {/* 2. IDENTIFICAÇÃO E VISIBILIDADE */}
        <FieldSet className="space-y-4">
          <FieldLegend className="flex items-center gap-2">
            <Radio className="size-4 text-primary" />
            <span>Identificação & Segurança do Canal</span>
          </FieldLegend>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Nome do Canal */}
            <form.Field name="rawName">
              {(rawNameField) => {
                const hasError =
                  rawNameField.state.meta.isTouched &&
                  Boolean(rawNameField.state.meta.errors.length);
                const currentCategory = form.getFieldValue('category');
                const currentVisibility = form.getFieldValue('visibility');
                const currentResolved = resolveChannelName(
                  rawNameField.state.value,
                  currentCategory,
                  currentVisibility
                );

                return (
                  <Field data-invalid={hasError}>
                    <div className="flex items-center justify-between">
                      <FieldLabel htmlFor="channel-raw-name">
                        {t.createChannelModal.nameLabel} *
                      </FieldLabel>
                      {currentResolved && (
                        <Badge
                          variant="outline"
                          className="font-mono text-xs text-primary border-primary/30 bg-primary/5"
                        >
                          DO ID: {currentResolved}
                        </Badge>
                      )}
                    </div>

                    <Input
                      id="channel-raw-name"
                      name={rawNameField.name}
                      value={rawNameField.state.value}
                      onBlur={rawNameField.handleBlur}
                      onChange={(e) => rawNameField.handleChange(e.target.value)}
                      placeholder={ARCHETYPES[currentCategory]?.placeholder || 'ex: pedidos'}
                      className="font-mono"
                      aria-invalid={hasError}
                    />

                    <FieldDescription>
                      {currentCategory === 'presence'
                        ? 'Canais de presença recebem automaticamente o prefixo presence-.'
                        : currentVisibility === 'private'
                        ? 'Canais privados recebem automaticamente o prefixo private-.'
                        : 'Identificador do canal para subscrição dos clientes.'}
                    </FieldDescription>

                    {hasError && (
                      <FieldError>
                        {rawNameField.state.meta.errors
                          .map(formatError)
                          .filter(Boolean)
                          .join(', ')}
                      </FieldError>
                    )}
                  </Field>
                );
              }}
            </form.Field>

            {/* Visibilidade do Canal */}
            <form.Field name="visibility">
              {(visibilityField) => (
                <Field>
                  <FieldLabel>{t.createChannelModal.visibilityLabel}</FieldLabel>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        visibilityField.handleChange('public');
                        form.validateField('rawName', 'change');
                      }}
                      className={cn(
                        'flex items-center justify-center gap-2 p-2.5 rounded-lg border text-sm font-medium cursor-pointer transition-all',
                        visibilityField.state.value === 'public'
                          ? 'border-sky-500 bg-sky-500/10 text-sky-700 dark:text-sky-300 font-semibold ring-1 ring-sky-500'
                          : 'border-border/80 text-muted-foreground hover:bg-muted/40'
                      )}
                    >
                      <Globe className="size-4" />
                      <span>Público</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        visibilityField.handleChange('private');
                        form.validateField('rawName', 'change');
                      }}
                      className={cn(
                        'flex items-center justify-center gap-2 p-2.5 rounded-lg border text-sm font-medium cursor-pointer transition-all',
                        visibilityField.state.value === 'private'
                          ? 'border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300 font-semibold ring-1 ring-amber-500'
                          : 'border-border/80 text-muted-foreground hover:bg-muted/40'
                      )}
                    >
                      <Lock className="size-4" />
                      <span>Privado (Auth/IP)</span>
                    </button>
                  </div>
                  <FieldDescription>
                    {visibilityField.state.value === 'public'
                      ? 'Qualquer cliente com a chave pública pode se conectar.'
                      : 'Requer autenticação HMAC ou IP whitelist para conexão.'}
                  </FieldDescription>
                </Field>
              )}
            </form.Field>
          </div>

          {/* IPs Autorizados (se Privado) */}
          <form.Subscribe
            selector={(state) => state.values.visibility}
            children={(currentVis) => {
              if (currentVis !== 'private') return null;

              return (
                <form.Field name="allowedIpsText">
                  {(ipsField) => (
                    <div className="p-3.5 rounded-lg border border-amber-500/30 bg-amber-500/5 space-y-2 mt-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-amber-800 dark:text-amber-300">
                        <ShieldAlert className="size-4" />
                        <span>{t.createChannelModal.allowedIpsLabel}</span>
                      </div>
                      <Input
                        id="channel-allowed-ips"
                        value={ipsField.state.value || ''}
                        onChange={(e) => ipsField.handleChange(e.target.value)}
                        placeholder={t.createChannelModal.allowedIpsPlaceholder}
                        className="font-mono bg-background"
                      />
                      <p className="text-xs text-muted-foreground">
                        {t.createChannelModal.allowedIpsHint}
                      </p>
                    </div>
                  )}
                </form.Field>
              );
            }}
          />
        </FieldSet>

        {/* 3. CONVENÇÃO DE EVENTOS DO CANAL */}
        <form.Field name="eventsList">
          {(eventsField) => {
            const currentEvents = eventsField.state.value;
            const hasError = Boolean(eventsField.state.meta.errors.length);

            return (
              <FieldSet className="space-y-3">
                <div className="flex items-center justify-between">
                  <FieldLegend className="flex items-center gap-2">
                    <Sparkles className="size-4 text-primary" />
                    <span>{t.createChannelModal.eventsConfigLabel}</span>
                  </FieldLegend>
                  <span className="text-xs text-muted-foreground">
                    {currentEvents.length}{' '}
                    {currentEvents.length === 1 ? 'evento configurado' : 'eventos configurados'}
                  </span>
                </div>

                <Field data-invalid={hasError}>
                  <div className="flex flex-wrap items-center gap-2 p-3 rounded-lg border border-border/80 bg-muted/20 min-h-12">
                    {currentEvents.map((ev) => (
                          <Badge
                            key={ev}
                            variant="secondary"
                            className="gap-1.5 text-xs font-mono py-1 px-2.5 bg-background border border-border shadow-2xs"
                          >
                            <span>{ev}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveEventTag(ev)}
                              className="size-4 rounded-full hover:bg-muted-foreground/20 flex items-center justify-center cursor-pointer transition-colors"
                              title="Remover evento"
                              aria-label={`Remover evento ${ev}`}
                            >
                              <X className="size-3" />
                            </button>
                          </Badge>
                        ))}

                    {currentEvents.length === 0 && (
                      <span className="text-xs text-muted-foreground italic">
                        Nenhum evento adicionado. O canal aceitará qualquer evento padrão.
                      </span>
                    )}
                  </div>

                  {/* Input de Adição de Evento em Tamanho Padrão */}
                  <div className="flex items-center gap-2 pt-1">
                    <Input
                      value={newEventTag}
                      onChange={(e) => setNewEventTag(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddEventTag();
                        }
                      }}
                      placeholder={t.createChannelModal.addEventPlaceholder}
                      className="font-mono flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAddEventTag}
                      disabled={!newEventTag.trim()}
                      className="gap-1.5"
                    >
                      <Plus className="size-4" />
                      <span>Adicionar</span>
                    </Button>
                  </div>

                  {hasError && (
                    <FieldError>
                      {eventsField.state.meta.errors
                        .map(formatError)
                        .filter(Boolean)
                        .join(', ')}
                    </FieldError>
                  )}
                </Field>
              </FieldSet>
            );
          }}
        </form.Field>

        {/* 4. CICLO DE VIDA DO DURABLE OBJECT (TTL & WEBHOOK) */}
        <FieldSet className="space-y-4">
          <FieldLegend className="flex items-center gap-2">
            <Clock className="size-4 text-primary" />
            <span>{t.createChannelModal.lifecycleLabel}</span>
          </FieldLegend>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Seleção de TTL */}
            <form.Field name="ttlOption">
              {(ttlField) => (
                <Field>
                  <FieldLabel htmlFor="channel-ttl-select">
                    {t.createChannelModal.lifecycleTtlLabel}
                  </FieldLabel>
                  <Select
                    value={ttlField.state.value}
                    onValueChange={(val) => ttlField.handleChange(val || '0')}
                  >
                    <SelectTrigger id="channel-ttl-select" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="0">{t.createChannelModal.ttlNever}</SelectItem>
                        <SelectItem value="5">{t.createChannelModal.ttl5m}</SelectItem>
                        <SelectItem value="15">{t.createChannelModal.ttl15m}</SelectItem>
                        <SelectItem value="60">{t.createChannelModal.ttl1h}</SelectItem>
                        <SelectItem value="1440">{t.createChannelModal.ttl24h}</SelectItem>
                        <SelectItem value="-1">{t.createChannelModal.ttlCustom}</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <FieldDescription>
                    O Durable Object será liberado da memória após o tempo de inatividade.
                  </FieldDescription>
                </Field>
              )}
            </form.Field>

            {/* TTL Customizado em Minutos */}
            <form.Subscribe
              selector={(state) => state.values.ttlOption}
              children={(currentTtlOpt) => {
                if (currentTtlOpt !== '-1') return null;

                return (
                  <form.Field name="customTtlMinutes">
                    {(customTtlField) => {
                      const hasError = Boolean(customTtlField.state.meta.errors.length);
                      return (
                        <Field data-invalid={hasError}>
                          <FieldLabel htmlFor="custom-ttl-input">Tempo em Minutos</FieldLabel>
                          <Input
                            id="custom-ttl-input"
                            type="number"
                            min="1"
                            value={customTtlField.state.value || ''}
                            onChange={(e) => customTtlField.handleChange(e.target.value)}
                            className="font-mono"
                            aria-invalid={hasError}
                          />
                          <FieldDescription>
                            Tempo mínimo de 1 minuto sem clientes conectados.
                          </FieldDescription>
                          {hasError && (
                            <FieldError>
                              {customTtlField.state.meta.errors
                                .map(formatError)
                                .filter(Boolean)
                                .join(', ')}
                            </FieldError>
                          )}
                        </Field>
                      );
                    }}
                  </form.Field>
                );
              }}
            />
          </div>

          {/* Webhook URL do Backend */}
          <form.Field name="webhookUrl">
            {(webhookField) => {
              const hasError = Boolean(webhookField.state.meta.errors.length);
              return (
                <Field data-invalid={hasError}>
                  <div className="flex items-center gap-2">
                    <Webhook className="size-4 text-muted-foreground" />
                    <FieldLabel htmlFor="channel-webhook-url">
                      {t.createChannelModal.webhookUrlLabel}
                    </FieldLabel>
                  </div>
                  <Input
                    id="channel-webhook-url"
                    value={webhookField.state.value || ''}
                    onChange={(e) => webhookField.handleChange(e.target.value)}
                    placeholder={t.createChannelModal.webhookUrlPlaceholder}
                    className="font-mono"
                    aria-invalid={hasError}
                  />
                  <FieldDescription>{t.createChannelModal.webhookUrlHint}</FieldDescription>
                  {hasError && (
                    <FieldError>
                      {webhookField.state.meta.errors
                        .map(formatError)
                        .filter(Boolean)
                        .join(', ')}
                    </FieldError>
                  )}
                </Field>
              );
            }}
          </form.Field>
        </FieldSet>

        {/* 5. DISPARO INICIAL DE ATIVAÇÃO */}
        <form.Field name="sendActivation">
          {(activationField) => (
            <FieldSet className="space-y-4">
              <div className="flex items-center justify-between">
                <FieldLegend className="flex items-center gap-2">
                  <Send className="size-4 text-primary" />
                  <span>{t.createChannelModal.activationOptional}</span>
                </FieldLegend>
                <Switch
                  id="activation-toggle"
                  checked={activationField.state.value}
                  onCheckedChange={(checked) => activationField.handleChange(checked)}
                  aria-label={t.createChannelModal.activationOptional}
                />
              </div>

              {activationField.state.value && (
                <div className="space-y-4 pt-2 border-t border-border/60">
                  {/* Seleção do Evento de Disparo */}
                  <form.Field name="selectedEvent">
                    {(selectedEvField) => {
                      const currentEvents = form.getFieldValue('eventsList');
                      return (
                        <Field>
                          <FieldLabel htmlFor="activation-event-select">
                            {t.createChannelModal.initEventLabel}
                          </FieldLabel>
                          {currentEvents.length > 0 ? (
                            <Select
                              value={selectedEvField.state.value || currentEvents[0]}
                              onValueChange={(val) => selectedEvField.handleChange(val || '')}
                            >
                              <SelectTrigger id="activation-event-select" className="w-full font-mono">
                                <SelectValue placeholder="Selecione um evento..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectGroup>
                                  {currentEvents.map((ev) => (
                                    <SelectItem key={ev} value={ev} className="font-mono">
                                      {ev}
                                    </SelectItem>
                                  ))}
                                </SelectGroup>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input
                              id="activation-event-input"
                              value={selectedEvField.state.value || ''}
                              onChange={(e) => selectedEvField.handleChange(e.target.value)}
                              className="font-mono"
                              placeholder="ex: channel:init"
                            />
                          )}
                          <FieldDescription>
                            Evento disparado no canal imediatamente após o registro.
                          </FieldDescription>
                        </Field>
                      );
                    }}
                  </form.Field>

                  {/* Payload JSON do Disparo Inicial */}
                  <form.Field name="payloadText">
                    {(payloadField) => {
                      const hasError = Boolean(payloadField.state.meta.errors.length);
                      return (
                        <Field data-invalid={hasError}>
                          <FieldLabel htmlFor="activation-payload-json">
                            {t.createChannelModal.initPayloadLabel}
                          </FieldLabel>
                          <Textarea
                            id="activation-payload-json"
                            rows={4}
                            value={payloadField.state.value}
                            onChange={(e) => payloadField.handleChange(e.target.value)}
                            className="font-mono text-sm leading-relaxed"
                            aria-invalid={hasError}
                          />
                          {hasError ? (
                            <FieldError>
                              {payloadField.state.meta.errors
                                .map(formatError)
                                .filter(Boolean)
                                .join(', ')}
                            </FieldError>
                          ) : (
                            <FieldDescription>
                              Dados em formato JSON enviados como payload do evento.
                            </FieldDescription>
                          )}
                        </Field>
                      );
                    }}
                  </form.Field>
                </div>
              )}
            </FieldSet>
          )}
        </form.Field>

        {/* 6. PREVIEW DE INTEGRAÇÃO CLIENT-SIDE */}
        <form.Subscribe
          selector={(state) => ({
            rawName: state.values.rawName,
            category: state.values.category,
            visibility: state.values.visibility,
            selectedEvent: state.values.selectedEvent,
            eventsList: state.values.eventsList,
          })}
          children={({ rawName, category, visibility, selectedEvent, eventsList }) => {
            const resolved =
              resolveChannelName(rawName, category, visibility) || 'meu-canal';
            const currentEv = selectedEvent || eventsList[0] || 'meu-evento';
            const snippetCode = `// Frontend (pusher-js / Laravel Echo)\nconst channel = pusher.subscribe('${resolved}');\nchannel.bind('${currentEv}', (data) => {\n  console.log('Recebido:', data);\n});`;

            const handleCopySnippet = () => {
              navigator.clipboard.writeText(snippetCode);
              setHasCopied(true);
              toast.success(t.common.copied);
              setTimeout(() => setHasCopied(false), 2000);
            };

            return (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">
                    {t.createChannelModal.subscribeSnippet}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleCopySnippet}
                    className="gap-1.5 text-xs text-primary hover:text-primary"
                  >
                    {hasCopied ? (
                      <>
                        <Check className="size-3.5 text-emerald-500" />
                        <span>{t.common.copied}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="size-3.5" />
                        <span>{t.common.copy}</span>
                      </>
                    )}
                  </Button>
                </div>
                <pre className="p-3.5 rounded-lg bg-zinc-950 text-zinc-100 font-mono text-xs overflow-x-auto border border-zinc-800 leading-relaxed">
                  <code>{snippetCode}</code>
                </pre>
              </div>
            );
          }}
        />
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
            rawName: state.values.rawName,
          })}
          children={({ canSubmit, isSubmitting, rawName }) => {
            const isPending = isSubmitting || createChannelMutation.isPending;
            const isNameFilled = Boolean(rawName.trim());

            return (
              <Button
                type="submit"
                disabled={!isNameFilled || !canSubmit || isPending}
                className="gap-2"
              >
                {isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>{t.createChannelModal.submitting}</span>
                  </>
                ) : (
                  <>
                    <Send className="size-4" />
                    <span>{t.createChannelModal.submitButton}</span>
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
 * Modal Dialog para criação de novo canal.
 * Utiliza o Dialog do shadcn com Base UI, com header estático,
 * rolagem isolada no conteúdo do formulário e footer estático com botões.
 */
export const CreateChannelDialog: React.FC<CreateChannelDialogProps> = ({
  open,
  onOpenChange,
  onChannelCreated,
}) => {
  const { t } = useI18n();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl sm:max-w-3xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Cabeçalho Fixo do Dialog */}
        <DialogHeader className="shrink-0 px-6 py-5 border-b border-border bg-card">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <Plus className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-semibold text-foreground">
                {t.createChannelModal.title}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-0.5">
                {t.createChannelModal.subtitle}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Formulário com TanStack Form */}
        <CreateChannelForm
          onClose={() => onOpenChange(false)}
          onSuccess={(resolvedName) => {
            onChannelCreated?.(resolvedName);
            onOpenChange(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
};
