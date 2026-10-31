import React, { useState, useMemo, useCallback } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
} from '@tanstack/react-table';
import {
  Search,
  X,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Hash,
  Users,
  Lock,
  Globe,
  Send,
  RefreshCw,
  Plus,
  Copy,
  Check,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Trash2,
  Clock,
  Webhook,
  Database,
  Bell,
  Cpu,
  Sliders,
  ShieldCheck,
} from 'lucide-react';
import type { ChannelStat } from '../types';
import { useI18n } from '../i18n/context';
import { useChannelsQuery, useDeleteChannel } from '../hooks/api/use-channels';
import { useStatsQuery } from '../hooks/api/use-stats';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from '@/components/ui/empty';
import { toast } from 'sonner';

interface ChannelExplorerProps {
  channels?: Record<string, any>;
  onRefresh?: () => void;
  onSelectChannelForTrigger: (channelName: string, defaultEvent?: string) => void;
  onCreateChannel?: () => void;
  isRefreshing?: boolean;
}

const CHANNEL_CATEGORY_OPTIONS: Record<string, string> = {
  ALL: 'Todos os arquétipos',
  crud: 'CRUD / Dados',
  notifications: 'Notificações',
  jobs: 'Ciclo de Jobs',
  presence: 'Presença',
  custom: 'Customizados',
};

