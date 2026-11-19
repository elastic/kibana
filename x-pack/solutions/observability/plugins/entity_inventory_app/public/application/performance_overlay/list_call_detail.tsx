/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiAccordion,
  EuiBasicTable,
  EuiCodeBlock,
  EuiDescriptionList,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type {
  ListProbeDiagnostic,
  ListQueryDiagnostic,
  QueryExecutionStats,
  QueryShardStats,
} from '@kbn/entity-inventory-plugin/common';
import {
  EMPTY_VALUE,
  formatBytes,
  formatCount,
  formatMs,
  formatNanosAsMs,
  formatShards,
  maxOf,
  sumOf,
} from './format';
import type { ListCallDiagnostics, RecordedCall } from './performance_recorder';
import {
  ESQL_TITLE,
  NO,
  PROBE_ACCORDION_LABEL,
  PROBES_TITLE,
  QUERIES_TITLE,
  QUERY_ACCORDION_LABEL,
  STATS_COLUMNS,
  SUMMARY,
  SUMMARY_TITLE,
  YES,
} from './translations';

type Diagnostic = QueryExecutionStats & {
  wallMs: number;
  error: { reason: string } | null;
};

const formatBoolean = (value: boolean | null): string =>
  value === null ? EMPTY_VALUE : value ? YES : NO;

/** The stats columns probes and queries share. */
const statsColumns = <T extends Diagnostic>(): Array<EuiBasicTableColumn<T>> => [
  {
    field: 'wallMs',
    name: STATS_COLUMNS.wallMs,
    align: 'right',
    render: (value: number) => formatMs(value),
  },
  {
    field: 'took',
    name: STATS_COLUMNS.took,
    align: 'right',
    render: (value: number | null) => formatMs(value),
  },
  {
    field: 'cpuNanos',
    name: STATS_COLUMNS.cpu,
    align: 'right',
    render: (value: number | null) => formatNanosAsMs(value),
  },
  {
    field: 'driverNanos',
    name: STATS_COLUMNS.driver,
    align: 'right',
    render: (value: number | null) => formatNanosAsMs(value),
  },
  {
    field: 'documentsFound',
    name: STATS_COLUMNS.documentsFound,
    align: 'right',
    render: (value: number | null) => formatCount(value),
  },
  {
    field: 'valuesLoaded',
    name: STATS_COLUMNS.valuesLoaded,
    align: 'right',
    render: (value: number | null) => formatCount(value),
  },
  {
    field: 'rowsEmitted',
    name: STATS_COLUMNS.rowsEmitted,
    align: 'right',
    render: (value: number | null) => formatCount(value),
  },
  {
    field: 'bytesRead',
    name: STATS_COLUMNS.bytesRead,
    align: 'right',
    render: (value: number | null) => formatBytes(value),
  },
  {
    field: 'shards',
    name: STATS_COLUMNS.shards,
    render: (value: QueryShardStats | null) => formatShards(value),
  },
  {
    field: 'isPartial',
    name: STATS_COLUMNS.partial,
    render: (value: boolean | null) => formatBoolean(value),
  },
  {
    field: 'error',
    name: STATS_COLUMNS.error,
    render: (value: Diagnostic['error']) => value?.reason ?? EMPTY_VALUE,
  },
];

const QUERY_COLUMNS: Array<EuiBasicTableColumn<ListQueryDiagnostic>> = [
  { field: 'indexPattern', name: STATS_COLUMNS.indexPattern },
  { field: 'engine', name: STATS_COLUMNS.engine },
  {
    field: 'rowCount',
    name: STATS_COLUMNS.rowCount,
    align: 'right',
    render: (value: number) => formatCount(value),
  },
  ...statsColumns<ListQueryDiagnostic>(),
];

const PROBE_COLUMNS: Array<EuiBasicTableColumn<ListProbeDiagnostic>> = [
  { field: 'indexPattern', name: STATS_COLUMNS.indexPattern },
  { field: 'outcome', name: STATS_COLUMNS.outcome },
  ...statsColumns<ListProbeDiagnostic>(),
];

