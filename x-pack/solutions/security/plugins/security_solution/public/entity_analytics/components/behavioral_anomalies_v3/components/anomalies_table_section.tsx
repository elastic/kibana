/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { CriteriaWithPagination, EuiTableSortingType } from '@elastic/eui';
import {
  EuiAccordion,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiInMemoryTable,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import { PreferenceFormattedDate } from '../../../../common/components/formatted_date';
import {
  DEFAULT_PAGE_SIZE_V3,
  getSeverityBucketV3,
  MOCK_ANOMALY_V3_TABLE_ROWS,
  PAGE_SIZE_OPTIONS_V3,
} from '../mock_tab_data';
import type { BehavioralAnomalyV3TableRow } from '../types';
import {
  ANOMALIES_TABLE_V3_ACTIONS_COLUMN,
  ANOMALIES_TABLE_V3_ANOMALY_COLUMN,
  ANOMALIES_TABLE_V3_BASELINE_COLUMN,
  ANOMALIES_TABLE_V3_COLLAPSE_ROW_ARIA,
  ANOMALIES_TABLE_V3_DESCRIPTION_HEADING,
  ANOMALIES_TABLE_V3_EXPAND_ROW_ARIA,
  ANOMALIES_TABLE_V3_JOB_COLUMN,
  ANOMALIES_TABLE_V3_SCORE_COLUMN,
  ANOMALIES_TABLE_V3_SCORE_COLUMN_TOOLTIP,
  ANOMALIES_TABLE_V3_TACTIC_COLUMN,
  ANOMALIES_TABLE_V3_TIMESTAMP_COLUMN,
  ANOMALIES_TABLE_V3_TITLE,
} from '../translations';
import {
  BEHAVIORAL_ANOMALIES_V3_TABLE_ACCORDION_TEST_ID,
  BEHAVIORAL_ANOMALIES_V3_TABLE_ROW_DESCRIPTION_TEST_ID,
  BEHAVIORAL_ANOMALIES_V3_TABLE_ROW_EXPANDER_TEST_ID,
  BEHAVIORAL_ANOMALIES_V3_TABLE_SCORE_HEADER_TOOLTIP_TEST_ID,
  BEHAVIORAL_ANOMALIES_V3_TABLE_SECTION_TEST_ID,
  BEHAVIORAL_ANOMALIES_V3_TABLE_TEST_ID,
} from '../test_ids';
import { AnomalyJobNameCellV3 } from './anomaly_job_name_cell';
import { AnomalyScoreBadgeV3 } from './anomaly_score_badge';
import { AnomalyRowActionsMenuV3 } from './anomaly_row_actions_menu';
import { TacticBadgesCellV3 } from './tactic_badges_cell';

// Applied to the EuiToolTip anchor (via `anchorProps`) for cells whose content
// can overflow the column. Putting the truncation rules on the element that
// directly contains the text is what lets `text-overflow: ellipsis` actually
// render the three dots — when the rules sit on an outer wrapper whose only
// child is an `inline-block` atomic box (EuiToolTip's default anchor), the
// browser clips but does not draw the ellipsis. `min-width: 0` is required so
// the anchor can shrink below its intrinsic content width inside the cell's
// flex container.
const truncatedAnchorCss = css`
  display: block;
  width: 100%;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

/*
 * `EuiInMemoryTable` (via `EuiBasicTable`'s internal `PaginationBar`) hard-
 * codes an `EuiSpacer size="m"` (16 px) between the last row of the table
 * and the page navigation controls. There is no prop to tune it, so we
 * shrink it to 8 px by overriding the EuiSpacer height for the spacer that
 * lives directly inside the pagination wrapper. The selector is scoped to
 * `.euiBasicTable > div > .euiSpacer--m` so it only ever matches the
 * pagination spacer (the table itself is a `<table>`, not a div, so the
 * `> div` step never picks up another spacer).
 */
const compactPaginationSpacerCss = css`
  .euiBasicTable > div > .euiSpacer.euiSpacer--m {
    block-size: 8px;
    height: 8px;
  }
`;

interface AnomaliesTableSectionV3Props {
  /**
   * Tab-level tactic filter. When set, only rows whose `mitreTactics` include
   * the value are shown; when null/undefined, the full dataset renders.
   */
  selectedTactic?: string | null;
  /**
   * Tab-level time range filter (driven by the date range picker at the top
   * of the tab). Only rows whose `timestamp` falls inside the bounds are
   * shown. When omitted, all rows are shown.
   */
  timeRangeMs?: { from: number; to: number };
  /**
   * Tab-level Anomaly score filter. When provided, only rows whose
   * `anomalyScore` falls into one of the selected severity buckets are
   * shown. `undefined` = no filter (all buckets selected).
   */
  allowedSeverityThresholds?: ReadonlySet<number>;
}

export const AnomaliesTableSectionV3: React.FC<AnomaliesTableSectionV3Props> = ({
  selectedTactic,
  timeRangeMs,
  allowedSeverityThresholds,
}) => {
  // Tracked locally only so the "Showing X-Y of Z" indicator stays in sync;
  // EuiInMemoryTable handles the actual paging/sorting internally.
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE_V3);

  // Each row is its own accordion. We track expanded ids in a Set so multiple
  // rows can be open at the same time.
  const [expandedRowIds, setExpandedRowIds] = useState<Set<string>>(() => new Set());

  // Filter the source rows by the active tactic, time range, and severity
  // selection. When no filter narrows the data we reuse the original array
  // reference so EuiInMemoryTable doesn't re-paginate or re-sort needlessly.
  const filteredRows = useMemo(() => {
    const tacticPredicate = selectedTactic
      ? (row: BehavioralAnomalyV3TableRow) => row.mitreTactics.includes(selectedTactic)
      : null;
    const timePredicate = timeRangeMs
      ? (row: BehavioralAnomalyV3TableRow) =>
          row.timestamp >= timeRangeMs.from && row.timestamp <= timeRangeMs.to
      : null;
    const severityPredicate = allowedSeverityThresholds
      ? (row: BehavioralAnomalyV3TableRow) =>
          allowedSeverityThresholds.has(getSeverityBucketV3(row.anomalyScore))
      : null;
    if (!tacticPredicate && !timePredicate && !severityPredicate)
      return MOCK_ANOMALY_V3_TABLE_ROWS;
    return MOCK_ANOMALY_V3_TABLE_ROWS.filter(
      (row) =>
        (!tacticPredicate || tacticPredicate(row)) &&
        (!timePredicate || timePredicate(row)) &&
        (!severityPredicate || severityPredicate(row))
    );
  }, [selectedTactic, timeRangeMs, allowedSeverityThresholds]);
  const toggleRowExpanded = useCallback((id: string) => {
    setExpandedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const columns: Array<EuiBasicTableColumn<BehavioralAnomalyV3TableRow>> = useMemo(
    () => [
      {
        align: 'center',
        width: '32px',
        isExpander: true,
        name: '',
        render: (item: BehavioralAnomalyV3TableRow) => {
          const isExpanded = expandedRowIds.has(item.id);
          return (
            <EuiButtonIcon
              data-test-subj={`${BEHAVIORAL_ANOMALIES_V3_TABLE_ROW_EXPANDER_TEST_ID}-${item.id}`}
              aria-label={
                isExpanded ? ANOMALIES_TABLE_V3_COLLAPSE_ROW_ARIA : ANOMALIES_TABLE_V3_EXPAND_ROW_ARIA
              }
              aria-expanded={isExpanded}
              iconType={isExpanded ? 'arrowDown' : 'arrowRight'}
              color="text"
              onClick={() => toggleRowExpanded(item.id)}
            />
          );
        },
      },
      {
        name: ANOMALIES_TABLE_V3_JOB_COLUMN,
        field: 'jobDisplayName',
        sortable: true,
        render: (_jobDisplayName: string, item: BehavioralAnomalyV3TableRow) => (
          <AnomalyJobNameCellV3 row={item} />
        ),
      },
      {
        name: ANOMALIES_TABLE_V3_TACTIC_COLUMN,
        field: 'mitreTactics',
        render: (_tactics: string[], item: BehavioralAnomalyV3TableRow) => (
          <TacticBadgesCellV3 tactics={item.mitreTactics} />
        ),
      },
      {
        name: ANOMALIES_TABLE_V3_TIMESTAMP_COLUMN,
        field: 'timestamp',
        sortable: true,
        render: (timestamp: number) => (
          <EuiToolTip
            content={<PreferenceFormattedDate value={new Date(timestamp)} />}
            anchorProps={{ css: truncatedAnchorCss }}
          >
            <EuiText size="xs" component="span">
              <PreferenceFormattedDate value={new Date(timestamp)} />
            </EuiText>
          </EuiToolTip>
        ),
      },
      {
        name: ANOMALIES_TABLE_V3_BASELINE_COLUMN,
        render: (item: BehavioralAnomalyV3TableRow) => (
          <EuiToolTip content={item.baseline} anchorProps={{ css: truncatedAnchorCss }}>
            <EuiText size="xs" component="span">
              {item.baseline}
            </EuiText>
          </EuiToolTip>
        ),
      },
      {
        name: ANOMALIES_TABLE_V3_ANOMALY_COLUMN,
        render: (item: BehavioralAnomalyV3TableRow) => (
          <EuiToolTip content={item.anomaly} anchorProps={{ css: truncatedAnchorCss }}>
            <EuiText size="xs" component="span">
              {item.anomaly}
            </EuiText>
          </EuiToolTip>
        ),
      },
      {
        // `name` accepts a ReactNode — we render the column title plus a
        // question-mark `EuiIconTip` to explain how the score is computed.
        name: (
          <EuiFlexGroup
            gutterSize="xs"
            alignItems="center"
            responsive={false}
            css={css`
              flex-wrap: nowrap;
            `}
          >
            <EuiFlexItem grow={false}>{ANOMALIES_TABLE_V3_SCORE_COLUMN}</EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiIconTip
                type="questionInCircle"
                content={ANOMALIES_TABLE_V3_SCORE_COLUMN_TOOLTIP}
                position="top"
                data-test-subj={BEHAVIORAL_ANOMALIES_V3_TABLE_SCORE_HEADER_TOOLTIP_TEST_ID}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
        field: 'anomalyScore',
        sortable: true,
        width: '136px',
        render: (anomalyScore: number) => <AnomalyScoreBadgeV3 score={anomalyScore} />,
      },
      {
        name: ANOMALIES_TABLE_V3_ACTIONS_COLUMN,
        width: '64px',
        align: 'right',
        render: (item: BehavioralAnomalyV3TableRow) => <AnomalyRowActionsMenuV3 row={item} />,
      },
    ],
    [expandedRowIds, toggleRowExpanded]
  );

  // EuiInMemoryTable accepts an `itemIdToExpandedRowMap` mapping the row id
  // to the node rendered as its expanded panel. Description block is kept
  // compact (heading + paragraph) to match the design.
  const itemIdToExpandedRowMap = useMemo(() => {
    const map: Record<string, React.ReactNode> = {};
    for (const row of filteredRows) {
      if (!expandedRowIds.has(row.id)) continue;
      map[row.id] = (
        <div
          data-test-subj={`${BEHAVIORAL_ANOMALIES_V3_TABLE_ROW_DESCRIPTION_TEST_ID}-${row.id}`}
        >
          <EuiText size="xs">
            <strong>{ANOMALIES_TABLE_V3_DESCRIPTION_HEADING}</strong>
          </EuiText>
          <EuiSpacer size="xs" />
          <EuiText size="xs">{row.description}</EuiText>
        </div>
      );
    }
    return map;
  }, [expandedRowIds, filteredRows]);

  const sorting = useMemo<EuiTableSortingType<BehavioralAnomalyV3TableRow>>(
    () => ({
      sort: { field: 'timestamp', direction: 'desc' },
    }),
    []
  );

  const pagination = useMemo(
    () => ({
      initialPageSize: DEFAULT_PAGE_SIZE_V3,
      pageSizeOptions: PAGE_SIZE_OPTIONS_V3,
    }),
    []
  );

  const handleTableChange = useCallback(
    ({ page }: CriteriaWithPagination<BehavioralAnomalyV3TableRow>) => {
      setPageIndex(page.index);
      setPageSize(page.size);
    },
    []
  );

  const from = filteredRows.length > 0 ? pageIndex * pageSize + 1 : 0;
  const to = Math.min((pageIndex + 1) * pageSize, filteredRows.length);

  return (
    <div data-test-subj={BEHAVIORAL_ANOMALIES_V3_TABLE_SECTION_TEST_ID}>
      <EuiAccordion
        id="behavioralAnomaliesV3AnomaliesTableAccordion"
        data-test-subj={BEHAVIORAL_ANOMALIES_V3_TABLE_ACCORDION_TEST_ID}
        initialIsOpen
        buttonContent={
          <EuiTitle size="xs">
            <h3>{ANOMALIES_TABLE_V3_TITLE}</h3>
          </EuiTitle>
        }
      >
        <EuiSpacer size="m" />
        <EuiText size="xs">
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.behavioralAnomaliesV3.table.showing"
            defaultMessage="Showing {from}-{to} of {total} anomalies"
            values={{
              from: <strong>{from}</strong>,
              to: <strong>{to}</strong>,
              total: <strong>{filteredRows.length}</strong>,
            }}
          />
        </EuiText>
        <EuiSpacer size="s" />
        {/* `key` is bound to the active filters (tactic + time range) so
            EuiInMemoryTable remounts (and resets its internal pagination back
            to page 0) whenever the dataset shrinks/grows — otherwise
            switching from 80 rows to 5 can leave the table stranded on an
            empty page. Trade-off: sort state resets too, which is acceptable
            for a prototype. */}
        {/* Wrapper exists only to scope the pagination-spacer override
            (see `compactPaginationSpacerCss`). */}
        <div css={compactPaginationSpacerCss}>
          <EuiInMemoryTable
            key={`${selectedTactic ?? 'all-tactics'}|${timeRangeMs?.from ?? ''}|${
              timeRangeMs?.to ?? ''
            }|${
              allowedSeverityThresholds
                ? [...allowedSeverityThresholds].sort((a, b) => a - b).join(',')
                : 'all-severities'
            }`}
            data-test-subj={BEHAVIORAL_ANOMALIES_V3_TABLE_TEST_ID}
            items={filteredRows}
            itemId="id"
            columns={columns}
            sorting={sorting}
            pagination={pagination}
            onTableChange={handleTableChange}
            compressed
            itemIdToExpandedRowMap={itemIdToExpandedRowMap}
            isExpandable
          />
        </div>
      </EuiAccordion>
    </div>
  );
};