export const ChannelExplorer: React.FC<ChannelExplorerProps> = ({
  channels: propChannels,
  onRefresh: propOnRefresh,
  onSelectChannelForTrigger,
  onCreateChannel,
  isRefreshing: propIsRefreshing,
}) => {
  const { t } = useI18n();

  // Queries e Mutações
  const { data: channelsQueryData, isFetching: isChannelsFetching, refetch: refetchChannels } = useChannelsQuery();
  const { data: statsData, isFetching: isStatsFetching, refetch: refetchStats } = useStatsQuery();
  const deleteChannelMutation = useDeleteChannel();

  const isRefreshing = propIsRefreshing ?? (isChannelsFetching || isStatsFetching);

  // Estados de Tabela TanStack
  const [copiedChannel, setCopiedChannel] = useState<string | null>(null);
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'user_count', desc: true },
  ]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  // Lista normalizada de canais
  const channelList: ChannelStat[] = useMemo(() => {
    const rawData = propChannels ?? channelsQueryData ?? statsData?.channels ?? {};
    return Object.entries(rawData).map(([name, data]: [string, any]) => ({
      name,
      user_count: data.user_count ?? 0,
      isPresence: data.category === 'presence' || name.startsWith('presence-'),
      isPrivate: data.visibility === 'private' || name.startsWith('private-') || name.startsWith('presence-'),
      category: data.category || (name.startsWith('presence-') ? 'presence' : 'custom'),
      visibility: data.visibility || (name.startsWith('private-') || name.startsWith('presence-') ? 'private' : 'public'),
      description: data.description,
      allowedIps: data.allowedIps || [],
      events: data.events || [],
      autoDestructMinutes: data.autoDestructMinutes,
      webhookUrl: data.webhookUrl,
      vacatedAt: data.vacatedAt,
      createdAt: data.createdAt,
      isRegistered: data.isRegistered ?? false,
    }));
  }, [propChannels, channelsQueryData, statsData?.channels]);

  const handleCopyChannelName = (e: React.MouseEvent, channelName: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(channelName);
    setCopiedChannel(channelName);
    toast.success(`Canal "${channelName}" copiado para a área de transferência!`);
    setTimeout(() => setCopiedChannel(null), 2000);
  };

  const handleDeleteChannel = useCallback(
    (channelName: string) => {
      if (confirm(t.channels.deleteConfirm(channelName))) {
        deleteChannelMutation.mutate(channelName, {
          onSuccess: () => {
            toast.success(t.channels.deletedSuccess(channelName));
          },
          onError: () => {
            toast.error(t.channels.deleteError);
          },
        });
      }
    },
    [deleteChannelMutation, t]
  );

  const handleRefreshClick = () => {
    if (propOnRefresh) {
      propOnRefresh();
    } else {
      refetchChannels();
      refetchStats();
    }
  };

  // Definição das Colunas da Tabela de Canais (Estilo Diorama Care)
  const columns: ColumnDef<ChannelStat>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: ({ column }) => {
          const isSorted = column.getIsSorted();
          return (
            <Button
              variant="ghost"
              className="-ml-2 h-8 px-2 text-xs font-semibold text-foreground hover:bg-muted/50"
              onClick={() => column.toggleSorting(isSorted === 'asc')}
            >
              Canal
              {isSorted === 'asc' ? (
                <ArrowUp className="ml-1 size-3.5" />
              ) : isSorted === 'desc' ? (
                <ArrowDown className="ml-1 size-3.5" />
              ) : (
                <ArrowUpDown className="ml-1 size-3.5 text-muted-foreground" />
              )}
            </Button>
          );
        },
        cell: ({ row }) => {
          const ch = row.original;
          const isCopied = copiedChannel === ch.name;

          return (
            <div className="flex items-center gap-2 py-0.5 min-w-[200px]">
              <div className="size-7 rounded-md bg-muted/60 border border-border/70 flex items-center justify-center text-muted-foreground shrink-0">
                <Hash className="size-3.5" />
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span
                    className="font-mono font-semibold text-xs text-foreground truncate max-w-[240px]"
                    title={ch.name}
                  >
                    {ch.name}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => handleCopyChannelName(e, ch.name)}
                    className="size-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                    title="Copiar nome do canal"
                    aria-label="Copiar nome do canal"
                  >
                    {isCopied ? (
                      <Check className="size-3 text-emerald-500" />
                    ) : (
                      <Copy className="size-3" />
                    )}
                  </button>
                  {ch.isRegistered && (
                    <Badge variant="outline" className="text-[9px] py-0 px-1 font-sans border-primary/30 text-primary">
                      {t.channels.registeredBadge}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          );
        },
      },
      {
        id: 'category',
        accessorFn: (row) => row.category || 'custom',
        header: ({ column }) => {
          const isSorted = column.getIsSorted();
          return (
            <Button
              variant="ghost"
              className="-ml-2 h-8 px-2 text-xs font-semibold text-foreground hover:bg-muted/50"
              onClick={() => column.toggleSorting(isSorted === 'asc')}
            >
              Arquétipo
              {isSorted === 'asc' ? (
                <ArrowUp className="ml-1 size-3.5" />
              ) : isSorted === 'desc' ? (
                <ArrowDown className="ml-1 size-3.5" />
              ) : (
                <ArrowUpDown className="ml-1 size-3.5 text-muted-foreground" />
              )}
            </Button>
          );
        },
        cell: ({ row }) => {
          const cat = row.original.category;
          switch (cat) {
            case 'crud':
              return (
                <Badge variant="outline" className="gap-1 text-[11px] border-sky-500/30 text-sky-600 dark:text-sky-400 bg-sky-500/10">
                  <Database className="size-3" />
                  <span>CRUD / Dados</span>
                </Badge>
              );
            case 'notifications':
              return (
                <Badge variant="outline" className="gap-1 text-[11px] border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10">
                  <Bell className="size-3" />
                  <span>Notificações</span>
                </Badge>
              );
            case 'jobs':
              return (
                <Badge variant="outline" className="gap-1 text-[11px] border-indigo-500/30 text-indigo-600 dark:text-indigo-400 bg-indigo-500/10">
                  <Cpu className="size-3" />
                  <span>Jobs</span>
                </Badge>
              );
            case 'presence':
              return (
                <Badge variant="outline" className="gap-1 text-[11px] border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10">
                  <Users className="size-3" />
                  <span>Presença</span>
                </Badge>
              );
            default:
              return (
                <Badge variant="outline" className="gap-1 text-[11px] text-muted-foreground">
                  <Sliders className="size-3" />
                  <span>Customizado</span>
                </Badge>
              );
          }
        },
      },
      {
        id: 'visibility',
        accessorFn: (row) => row.visibility || 'public',
        header: ({ column }) => {
          const isSorted = column.getIsSorted();
          return (
            <Button
              variant="ghost"
              className="-ml-2 h-8 px-2 text-xs font-semibold text-foreground hover:bg-muted/50"
              onClick={() => column.toggleSorting(isSorted === 'asc')}
            >
              Segurança
              {isSorted === 'asc' ? (
                <ArrowUp className="ml-1 size-3.5" />
              ) : isSorted === 'desc' ? (
                <ArrowDown className="ml-1 size-3.5" />
              ) : (
                <ArrowUpDown className="ml-1 size-3.5 text-muted-foreground" />
              )}
            </Button>
          );
        },
        cell: ({ row }) => {
          const ch = row.original;
          const isPriv = ch.visibility === 'private' || ch.isPrivate;
          const hasIps = ch.allowedIps && ch.allowedIps.length > 0;

          if (isPriv) {
            return (
              <div className="flex items-center gap-1.5 py-0.5">
                <Badge
                  variant="outline"
                  className="gap-1 text-[11px] border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10"
                >
                  <Lock className="size-3" />
                  <span>Privado</span>
                </Badge>
                {hasIps && (
                  <Tooltip>
                    <TooltipTrigger>
                      <span className="flex items-center text-[10px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded border border-border/60">
                        <ShieldCheck className="size-2.5 mr-1 text-emerald-500" />
                        {ch.allowedIps?.length} IP(s)
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="text-[11px] font-mono">
                        <p className="font-semibold mb-1">IPs Autorizados:</p>
                        {ch.allowedIps?.map((ip) => (
                          <div key={ip}>{ip}</div>
                        ))}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            );
          }

          return (
            <Badge
              variant="outline"
              className="gap-1 text-[11px] border-sky-500/30 text-sky-600 dark:text-sky-400 bg-sky-500/10"
            >
              <Globe className="size-3" />
              <span>Público</span>
            </Badge>
          );
        },
      },
      {
        id: 'lifecycle',
        header: () => (
          <div className="text-xs font-semibold text-foreground">Ciclo de Vida</div>
        ),
        cell: ({ row }) => {
          const ch = row.original;
          const ttl = ch.autoDestructMinutes;
          const hasWebhook = Boolean(ch.webhookUrl);

          return (
            <div className="flex items-center gap-1.5 py-0.5">
              {ttl && ttl > 0 ? (
                <Badge variant="outline" className="text-[10px] gap-1 font-mono text-amber-600 border-amber-500/30 bg-amber-500/5">
                  <Clock className="size-2.5" />
                  <span>{ttl}m ocioso</span>
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] gap-1 text-muted-foreground border-border/60">
                  <Clock className="size-2.5" />
                  <span>Permanente</span>
                </Badge>
              )}

              {hasWebhook && (
                <Tooltip>
                  <TooltipTrigger>
                    <span className="p-1 rounded bg-muted text-muted-foreground hover:text-foreground">
                      <Webhook className="size-3 text-primary" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <span className="font-mono text-xs">{ch.webhookUrl}</span>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          );
        },
      },
      {
        id: 'events',
        header: () => (
          <div className="text-xs font-semibold text-foreground">Eventos Padrão</div>
        ),
        cell: ({ row }) => {
          const events = row.original.events || [];
          if (events.length === 0) {
            return <span className="text-xs text-muted-foreground italic">Livre</span>;
          }

          return (
            <div className="flex flex-wrap items-center gap-1 max-w-[200px] py-0.5">
              {events.slice(0, 3).map((ev) => (
                <span
                  key={ev}
                  className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-muted/60 border border-border/60 text-foreground"
                >
                  {ev}
                </span>
              ))}
              {events.length > 3 && (
                <span className="text-[10px] text-muted-foreground font-mono">
                  +{events.length - 3}
                </span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'user_count',
        header: ({ column }) => {
          const isSorted = column.getIsSorted();
          return (
            <Button
              variant="ghost"
              className="-ml-2 h-8 px-2 text-xs font-semibold text-foreground hover:bg-muted/50"
              onClick={() => column.toggleSorting(isSorted === 'asc')}
            >
              Ouvintes Ativos
              {isSorted === 'asc' ? (
                <ArrowUp className="ml-1 size-3.5" />
              ) : isSorted === 'desc' ? (
                <ArrowDown className="ml-1 size-3.5" />
              ) : (
                <ArrowUpDown className="ml-1 size-3.5 text-muted-foreground" />
              )}
            </Button>
          );
        },
        cell: ({ row }) => {
          const count = row.original.user_count;
          const isActive = count > 0;

          return (
            <div className="flex items-center gap-2 py-0.5">
              <span
                className={`size-2 rounded-full shrink-0 ${
                  isActive
                    ? 'bg-emerald-500 animate-pulse'
                    : 'bg-zinc-300 dark:bg-zinc-700'
                }`}
              />
              <span className="font-mono font-semibold text-xs text-foreground">
                {count}
              </span>
              <span className="text-xs text-muted-foreground hidden sm:inline">
                {count === 1 ? 'ouvinte' : 'ouvintes'}
              </span>
            </div>
          );
        },
      },
      {
        id: 'actions',
        header: () => (
          <div className="text-right text-xs font-semibold text-foreground pr-2">
            Ações
          </div>
        ),
        cell: ({ row }) => {
          const ch = row.original;
          const firstEvent = ch.events && ch.events.length > 0 ? ch.events[0] : undefined;

          return (
            <div className="flex items-center justify-end gap-1.5 py-0.5 pr-2">
              <Button
                variant="outline"
                size="xs"
                onClick={() => onSelectChannelForTrigger(ch.name, firstEvent)}
                className="h-7 text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
              >
                <Send className="size-3" />
                <span>{t.channels.triggerInThisChannel}</span>
              </Button>

              {ch.isRegistered && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteChannel(ch.name)}
                  className="size-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  title={t.channels.deleteChannel}
                  aria-label={t.channels.deleteChannel}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              )}
            </div>
          );
        },
      },
    ],
    [copiedChannel, onSelectChannelForTrigger, handleDeleteChannel, t]
  );

  const categoryFilter =
    (columnFilters.find((f) => f.id === 'category')?.value as string) || 'ALL';

  const handleCategoryFilterChange = (value: string | null) => {
    const val = value ?? 'ALL';
    setColumnFilters((prev) => {
      const rest = prev.filter((f) => f.id !== 'category');
      return val === 'ALL' ? rest : [...rest, { id: 'category', value: val }];
    });
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  };

  const handleResetFilters = () => {
    setGlobalFilter('');
    setColumnFilters([]);
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  };

  const isFiltered = globalFilter !== '' || columnFilters.length > 0;

  const table = useReactTable({
    data: channelList,
    columns,
    getRowId: (row) => row.name,
    autoResetPageIndex: false,
    state: {
      sorting,
      globalFilter,
      columnFilters,
      pagination,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: (row, _columnId, filterValue: string) => {
      if (!filterValue) return true;
      const q = filterValue.toLowerCase().trim();
      const name = row.original.name.toLowerCase();
      const cat = (row.original.category || '').toLowerCase();
      const events = (row.original.events || []).join(' ').toLowerCase();
      const ips = (row.original.allowedIps || []).join(' ').toLowerCase();
      return name.includes(q) || cat.includes(q) || events.includes(q) || ips.includes(q);
    },
  });

  const totalFilteredRows = table.getFilteredRowModel().rows.length;

  return (
    <div className="flex flex-col gap-3">
      {/* 1. Barra de Filtros e Busca */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {/* Busca Textual */}
          <InputGroup className="w-full sm:w-80">
            <InputGroupAddon align="inline-start">
              <Search className="size-4 text-muted-foreground" />
            </InputGroupAddon>
            <InputGroupInput
              placeholder="Buscar por nome, arquétipo ou evento..."
              value={globalFilter}
              onChange={(e) => {
                setGlobalFilter(e.target.value);
                setPagination((p) => ({ ...p, pageIndex: 0 }));
              }}
              aria-label="Buscar canais"
            />
            {globalFilter && (
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  size="xs"
                  onClick={() => {
                    setGlobalFilter('');
                    setPagination((p) => ({ ...p, pageIndex: 0 }));
                  }}
                  aria-label="Limpar busca"
                >
                  <X className="size-3.5" />
                </InputGroupButton>
              </InputGroupAddon>
            )}
          </InputGroup>

          {/* Filtro por Arquétipo */}
          <div className="flex items-center gap-1.5">
            <Select
              items={CHANNEL_CATEGORY_OPTIONS}
              value={categoryFilter}
              onValueChange={handleCategoryFilterChange}
            >
              <SelectTrigger className="w-[190px]" aria-label="Filtrar por arquétipo">
                <SelectValue placeholder="Arquétipo">
                  {(val: string) => CHANNEL_CATEGORY_OPTIONS[val] ?? val}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="ALL">Todos os arquétipos</SelectItem>
                  <SelectItem value="crud">CRUD / Dados</SelectItem>
                  <SelectItem value="notifications">Notificações</SelectItem>
                  <SelectItem value="jobs">Ciclo de Jobs</SelectItem>
                  <SelectItem value="presence">Presença</SelectItem>
                  <SelectItem value="custom">Customizados</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {/* Botão de Limpar Filtros */}
          {isFiltered && (
            <Button
              variant="ghost"
              onClick={handleResetFilters}
              className="text-xs gap-1.5 text-muted-foreground hover:text-foreground self-start sm:self-auto h-8 px-2.5"
            >
              <RotateCcw className="size-3.5" />
              Limpar filtros
            </Button>
          )}
        </div>

        {/* Ações e Contadores à Direita */}
        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshClick}
            disabled={isRefreshing}
            className="gap-1.5 h-8 text-xs"
            title="Atualizar lista de canais"
          >
            <RefreshCw className={`size-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{t.channels.refresh}</span>
          </Button>

          {onCreateChannel && (
            <Button
              variant="default"
              size="sm"
              onClick={onCreateChannel}
              className="gap-1.5 h-8 text-xs"
            >
              <Plus className="size-3.5" />
              <span>{t.channels.newChannel}</span>
            </Button>
          )}

          <Badge variant="outline" className="text-xs ml-1">
            {totalFilteredRows} {totalFilteredRows === 1 ? 'canal' : 'canais'}
          </Badge>
        </div>
      </div>

      {/* 2. Tabela TanStack de Canais */}
      <div className="rounded-lg border border-border overflow-hidden bg-card">
        <Table>
          <TableHeader className="bg-muted/40">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="py-2">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="hover:bg-muted/30 transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-2.5">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-64 text-center p-0">
                  <Empty className="py-12 border-0">
                    <EmptyMedia variant="icon">
                      <Hash className="size-5 text-muted-foreground" />
                    </EmptyMedia>
                    <EmptyHeader>
                      <EmptyTitle>
                        {isFiltered
                          ? 'Nenhum canal corresponde ao filtro atual'
                          : t.channels.noChannels}
                      </EmptyTitle>
                      <EmptyDescription className="max-w-md mx-auto">
                        {isFiltered ? (
                          <span>
                            Tente ajustar ou limpar o termo de busca ou filtros selecionados.
                          </span>
                        ) : (
                          <span>
                            Conecte um cliente via{' '}
                            <code className="text-foreground font-mono">pusher-js</code>{' '}
                            ou clique abaixo para inicializar um novo canal.
                          </span>
                        )}
                      </EmptyDescription>
                    </EmptyHeader>

                    <div className="mt-4 flex items-center justify-center gap-2">
                      {isFiltered ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleResetFilters}
                          className="gap-1.5"
                        >
                          <RotateCcw className="size-3.5" />
                          Limpar filtros
                        </Button>
                      ) : (
                        onCreateChannel && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={onCreateChannel}
                            className="gap-1.5"
                          >
                            <Plus className="size-4" />
                            <span>{t.channels.createFirstChannel}</span>
                          </Button>
                        )
                      )}
                    </div>
                  </Empty>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* 3. Paginação Inferior Padronizada */}
      {channelList.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground px-1 py-1">
          <div className="flex items-center gap-2">
            <span>
              Mostrando{' '}
              <strong className="text-foreground">
                {Math.min(
                  pagination.pageIndex * pagination.pageSize + 1,
                  totalFilteredRows
                )}
              </strong>{' '}
              a{' '}
              <strong className="text-foreground">
                {Math.min(
                  (pagination.pageIndex + 1) * pagination.pageSize,
                  totalFilteredRows
                )}
              </strong>{' '}
              de{' '}
              <strong className="text-foreground">{totalFilteredRows}</strong>{' '}
              canais
              {channelList.length !== totalFilteredRows &&
                ` (filtrado de ${channelList.length})`}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="whitespace-nowrap">Por página:</span>
              <Select
                value={String(pagination.pageSize)}
                onValueChange={(val) => {
                  if (val) {
                    table.setPageSize(Number(val));
                  }
                }}
              >
                <SelectTrigger className="w-[72px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectGroup>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="whitespace-nowrap">
                Página {table.getState().pagination.pageIndex + 1} de{' '}
                {Math.max(table.getPageCount(), 1)}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="size-7"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                aria-label="Página anterior"
              >
                <ChevronLeft className="size-3.5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="size-7"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                aria-label="Próxima página"
              >
                <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
