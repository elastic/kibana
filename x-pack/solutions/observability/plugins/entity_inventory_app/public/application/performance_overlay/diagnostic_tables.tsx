/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import type { ReactNode } from 'react';
import { css } from '@emotion/react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiBadge,
  EuiBasicTable,
  EuiButtonIcon,
  EuiCodeBlock,
  EuiDescriptionList,
  EuiScreenReaderOnly,
  EuiSpacer,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { KbnDangerCallout, KbnWarningCallout } from '@kbn/ui-callout';
import type {
  ListProbeDiagnostic,
  ListQueryDiagnostic,
  ProbeOutcomeKind,
  QueryExecutionStats,
  SourceError,
} from '@kbn/entity-inventory-plugin/common';
import { ENTITY_INVENTORY_EBT_ACTIONS, ENTITY_INVENTORY_EBT_ELEMENTS } from '../../ebt_constants';
import {
  EMPTY_VALUE,
  formatBytes,
  formatCount,
  formatMs,
  formatNanosAsMs,
  formatShards,
} from './format';
import {
  DETAIL_COLUMN_WIDTH,
  ES_TIME_COLUMN_WIDTH,
  EXPANDER_COLUMN_WIDTH,
  PROBE_FILLER_WIDTH,
  QUERY_COLUMN_WIDTHS,
  STATUS_COLUMN_WIDTH,
  fixedWidth,
  useFixedColumnWidths,
} from './column_widths';
import {
  COLLAPSE_ROW,
  EXPAND_ROW,
  NO,
  PROBE_PLANS,
  ROW_ERROR_TITLE,
  ROW_PARTIAL_TITLE,
  ROW_STATUS,
  SECTION_TITLES,
  STAT_LABELS,
  TABLE_COLUMNS,
  YES,
} from './translations';

type Diagnostic = QueryExecutionStats & {
  indexPattern: string;
  esql: string;
  params: ListQueryDiagnostic['params'];
  error: SourceError | null;
};

type Row<T extends Diagnostic> = T & { id: string };

type RowStatus = keyof typeof ROW_STATUS;

interface DetailItem {
  title: string;
  description: string;
}

const numberCss = css`
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
`;

const truncateCss = css`
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const nowrapCss = css`
  white-space: nowrap;
