import React, { useState, useMemo, useEffect } from 'react';
import {
  Plus,
  Hash,
  Lock,
  Users,
  Radio,
  Copy,
  Check,
  Sparkles,
  Send,
  ShieldAlert,
  Clock,
  Globe,
  Bell,
  Cpu,
  Database,
  Sliders,
  X,
  Webhook,
} from 'lucide-react';
import { toast } from 'sonner';
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
import { Label } from '@/components/ui/label';
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
import { cn } from '@/lib/utils';
import type { ChannelCategory, ChannelVisibility } from '../../types';

interface CreateChannelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChannelCreated?: (channelName: string) => void;
}

const ARCHETYPE_DEFAULTS: Record<
  ChannelCategory,
  {
    namePrefix?: string;
    events: string[];
    visibility: ChannelVisibility;
    samplePayload: Record<string, any>;
  }
> = {
  crud: {
    events: ['created', 'updated', 'deleted'],
    visibility: 'public',
    samplePayload: { id: 1042, action: 'created', timestamp: new Date().toISOString() },
  },
  notifications: {
    events: ['alert', 'broadcast', 'info'],
    visibility: 'public',
    samplePayload: { level: 'info', message: 'Sistema atualizado com sucesso' },
  },
  jobs: {
    events: ['started', 'progress', 'completed', 'failed'],
    visibility: 'private',
    samplePayload: { jobId: 'job_99', progress: 100, status: 'completed' },
  },
  presence: {
    namePrefix: 'presence-',
    events: ['member:joined', 'member:left', 'status:update'],
    visibility: 'public',
    samplePayload: { status: 'online', last_seen: new Date().toISOString() },
  },
  custom: {
    events: ['channel:init'],
    visibility: 'public',
    samplePayload: { message: 'Canal inicializado com sucesso' },
  },
};

