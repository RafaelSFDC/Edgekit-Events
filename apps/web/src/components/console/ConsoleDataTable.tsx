import React, { useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnFiltersState,
  type SortingState,
} from '@tanstack/react-table';
import {
  Search,
  X,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react';
import type { DebugEvent } from '../../types';
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
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { consoleColumns, type ConsoleTableMeta } from './console-columns';

const TYPE_OPTIONS: Record<string, string> = {
  ALL: 'Todos os tipos',
  event_triggered: 'Disparos (event_triggered)',
  client_connected: 'Conexões (client_connected)',
  client_disconnected: 'Desconexões (client_disconnected)',
  channel_subscribed: 'Inscrições (channel_subscribed)',
  channel_unsubscribed: 'Desinscrições (channel_unsubscribed)',
};

interface ConsoleDataTableProps {
  data: DebugEvent[];
  isLoading?: boolean;
  onInspectEvent: (event: DebugEvent) => void;
}

export const ConsoleDataTable: React.FC<ConsoleDataTableProps> = ({
  data,
  isLoading = false,
  onInspectEvent,
}) => {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'timestamp', desc: true },
  ]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  const typeFilter =
    (columnFilters.find((f) => f.id === 'type')?.value as string) || 'ALL';

  const handleTypeFilterChange = (value: string | null) => {
    const val = value ?? 'ALL';
    setColumnFilters((prev) => {
      const rest = prev.filter((f) => f.id !== 'type');
      return val === 'ALL' ? rest : [...rest, { id: 'type', value: val }];
    });
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  };

  const handleResetFilters = () => {
    setGlobalFilter('');
    setColumnFilters([]);
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  };

  const isFiltered = globalFilter !== '' || columnFilters.length > 0;

  const tableMeta: ConsoleTableMeta = {
    onInspectEvent,
  };

  const table = useReactTable({
    data,
    columns: consoleColumns,
    getRowId: (row) => row.id,
    autoResetPageIndex: false,
    autoResetExpanded: false,
    state: {
      sorting,
      globalFilter,
      columnFilters,
      pagination,
    },
    meta: tableMeta,
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
      const ev = (row.original.event ?? '').toLowerCase();
      const type = (row.original.type ?? '').toLowerCase();
      const channel = (row.original.channel ?? '').toLowerCase();
      const socket = (row.original.socket_id ?? '').toLowerCase();
      const payload = typeof row.original.data === 'string'
        ? row.original.data.toLowerCase()
        : JSON.stringify(row.original.data ?? '').toLowerCase();

      return (
        ev.includes(q) ||
        type.includes(q) ||
        channel.includes(q) ||
        socket.includes(q) ||
        payload.includes(q)
      );
    },
  });

  const totalFilteredRows = table.getFilteredRowModel().rows.length;

  return (
    <div className="flex flex-col gap-3">
      {/* Barra de Filtros e Busca: Campo de busca + 1 único Select de tipos */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {/* Busca Textual */}
          <InputGroup className="w-full sm:w-80">
            <InputGroupAddon align="inline-start">
              <Search className="size-4 text-muted-foreground" />
            </InputGroupAddon>
            <InputGroupInput
              placeholder="Buscar por evento, canal ou socket..."
              value={globalFilter}
              onChange={(e) => {
                setGlobalFilter(e.target.value);
                setPagination((p) => ({ ...p, pageIndex: 0 }));
              }}
              aria-label="Buscar eventos"
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

          {/* Único Select da Tabela: Filtro por Tipo de Evento */}
          <div className="flex items-center gap-1.5">
            <Select
              items={TYPE_OPTIONS}
              value={typeFilter}
              onValueChange={handleTypeFilterChange}
            >
              <SelectTrigger className="w-[190px]" aria-label="Filtrar por tipo de evento">
                <SelectValue placeholder="Tipo de evento">
                  {(val: string) => TYPE_OPTIONS[val] ?? val}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="ALL">Todos os tipos</SelectItem>
                  <SelectItem value="event_triggered">Disparos (event_triggered)</SelectItem>
                  <SelectItem value="client_connected">Conexões (client_connected)</SelectItem>
                  <SelectItem value="client_disconnected">Desconexões (client_disconnected)</SelectItem>
                  <SelectItem value="channel_subscribed">Inscrições (channel_subscribed)</SelectItem>
                  <SelectItem value="channel_unsubscribed">Desinscrições (channel_unsubscribed)</SelectItem>
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

        {/* Contador de itens visíveis */}
        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          <Badge variant="outline" className="text-xs">
            {totalFilteredRows} {totalFilteredRows === 1 ? 'evento' : 'eventos'}
          </Badge>
        </div>
      </div>

      {/* Tabela TanStack */}
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
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={consoleColumns.length}
                  className="h-32 text-center text-xs text-muted-foreground"
                >
                  Carregando fluxo de eventos...
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  onClick={() => onInspectEvent(row.original)}
                  className="hover:bg-muted/30 transition-colors cursor-pointer"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-2.5">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={consoleColumns.length}
                  className="h-36 text-center"
                >
                  <Empty className="py-4 border-0">
                    <EmptyMedia variant="icon">
                      <Filter className="size-4 text-muted-foreground" />
                    </EmptyMedia>
                    <EmptyHeader>
                      <EmptyTitle>Nenhum evento encontrado</EmptyTitle>
                      <EmptyDescription>
                        {isFiltered
                          ? 'Nenhum evento corresponde aos critérios de busca ou filtro selecionado.'
                          : 'Aguardando novas mensagens no stream WebSocket.'}
                      </EmptyDescription>
                    </EmptyHeader>
                    {isFiltered && (
                      <EmptyContent>
                        <Button
                          variant="outline"
                          onClick={handleResetFilters}
                          className="gap-1.5 text-xs h-8"
                        >
                          <RotateCcw className="size-3.5" />
                          Limpar filtros
                        </Button>
                      </EmptyContent>
                    )}
                  </Empty>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Barra de Paginação e Totais */}
      {!isLoading && data.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-1 py-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>
              Exibindo{' '}
              <strong className="text-foreground">
                {totalFilteredRows === 0
                  ? 0
                  : pagination.pageIndex * pagination.pageSize + 1}
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
              eventos
              {data.length !== totalFilteredRows &&
                ` (filtrado de ${data.length})`}
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