const EsqlBlock = ({
  label,
  esql,
  params,
}: {
  label: string;
  esql: string;
  params: ListQueryDiagnostic['params'];
}) => {
  const accordionId = useGeneratedHtmlId({ prefix: 'entityInventoryPerformanceEsql' });
  return (
    <EuiAccordion id={accordionId} buttonContent={label} paddingSize="s">
      <EuiCodeBlock language="esql" fontSize="s" paddingSize="s" isCopyable>
        {esql}
      </EuiCodeBlock>
      <EuiSpacer size="xs" />
      <EuiCodeBlock language="json" fontSize="s" paddingSize="s" isCopyable>
        {JSON.stringify(params, null, 2)}
      </EuiCodeBlock>
    </EuiAccordion>
  );
};

export interface ListCallDetailProps {
  call: RecordedCall;
  list: ListCallDiagnostics;
}

/** Browser and server times of one `_list` call, with the stats of each probe and query. */
export const ListCallDetail = ({ call, list }: ListCallDetailProps) => {
  const { browserMs, route } = call;
  const { timings, queries, probes, took, rowCount, truncated, errorCount } = list;
  const queryTooks = queries.map((query) => query.took);

  const summary = [
    { title: SUMMARY.browserMs, description: formatMs(browserMs) },
    { title: SUMMARY.serverTotalMs, description: formatMs(timings.totalMs) },
    { title: SUMMARY.gapMs, description: formatMs(browserMs - timings.totalMs) },
    { title: SUMMARY.serverTook, description: formatMs(took) },
    { title: SUMMARY.definitionMs, description: formatMs(timings.definitionMs) },
    { title: SUMMARY.planningMs, description: formatMs(timings.planningMs) },
    { title: SUMMARY.probesMs, description: formatMs(timings.probesMs) },
    { title: SUMMARY.queriesMs, description: formatMs(timings.queriesMs) },
    { title: SUMMARY.slowestTook, description: formatMs(maxOf(queryTooks)) },
    { title: SUMMARY.sumTook, description: formatMs(sumOf(queryTooks)) },
    { title: SUMMARY.processingMs, description: formatMs(timings.processingMs) },
    { title: SUMMARY.rows, description: formatCount(rowCount) },
    { title: SUMMARY.truncated, description: formatBoolean(truncated) },
    { title: SUMMARY.errors, description: formatCount(errorCount) },
  ];

  return (
    <div data-test-subj="entityInventoryPerformanceListDetail">
      <EuiTitle size="xs">
        <h3>{SUMMARY_TITLE(route)}</h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiDescriptionList
        type="column"
        compressed
        listItems={summary}
        data-test-subj="entityInventoryPerformanceSummary"
      />
      <EuiSpacer size="s" />
      <EuiText size="xs" color="subdued">
        <p>{SUMMARY.browserMsHelp}</p>
        <p>{SUMMARY.concurrencyHelp}</p>
      </EuiText>

      <EuiSpacer size="m" />
      <EuiTitle size="xs">
        <h3>{PROBES_TITLE}</h3>
      </EuiTitle>
      <EuiBasicTable<ListProbeDiagnostic>
        tableCaption={PROBES_TITLE}
        items={probes}
        columns={PROBE_COLUMNS}
        compressed
        data-test-subj="entityInventoryPerformanceProbes"
      />

      <EuiSpacer size="m" />
      <EuiTitle size="xs">
        <h3>{QUERIES_TITLE}</h3>
      </EuiTitle>
      <EuiBasicTable<ListQueryDiagnostic>
        tableCaption={QUERIES_TITLE}
        items={queries}
        columns={QUERY_COLUMNS}
        compressed
        data-test-subj="entityInventoryPerformanceQueries"
      />

      <EuiSpacer size="m" />
      <EuiTitle size="xs">
        <h3>{ESQL_TITLE}</h3>
      </EuiTitle>
      {probes.map(({ indexPattern, esql, params }) => (
        <EsqlBlock
          key={`probe-${indexPattern}`}
          label={PROBE_ACCORDION_LABEL(indexPattern)}
          esql={esql}
          params={params}
        />
      ))}
      {queries.map(({ indexPattern, esql, params }, index) => (
        <EsqlBlock
          key={`query-${index}`}
          label={QUERY_ACCORDION_LABEL(index + 1, indexPattern)}
          esql={esql}
          params={params}
        />
      ))}
    </div>
  );
};