export const CreateChannelDialog: React.FC<CreateChannelDialogProps> = ({
  open,
  onOpenChange,
  onChannelCreated,
}) => {
  const { t } = useI18n();
  const createChannelMutation = useCreateChannel();
  const triggerMutation = useTriggerEvent();

  // Estados principais
  const [category, setCategory] = useState<ChannelCategory>('crud');
  const [visibility, setVisibility] = useState<ChannelVisibility>('public');
  const [rawName, setRawName] = useState('');
  const [allowedIpsText, setAllowedIpsText] = useState('');
  const [eventsList, setEventsList] = useState<string[]>(ARCHETYPE_DEFAULTS.crud.events);
  const [newEventTag, setNewEventTag] = useState('');

  // Estados de Ciclo de Vida (TTL & Webhook)
  const [ttlOption, setTtlOption] = useState<string>('0');
  const [customTtlMinutes, setCustomTtlMinutes] = useState<string>('30');
  const [webhookUrl, setWebhookUrl] = useState('');

  // Ativação e Disparo Inicial
  const [sendActivation, setSendActivation] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState('created');
  const [payloadText, setPayloadText] = useState(
    JSON.stringify(ARCHETYPE_DEFAULTS.crud.samplePayload, null, 2)
  );
  const [hasCopied, setHasCopied] = useState(false);

  // Ao mudar de arquétipo, ajusta valores padrão
  const handleSelectArchetype = (arch: ChannelCategory) => {
    setCategory(arch);
    const defaults = ARCHETYPE_DEFAULTS[arch];
    setEventsList(defaults.events);
    setVisibility(defaults.visibility);
    setSelectedEvent(defaults.events[0] || 'channel:init');
    setPayloadText(JSON.stringify(defaults.samplePayload, null, 2));

    if (arch === 'presence' && !rawName.startsWith('presence-')) {
      setRawName((prev) => (prev ? `presence-${prev.replace(/^(private-|presence-)/, '')}` : 'presence-'));
    }
  };

  // Normalização do nome do canal
  const resolvedChannelName = useMemo(() => {
    let clean = rawName.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    if (!clean) return '';

    if (category === 'presence') {
      return clean.startsWith('presence-') ? clean : `presence-${clean}`;
    }
    if (visibility === 'private' && !clean.startsWith('private-') && !clean.startsWith('presence-')) {
      return `private-${clean}`;
    }
    return clean;
  }, [rawName, category, visibility]);

  // Snippet de subscrição no cliente
  const snippetCode = useMemo(() => {
    const ch = resolvedChannelName || 'meu-canal';
    const ev = selectedEvent || eventsList[0] || 'meu-evento';
    return `// Frontend (pusher-js / Laravel Echo)\nconst channel = pusher.subscribe('${ch}');\nchannel.bind('${ev}', (data) => {\n  console.log('Recebido:', data);\n});`;
  }, [resolvedChannelName, selectedEvent, eventsList]);

  const handleCopySnippet = () => {
    navigator.clipboard.writeText(snippetCode);
    setHasCopied(true);
    toast.success(t.common.copied);
    setTimeout(() => setHasCopied(false), 2000);
  };

  const handleAddEvent = () => {
    const tag = newEventTag.trim().toLowerCase().replace(/[^a-z0-9:_-]/g, '-');
    if (tag && !eventsList.includes(tag)) {
      setEventsList((prev) => [...prev, tag]);
      if (!selectedEvent) setSelectedEvent(tag);
      setNewEventTag('');
    }
  };

  const handleRemoveEvent = (eventToRemove: string) => {
    setEventsList((prev) => {
      const next = prev.filter((ev) => ev !== eventToRemove);
      if (selectedEvent === eventToRemove) {
        setSelectedEvent(next[0] || '');
      }
      return next;
    });
  };

  const resolvedTtlMinutes = useMemo(() => {
    if (ttlOption === '-1') {
      return Math.max(1, parseInt(customTtlMinutes, 10) || 5);
    }
    return parseInt(ttlOption, 10) || 0;
  }, [ttlOption, customTtlMinutes]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvedChannelName) {
      toast.error('Informe um nome válido para o canal.');
      return;
    }

    const parsedIps = allowedIpsText
      .split(',')
      .map((ip) => ip.trim())
      .filter(Boolean);

    let parsedPayload: any = {};
    if (sendActivation) {
      try {
        parsedPayload = JSON.parse(payloadText);
      } catch {
        toast.error(t.simulator.invalidJson);
        return;
      }
    }

    createChannelMutation.mutate(
      {
        name: resolvedChannelName,
        category,
        visibility,
        allowedIps: parsedIps.length > 0 ? parsedIps : undefined,
        events: eventsList.length > 0 ? eventsList : ['channel:init'],
        autoDestructMinutes: resolvedTtlMinutes,
        webhookUrl: webhookUrl.trim() || undefined,
      },
      {
        onSuccess: () => {
          if (sendActivation) {
            triggerMutation.mutate({
              channel: resolvedChannelName,
              event: selectedEvent || eventsList[0] || 'channel:init',
              data: parsedPayload,
            });
          }

          toast.success(t.createChannelModal.successToast(resolvedChannelName));
          onChannelCreated?.(resolvedChannelName);
          onOpenChange(false);
        },
        onError: (err: any) => {
          toast.error(err.message || 'Falha ao registrar canal.');
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-6 sm:max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader className="gap-2 pb-3 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <Plus className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-foreground">
                {t.createChannelModal.title}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {t.createChannelModal.subtitle}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-3">
          {/* 1. Seleção de Arquétipo / Caso de Uso */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">
              {t.createChannelModal.archetypeLabel}
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {/* CRUD */}
              <button
                type="button"
                onClick={() => handleSelectArchetype('crud')}
                className={cn(
                  'flex flex-col text-left p-2.5 rounded-lg border text-xs transition-all cursor-pointer',
                  category === 'crud'
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'border-border/80 hover:border-border hover:bg-muted/40'
                )}
              >
                <div className="flex items-center gap-1.5 font-medium text-foreground mb-1">
                  <Database className="size-3.5 text-sky-500" />
                  <span className="truncate">CRUD / Dados</span>
                </div>
                <span className="text-[10px] text-muted-foreground line-clamp-2">
                  created, updated, deleted
                </span>
              </button>

              {/* Notificações */}
              <button
                type="button"
                onClick={() => handleSelectArchetype('notifications')}
                className={cn(
                  'flex flex-col text-left p-2.5 rounded-lg border text-xs transition-all cursor-pointer',
                  category === 'notifications'
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'border-border/80 hover:border-border hover:bg-muted/40'
                )}
              >
                <div className="flex items-center gap-1.5 font-medium text-foreground mb-1">
                  <Bell className="size-3.5 text-amber-500" />
                  <span className="truncate">Notificações</span>
                </div>
                <span className="text-[10px] text-muted-foreground line-clamp-2">
                  alert, broadcast, info
                </span>
              </button>

              {/* Jobs */}
              <button
                type="button"
                onClick={() => handleSelectArchetype('jobs')}
                className={cn(
                  'flex flex-col text-left p-2.5 rounded-lg border text-xs transition-all cursor-pointer',
                  category === 'jobs'
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'border-border/80 hover:border-border hover:bg-muted/40'
                )}
              >
                <div className="flex items-center gap-1.5 font-medium text-foreground mb-1">
                  <Cpu className="size-3.5 text-indigo-500" />
                  <span className="truncate">Ciclo de Jobs</span>
                </div>
                <span className="text-[10px] text-muted-foreground line-clamp-2">
                  started, progress, completed
                </span>
              </button>

              {/* Presença */}
              <button
                type="button"
                onClick={() => handleSelectArchetype('presence')}
                className={cn(
                  'flex flex-col text-left p-2.5 rounded-lg border text-xs transition-all cursor-pointer',
                  category === 'presence'
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'border-border/80 hover:border-border hover:bg-muted/40'
                )}
              >
                <div className="flex items-center gap-1.5 font-medium text-foreground mb-1">
                  <Users className="size-3.5 text-emerald-500" />
                  <span className="truncate">Presença</span>
                </div>
                <span className="text-[10px] text-muted-foreground line-clamp-2">
                  member:joined, member:left
                </span>
              </button>

              {/* Customizado */}
              <button
                type="button"
                onClick={() => handleSelectArchetype('custom')}
                className={cn(
                  'flex flex-col text-left p-2.5 rounded-lg border text-xs transition-all cursor-pointer',
                  category === 'custom'
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'border-border/80 hover:border-border hover:bg-muted/40'
                )}
              >
                <div className="flex items-center gap-1.5 font-medium text-foreground mb-1">
                  <Sliders className="size-3.5 text-primary" />
                  <span className="truncate">Customizado</span>
                </div>
                <span className="text-[10px] text-muted-foreground line-clamp-2">
                  Livre para escrever na mão
                </span>
              </button>
            </div>
          </div>

          {/* 2. Nome do Canal & Visibilidade */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="channel-name" className="text-xs font-semibold text-foreground">
                {t.createChannelModal.nameLabel}
              </Label>
              <div className="relative">
                <Input
                  id="channel-name"
                  value={rawName}
                  onChange={(e) => setRawName(e.target.value)}
                  placeholder={
                    category === 'presence'
                      ? 'presence-lobby'
                      : category === 'jobs'
                      ? 'importacao-relatorio'
                      : t.createChannelModal.namePlaceholder
                  }
                  className="font-mono text-xs pr-20"
                  required
                />
                {resolvedChannelName && (
                  <div className="absolute right-2 top-2">
                    <Badge variant="outline" className="text-[10px] font-mono py-0 h-5">
                      {resolvedChannelName}
                    </Badge>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">
                {t.createChannelModal.visibilityLabel}
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setVisibility('public')}
                  className={cn(
                    'flex items-center justify-center gap-1.5 p-2 rounded-md border text-xs font-medium cursor-pointer transition-all',
                    visibility === 'public'
                      ? 'border-sky-500 bg-sky-500/10 text-sky-600 dark:text-sky-400 font-semibold'
                      : 'border-border/80 text-muted-foreground hover:bg-muted/30'
                  )}
                >
                  <Globe className="size-3.5" />
                  <span>Público</span>
                </button>
                <button
                  type="button"
                  onClick={() => setVisibility('private')}
                  className={cn(
                    'flex items-center justify-center gap-1.5 p-2 rounded-md border text-xs font-medium cursor-pointer transition-all',
                    visibility === 'private'
                      ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold'
                      : 'border-border/80 text-muted-foreground hover:bg-muted/30'
                  )}
                >
                  <Lock className="size-3.5" />
                  <span>Privado (IP/Auth)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Se Privado: Campo de IPs Autorizados */}
          {visibility === 'private' && (
            <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/5 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                <ShieldAlert className="size-3.5" />
                <span>{t.createChannelModal.allowedIpsLabel}</span>
              </div>
              <Input
                value={allowedIpsText}
                onChange={(e) => setAllowedIpsText(e.target.value)}
                placeholder={t.createChannelModal.allowedIpsPlaceholder}
                className="font-mono text-xs bg-background/80"
              />
              <p className="text-[11px] text-muted-foreground">
                {t.createChannelModal.allowedIpsHint}
              </p>
            </div>
          )}

          {/* 3. Eventos Padrão do Canal (Chips Editáveis) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-foreground">
                {t.createChannelModal.eventsConfigLabel}
              </Label>
              <span className="text-[11px] text-muted-foreground">
                {eventsList.length} {eventsList.length === 1 ? 'evento configurado' : 'eventos configurados'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-lg border border-border/80 bg-muted/20 min-h-10">
              {eventsList.map((ev) => (
                <Badge
                  key={ev}
                  variant="secondary"
                  className="gap-1 text-xs font-mono py-0.5 px-2 bg-background border border-border"
                >
                  <span>{ev}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveEvent(ev)}
                    className="size-3 rounded-full hover:bg-muted-foreground/20 flex items-center justify-center cursor-pointer"
                    title="Remover evento"
                  >
                    <X className="size-2.5" />
                  </button>
                </Badge>
              ))}

              <div className="flex items-center gap-1 ml-auto">
                <Input
                  value={newEventTag}
                  onChange={(e) => setNewEventTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddEvent();
                    }
                  }}
                  placeholder={t.createChannelModal.addEventPlaceholder}
                  className="h-6 w-44 text-[11px] font-mono px-2 py-0 border-dashed"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={handleAddEvent}
                  className="h-6 px-1.5 text-xs"
                >
                  <Plus className="size-3" />
                </Button>
              </div>
            </div>
          </div>

          {/* 4. Ciclo de Vida & Automação (DO Alarms & Webhooks) */}
          <div className="rounded-lg border border-border/80 bg-muted/20 p-3 space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-primary" />
              <span className="text-xs font-semibold text-foreground">
                {t.createChannelModal.lifecycleLabel}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* TTL Select */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  {t.createChannelModal.lifecycleTtlLabel}
                </Label>
                <Select value={ttlOption} onValueChange={(val) => setTtlOption(val || '0')}>
                  <SelectTrigger className="h-8 text-xs">
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
              </div>

              {/* TTL Customizado em minutos */}
              {ttlOption === '-1' && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Tempo em Minutos</Label>
                  <Input
                    type="number"
                    min="1"
                    value={customTtlMinutes}
                    onChange={(e) => setCustomTtlMinutes(e.target.value)}
                    className="h-8 text-xs font-mono"
                  />
                </div>
              )}

              {/* Webhook URL */}
              <div className="space-y-1 sm:col-span-2">
                <div className="flex items-center gap-1.5">
                  <Webhook className="size-3 text-muted-foreground" />
                  <Label className="text-xs text-muted-foreground">
                    {t.createChannelModal.webhookUrlLabel}
                  </Label>
                </div>
                <Input
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder={t.createChannelModal.webhookUrlPlaceholder}
                  className="h-8 text-xs font-mono"
                />
                <p className="text-[10px] text-muted-foreground">
                  {t.createChannelModal.webhookUrlHint}
                </p>
              </div>
            </div>
          </div>

          {/* 5. Disparo de Ativação Inicial (Opcional) */}
          <div className="rounded-lg border border-border/80 bg-muted/20 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-primary" />
                <span className="text-xs font-medium text-foreground">
                  {t.createChannelModal.activationOptional}
                </span>
              </div>
              <Switch
                checked={sendActivation}
                onCheckedChange={setSendActivation}
                aria-label={t.createChannelModal.activationOptional}
              />
            </div>

            {sendActivation && (
              <div className="space-y-3 pt-2 border-t border-border/50">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    {t.createChannelModal.initEventLabel}
                  </Label>
                  {eventsList.length > 0 ? (
                    <Select value={selectedEvent} onValueChange={(val) => setSelectedEvent(val || '')}>
                      <SelectTrigger className="h-8 text-xs font-mono">
                        <SelectValue placeholder="Selecione um evento..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {eventsList.map((ev) => (
                            <SelectItem key={ev} value={ev} className="font-mono text-xs">
                              {ev}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      value={selectedEvent}
                      onChange={(e) => setSelectedEvent(e.target.value)}
                      className="font-mono text-xs h-8"
                    />
                  )}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="init-payload" className="text-xs text-muted-foreground">
                    {t.createChannelModal.initPayloadLabel}
                  </Label>
                  <Textarea
                    id="init-payload"
                    rows={2}
                    value={payloadText}
                    onChange={(e) => setPayloadText(e.target.value)}
                    className="font-mono text-xs resize-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 6. Preview do Código de Inscrição */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-muted-foreground">
                {t.createChannelModal.subscribeSnippet}
              </Label>
              <button
                type="button"
                onClick={handleCopySnippet}
                className="text-[11px] text-primary hover:underline flex items-center gap-1 cursor-pointer"
              >
                {hasCopied ? (
                  <>
                    <Check className="size-3 text-emerald-500" />
                    <span>{t.common.copied}</span>
                  </>
                ) : (
                  <>
                    <Copy className="size-3" />
                    <span>{t.common.copy}</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-2.5 rounded-md bg-zinc-950 text-zinc-100 font-mono text-[11px] overflow-x-auto border border-zinc-800">
              <code>{snippetCode}</code>
            </pre>
          </div>

          <DialogFooter className="pt-2 border-t border-border gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t.common.cancel}
            </Button>
            <Button
              type="submit"
              disabled={!resolvedChannelName || createChannelMutation.isPending}
              className="gap-1.5"
            >
              <Send className="size-3.5" />
              <span>
                {createChannelMutation.isPending
                  ? t.createChannelModal.submitting
                  : t.createChannelModal.submitButton}
              </span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