`;

/** Elasticsearch's own name of the stat, shown as is. */
const ROWS_EMITTED_FIELD = 'rows_emitted';

const Numeric = ({ children }: { children: ReactNode }) => <span css={numberCss}>{children}</span>;

/** A right-aligned, non-wrapping numeric column, of a fixed width when one is given. */
const numericColumn = <T extends Diagnostic>(
  name: string,
  width: string | undefined,
  render: (item: T) => string
): EuiBasicTableColumn<Row<T>> => ({
  name,
  width,
  align: 'right',
  render: (item: Row<T>) => <Numeric>{render(item)}</Numeric>,
});

const formatBoolean = (value: boolean | null): string =>
  value === null ? EMPTY_VALUE : value ? YES : NO;

const ROW_STATUS_COLORS: Record<RowStatus, string> = {
  ok: 'hollow',
  partial: 'warning',
  unusable: 'danger',
  failed: 'danger',
};

// A lost probe or query shows why; a partial one kept its rows.
const rowStatus = ({ error, isPartial }: Diagnostic): RowStatus =>
  error?.kind ?? (isPartial ? 'partial' : 'ok');

const RowStatusBadge = ({ status }: { status: RowStatus }) => (
  <EuiBadge color={ROW_STATUS_COLORS[status]} data-test-subj="entityInventoryPerformanceRowStatus">
    {ROW_STATUS[status]}
  </EuiBadge>
);

const RowDetail = ({ item, stats }: { item: Diagnostic; stats: DetailItem[] }) => {
  const { euiTheme } = useEuiTheme();
  const { error, isPartial, esql, params } = item;
  const detailCss = css`
    width: 100%;
    padding: ${euiTheme.size.xs} 0;
  `;
  return (
    <div css={detailCss} data-test-subj="entityInventoryPerformanceRowDetail">
      {error && (
        <>
          <KbnDangerCallout
            size="s"
            title={ROW_ERROR_TITLE(ROW_STATUS[error.kind], error.reason, error.status)}
          />
          <EuiSpacer size="s" />
        </>
      )}
      {isPartial && (
        <>
          <KbnWarningCallout size="s" title={ROW_PARTIAL_TITLE} />
          <EuiSpacer size="s" />
        </>
      )}
      <EuiDescriptionList type="inline" compressed listItems={stats} />
      <EuiSpacer size="s" />
      <EuiCodeBlock language="esql" fontSize="s" paddingSize="s" isCopyable>
        {esql}
      </EuiCodeBlock>
      <EuiSpacer size="xs" />
      <EuiCodeBlock language="json" fontSize="s" paddingSize="s" overflowHeight={200} isCopyable>
        {JSON.stringify(params, null, 2)}
      </EuiCodeBlock>
    </div>
  );
};

interface DiagnosticTableProps<T extends Diagnostic> {
  caption: string;
  items: readonly T[];
  /** The one column between the status and the ES time. */
  detailColumn: EuiBasicTableColumn<Row<T>>;
  /** Columns after the ES time, given whether the shared fixed widths apply. */
  trailingColumns: (isFixed: boolean) => Array<EuiBasicTableColumn<Row<T>>>;
  /** The stats shown only in the expanded row. */
  detailStats: (item: T) => DetailItem[];
}

/** One row per probe or query, expandable to the rest of its stats and its ES|QL. */
const DiagnosticTable = <T extends Diagnostic>({
  caption,
  items,
  detailColumn,
  trailingColumns,
  detailStats,
}: DiagnosticTableProps<T>) => {
  const isFixed = useFixedColumnWidths();
  const rows: Array<Row<T>> = items.map((item, position) => ({ ...item, id: String(position) }));
  const [expandedIds, setExpandedIds] = useState<ReadonlySet<string>>(() => new Set());

  const toggle = (id: string) =>
    setExpandedIds((current) => {
      const next = new Set(current);
      if (!next.delete(id)) {
        next.add(id);
      }
      return next;
    });

  const columns: Array<EuiBasicTableColumn<Row<T>>> = [
    {
      width: EXPANDER_COLUMN_WIDTH,
      isExpander: true,
      name: (
        <EuiScreenReaderOnly>
          <span>{TABLE_COLUMNS.expand}</span>
        </EuiScreenReaderOnly>
      ),
      render: ({ id, indexPattern }: Row<T>) => {
        const isExpanded = expandedIds.has(id);
        const label = isExpanded ? COLLAPSE_ROW(indexPattern) : EXPAND_ROW(indexPattern);
        return (
          <EuiToolTip content={label} disableScreenReaderOutput>
            <EuiButtonIcon
              onClick={() => toggle(id)}
              aria-label={label}
              aria-expanded={isExpanded}
              iconType={isExpanded ? 'chevronSingleDown' : 'chevronSingleRight'}
              data-test-subj="entityInventoryPerformanceRowExpand"
              {...getEbtProps({
                action: ENTITY_INVENTORY_EBT_ACTIONS.TOGGLE_PERFORMANCE_ROW,
                element: ENTITY_INVENTORY_EBT_ELEMENTS.PERFORMANCE_OVERLAY,
              })}
            />
          </EuiToolTip>
        );
      },
    },
    {
      field: 'indexPattern',
      name: TABLE_COLUMNS.indexPattern,
      truncateText: true,
      render: (indexPattern: string) => (
        <EuiToolTip content={indexPattern} display="block">
          <span css={truncateCss} tabIndex={0}>
            {indexPattern}
          </span>
        </EuiToolTip>
      ),
    },
    {
      name: TABLE_COLUMNS.status,
      width: fixedWidth(isFixed, STATUS_COLUMN_WIDTH),
      render: (item: Row<T>) => <RowStatusBadge status={rowStatus(item)} />,
    },
    { ...detailColumn, width: fixedWidth(isFixed, DETAIL_COLUMN_WIDTH) },
    numericColumn<T>(STAT_LABELS.esTime, fixedWidth(isFixed, ES_TIME_COLUMN_WIDTH), ({ took }) =>
      formatMs(took)
    ),
    ...trailingColumns(isFixed),
  ];

  const itemIdToExpandedRowMap = Object.fromEntries(
    rows
      .filter(({ id }) => expandedIds.has(id))
      .map((row) => [row.id, <RowDetail item={row} stats={detailStats(row)} />])
  );

  return (
    <EuiBasicTable<Row<T>>
      tableCaption={caption}
      items={rows}
      itemId="id"
      columns={columns}
      itemIdToExpandedRowMap={itemIdToExpandedRowMap}
      compressed
    />
  );
};

const sharedDetailStats = ({
  driverNanos,
  valuesLoaded,
  rowsEmitted,
  bytesRead,
  shards,
  isPartial,
}: Diagnostic): DetailItem[] => [
  { title: STAT_LABELS.driver, description: formatNanosAsMs(driverNanos) },
  { title: STAT_LABELS.values, description: formatCount(valuesLoaded, 'values') },
  { title: ROWS_EMITTED_FIELD, description: formatCount(rowsEmitted, 'rows') },
  { title: STAT_LABELS.bytes, description: formatBytes(bytesRead) },
  { title: STAT_LABELS.shards, description: formatShards(shards) },
  { title: STAT_LABELS.partial, description: formatBoolean(isPartial) },
];

/** The plan queries of one `_list` call, each with its status. */
export const QueriesTable = ({ queries }: { queries: readonly ListQueryDiagnostic[] }) => (
  <DiagnosticTable<ListQueryDiagnostic>
    caption={SECTION_TITLES.queries}
    items={queries}
    detailColumn={{ field: 'engine', name: TABLE_COLUMNS.engine }}
    trailingColumns={(isFixed) => [
      numericColumn<ListQueryDiagnostic>(
        STAT_LABELS.cpu,
        fixedWidth(isFixed, QUERY_COLUMN_WIDTHS.cpuTime),
        ({ cpuNanos }) => formatNanosAsMs(cpuNanos)
      ),
      numericColumn<ListQueryDiagnostic>(
        STAT_LABELS.documents,
        fixedWidth(isFixed, QUERY_COLUMN_WIDTHS.docs),
        ({ documentsFound }) => formatCount(documentsFound, 'docs')
      ),
      numericColumn<ListQueryDiagnostic>(
        STAT_LABELS.rows,
        fixedWidth(isFixed, QUERY_COLUMN_WIDTHS.rows),
        ({ rowCount }) => formatCount(rowCount, 'rows')
      ),
    ]}
    detailStats={sharedDetailStats}
  />
);

/** The probes of one `_list` call, each with its status. */
export const ProbesTable = ({ probes }: { probes: readonly ListProbeDiagnostic[] }) => (
  <DiagnosticTable<ListProbeDiagnostic>
    caption={SECTION_TITLES.probes}
    items={probes}
    detailColumn={{
      field: 'outcome',
      name: TABLE_COLUMNS.plans,
      render: (outcome: ProbeOutcomeKind) => <span css={nowrapCss}>{PROBE_PLANS[outcome]}</span>,
    }}
    // The filler only keeps the alignment with the queries, so it goes with the fixed widths.
    trailingColumns={(isFixed) =>
      isFixed ? [{ name: '', width: PROBE_FILLER_WIDTH, render: () => null }] : []
    }
    detailStats={(probe) => [
      { title: STAT_LABELS.cpu, description: formatNanosAsMs(probe.cpuNanos) },
      { title: STAT_LABELS.documents, description: formatCount(probe.documentsFound, 'docs') },
      ...sharedDetailStats(probe),
    ]}
  />
);
