/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { EuiBasicTable, useEuiTheme } from '@elastic/eui';
import type {
  ListProbeDiagnostic,
  ListQueryDiagnostic,
  ListTimings,
  QueryExecutionStats,
} from '@kbn/entity-inventory-plugin/common';
import {
  formatBytes,
  formatCount,
  formatMs,
  formatNanosAsMs,
  formatShare,
  maxOf,
  sumOf,
} from './format';
import {
  ELASTICSEARCH_COLUMNS,
  STAT_LABELS,
  SUMMARY_LABELS,
  SUMMARY_TITLES,
  TIMING_COLUMNS,
  TIMING_ROWS,
} from './translations';

const numberCss = css`
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
`;

const nowrapCss = css`
  white-space: nowrap;
`;

interface TimingRow {
  id: string;
  label: string;
  /** Nesting depth under the browser round trip. */
  indent: 0 | 1 | 2 | 3;
  ms: number;
}

const StageLabel = ({ label, indent }: Pick<TimingRow, 'label' | 'indent'>) => {
  const { euiTheme } = useEuiTheme();
  const labelCss = css`
    white-space: nowrap;
    padding-left: calc(${euiTheme.size.base} * ${indent});
    font-weight: ${indent === 0 ? euiTheme.font.weight.semiBold : 'inherit'};
  `;
  return <span css={labelCss}>{label}</span>;
};

export interface TimingsTableProps {
  browserMs: number;
  timings: ListTimings;
}

/** The browser round trip broken down into network and the server phases, each with its share. */
export const TimingsTable = ({ browserMs, timings }: TimingsTableProps) => {
  const { definitionMs, planningMs, probesMs, queriesMs, processingMs, totalMs } = timings;
  const rows: TimingRow[] = [
    { id: 'roundTrip', label: TIMING_ROWS.roundTrip, indent: 0, ms: browserMs },
    { id: 'network', label: TIMING_ROWS.network, indent: 1, ms: browserMs - totalMs },
    { id: 'server', label: TIMING_ROWS.server, indent: 1, ms: totalMs },
    { id: 'definition', label: TIMING_ROWS.definition, indent: 2, ms: definitionMs },
    { id: 'planning', label: TIMING_ROWS.planning, indent: 2, ms: planningMs },
    { id: 'probes', label: TIMING_ROWS.probes, indent: 3, ms: probesMs },
    {
      id: 'queryGeneration',
      label: TIMING_ROWS.queryGeneration,
      indent: 3,
      ms: Math.max(0, planningMs - probesMs),
    },
    { id: 'queries', label: TIMING_ROWS.queries, indent: 2, ms: queriesMs },
    { id: 'mergeAndSort', label: TIMING_ROWS.mergeAndSort, indent: 2, ms: processingMs },
  ];
  const columns: Array<EuiBasicTableColumn<TimingRow>> = [
    {
      name: TIMING_COLUMNS.stage,
      render: ({ label, indent }: TimingRow) => <StageLabel label={label} indent={indent} />,
    },
    {
      name: TIMING_COLUMNS.time,
      width: '88px',
      align: 'right',
      render: ({ ms }: TimingRow) => <span css={numberCss}>{formatMs(ms)}</span>,
    },
    {
      name: TIMING_COLUMNS.share,
      nameTooltip: { content: TIMING_COLUMNS.shareTooltip },
      width: '80px',
      align: 'right',
      render: ({ ms }: TimingRow) => <span css={numberCss}>{formatShare(ms, browserMs)}</span>,
    },
  ];
  return (
    <EuiBasicTable<TimingRow>
      tableCaption={SUMMARY_TITLES.timings}
      items={rows}
      itemId="id"
      columns={columns}
      compressed
      data-test-subj="entityInventoryPerformanceTimings"
    />
  );
};

interface ElasticsearchRow {
  id: string;
  label: string;
  queries: string;
  probes: string;
}

type StatsFormatter = (stats: readonly QueryExecutionStats[]) => string;

const sumNanos =
  (pick: (stats: QueryExecutionStats) => number | null): StatsFormatter =>
  (stats) =>
    formatNanosAsMs(sumOf(stats.map(pick)));

const ELASTICSEARCH_METRICS: ReadonlyArray<{ id: string; label: string; format: StatsFormatter }> =
  [
    {
      id: 'slowestQuery',
      label: SUMMARY_LABELS.slowestQuery,
      format: (stats) => formatMs(maxOf(stats.map(({ took }) => took))),
    },
    {
      id: 'totalQueryTime',
      label: SUMMARY_LABELS.totalQueryTime,
      format: (stats) => formatMs(sumOf(stats.map(({ took }) => took))),
    },
    { id: 'cpu', label: SUMMARY_LABELS.cpu, format: sumNanos(({ cpuNanos }) => cpuNanos) },
    {
      id: 'driver',
      label: SUMMARY_LABELS.driver,
      format: sumNanos(({ driverNanos }) => driverNanos),
    },
    {
      id: 'documents',
      label: SUMMARY_LABELS.documents,
      format: (stats) =>
        formatCount(sumOf(stats.map(({ documentsFound }) => documentsFound)), 'docs'),
    },
    {
      id: 'values',
      label: STAT_LABELS.values,
      format: (stats) =>
        formatCount(sumOf(stats.map(({ valuesLoaded }) => valuesLoaded)), 'values'),
    },
    {
      id: 'bytes',
      label: STAT_LABELS.bytes,
      format: (stats) => formatBytes(sumOf(stats.map(({ bytesRead }) => bytesRead))),
    },
  ];

const numericColumn = (
  name: string,
  field: 'queries' | 'probes'
): EuiBasicTableColumn<ElasticsearchRow> => ({
  field,
  name,
  width: '104px',
  align: 'right',
  render: (value: string) => <span css={numberCss}>{value}</span>,
});

const ELASTICSEARCH_TABLE_COLUMNS: Array<EuiBasicTableColumn<ElasticsearchRow>> = [
  {
    field: 'label',
    name: ELASTICSEARCH_COLUMNS.metric,
    render: (label: string) => <span css={nowrapCss}>{label}</span>,
  },
  numericColumn(ELASTICSEARCH_COLUMNS.queries, 'queries'),
  numericColumn(ELASTICSEARCH_COLUMNS.probes, 'probes'),
];

export interface ElasticsearchTableProps {
  queries: readonly ListQueryDiagnostic[];
  probes: readonly ListProbeDiagnostic[];
}

/** Elasticsearch execution stats summed over the plan queries and over the probes. */
export const ElasticsearchTable = ({ queries, probes }: ElasticsearchTableProps) => {
  const rows: ElasticsearchRow[] = ELASTICSEARCH_METRICS.map(({ id, label, format }) => ({
    id,
    label,
    queries: format(queries),
    probes: format(probes),
  }));
  return (
    <EuiBasicTable<ElasticsearchRow>
      tableCaption={SUMMARY_TITLES.elasticsearch}
      items={rows}
      itemId="id"
      columns={ELASTICSEARCH_TABLE_COLUMNS}
      compressed
      data-test-subj="entityInventoryPerformanceElasticsearch"
    />
  );
};
