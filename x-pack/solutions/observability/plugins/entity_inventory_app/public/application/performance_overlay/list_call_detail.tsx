/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ReactNode } from 'react';
import { css } from '@emotion/react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiAccordion,
  EuiBasicTable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { UnavailableColumn } from '@kbn/entity-inventory-plugin/common';
import { ProbesTable, QueriesTable } from './diagnostic_tables';
import { formatCount, formatMs, formatRequest } from './format';
import type { ListCallDiagnostics, RecordedCall } from './performance_recorder';
import { ElasticsearchTable, TimingsTable } from './summary_tables';
import {
  ROUND_TRIP,
  SECTION_TITLES,
  STATUS_LABELS,
  SUMMARY_TITLES,
  TABLE_COLUMNS,
  TRUNCATED,
  UNAVAILABLE_COLUMNS_TITLE,
} from './translations';

const UNAVAILABLE_COLUMN_COLUMNS: Array<EuiBasicTableColumn<UnavailableColumn>> = [
  { field: 'column', name: TABLE_COLUMNS.column },
  { field: 'indexPattern', name: TABLE_COLUMNS.indexPattern },
  { field: 'field', name: TABLE_COLUMNS.field },
];

/** One entry per column, index pattern and field; a pattern planned as TS and FROM reports each twice. */
const dedupeUnavailableColumns = (columns: readonly UnavailableColumn[]): UnavailableColumn[] => [
  ...new Map(
    columns.map((unavailable) => [
      JSON.stringify([unavailable.column, unavailable.indexPattern, unavailable.field]),
      unavailable,
    ])
  ).values(),
];

const Section = ({
  title,
  testSubj,
  children,
}: {
  title: string;
  testSubj: string;
  children: ReactNode;
}) => (
  <section data-test-subj={testSubj}>
    <EuiTitle size="xxs">
      <h4>{title}</h4>
    </EuiTitle>
    <EuiSpacer size="xs" />
    {children}
    <EuiSpacer size="l" />
  </section>
);

export interface ListCallDetailProps {
  call: RecordedCall;
  list: ListCallDiagnostics;
}

/** Browser and server times of one `_list` call, and the status and stats of each probe and query. */
export const ListCallDetail = ({ call, list }: ListCallDetailProps) => {
  const { euiTheme } = useEuiTheme();
  // Below these widths a table would squeeze its labels, so the Elasticsearch table wraps under the timings.
  const timingsItemCss = css`
    min-width: calc(${euiTheme.size.base} * 24);
  `;
  const elasticsearchItemCss = css`
    min-width: calc(${euiTheme.size.base} * 20);
  `;
  const unavailableAccordionId = useGeneratedHtmlId({
    prefix: 'entityInventoryPerformanceUnavailable',
  });
  const { browserMs, route, startedAt, status } = call;
  const { timings, queries, probes, rowCount, truncated, unavailableColumns } = list;
  const unavailable = dedupeUnavailableColumns(unavailableColumns);

  const subtitle = [
    new Date(startedAt).toLocaleTimeString(),
    STATUS_LABELS[status],
    ROUND_TRIP(formatMs(browserMs)),
    formatCount(rowCount, 'rows'),
    ...(truncated ? [TRUNCATED] : []),
  ].join(' · ');

  return (
    <div data-test-subj="entityInventoryPerformanceListDetail">
      <EuiTitle size="s">
        <h3 data-test-subj="entityInventoryPerformanceDetailTitle">{formatRequest(route)}</h3>
      </EuiTitle>
      <EuiText size="xs" color="subdued" data-test-subj="entityInventoryPerformanceDetailSubtitle">
        <p>{subtitle}</p>
      </EuiText>
      <EuiSpacer size="m" />

      <EuiFlexGroup gutterSize="l" wrap>
        <EuiFlexItem css={timingsItemCss}>
          <Section
            title={SUMMARY_TITLES.timings}
            testSubj="entityInventoryPerformanceTimingsSection"
          >
            <TimingsTable browserMs={browserMs} timings={timings} />
          </Section>
        </EuiFlexItem>
        <EuiFlexItem css={elasticsearchItemCss}>
          <Section
            title={SUMMARY_TITLES.elasticsearch}
            testSubj="entityInventoryPerformanceElasticsearchSection"
          >
            <ElasticsearchTable queries={queries} probes={probes} />
          </Section>
        </EuiFlexItem>
      </EuiFlexGroup>

      <Section title={SECTION_TITLES.queries} testSubj="entityInventoryPerformanceQueries">
        <QueriesTable queries={queries} />
      </Section>

      <Section title={SECTION_TITLES.probes} testSubj="entityInventoryPerformanceProbes">
        <ProbesTable probes={probes} />
      </Section>

      {unavailable.length > 0 && (
        <EuiAccordion
          id={unavailableAccordionId}
          buttonContent={UNAVAILABLE_COLUMNS_TITLE(unavailable.length)}
          paddingSize="s"
          data-test-subj="entityInventoryPerformanceUnavailableColumns"
        >
          <EuiBasicTable<UnavailableColumn>
            tableCaption={UNAVAILABLE_COLUMNS_TITLE(unavailable.length)}
            items={unavailable}
            columns={UNAVAILABLE_COLUMN_COLUMNS}
            compressed
          />
        </EuiAccordion>
      )}
    </div>
  );
};
