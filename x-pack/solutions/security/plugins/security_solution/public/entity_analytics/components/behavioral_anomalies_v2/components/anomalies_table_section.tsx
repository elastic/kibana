/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { CriteriaWithPagination, EuiTableSortingType } from '@elastic/eui';
import {
  EuiButtonIcon,
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
  DEFAULT_PAGE_SIZE_V2,
  MOCK_ANOMALY_V2_TABLE_ROWS,
  PAGE_SIZE_OPTIONS_V2,
} from '../mock_tab_data';
import type { BehavioralAnomalyV2TableRow } from '../types';
import {
  ANOMALIES_TABLE_V2_ACTIONS_COLUMN,
  ANOMALIES_TABLE_V2_ANOMALY_COLUMN,
  ANOMALIES_TABLE_V2_BASELINE_COLUMN,
  ANOMALIES_TABLE_V2_COLLAPSE_ROW_ARIA,
  ANOMALIES_TABLE_V2_DESCRIPTION_HEADING,
  ANOMALIES_TABLE_V2_EXPAND_ROW_ARIA,
  ANOMALIES_TABLE_V2_JOB_COLUMN,
  ANOMALIES_TABLE_V2_SCORE_COLUMN,
  ANOMALIES_TABLE_V2_TACTIC_COLUMN,
  ANOMALIES_TABLE_V2_TIMESTAMP_COLUMN,
  ANOMALIES_TABLE_V2_TITLE,
} from '../translations';
import {
  BEHAVIORAL_ANOMALIES_V2_TABLE_ROW_DESCRIPTION_TEST_ID,
  BEHAVIORAL_ANOMALIES_V2_TABLE_ROW_EXPANDER_TEST_ID,
  BEHAVIORAL_ANOMALIES_V2_TABLE_SECTION_TEST_ID,
  BEHAVIORAL_ANOMALIES_V2_TABLE_TEST_ID,
} from '../test_ids';
import { AnomalyJobNameCellV2 } from './anomaly_job_name_cell';
import { AnomalyScoreBadgeV2 } from './anomaly_score_badge';
import { AnomalyRowActionsMenuV2 } from './anomaly_row_actions_menu';
import { TacticBadgesCellV2 } from './tactic_badges_cell';

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

interface AnomaliesTableSectionV2Props {
  /**
   * Tab-level tactic filter. When set, only rows whose `mitreTactics` include
   * the value are shown; when null/undefined, the full dataset renders.
   */
  selectedTactic?: string | null;
}

export const AnomaliesTableSectionV2: React.FC<AnomaliesTableSectionV2Props> = ({
  selectedTactic,
}) => {
  // Tracked locally only so the "Showing X-Y of Z" indicator stays in sync;
  // EuiInMemoryTable handles the actual paging/sorting internally.
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE_V2);

  // Each row is its own accordion. We track expanded ids in a Set so multiple
  // rows can be open at the same time.
  const [expandedRowIds, setExpandedRowIds] = useState<Set<string>>(() => new Set());

  // Filter the source rows once per filter change. When no filter is active
  // we reuse the original array reference so EuiInMemoryTable doesn't
  // re-paginate or re-sort needlessly.
  const filteredRows = useMemo(() => {
    if (!selectedTactic) return MOCK_ANOMALY_V2_TABLE_ROWS;
    return MOCK_ANOMALY_V2_TABLE_ROWS.filter((row) =>
      row.mitreTactics.includes(selectedTactic)
    );
  }, [selectedTactic]);
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

  const columns: Array<EuiBasicTableColumn<BehavioralAnomalyV2TableRow>> = useMemo(
    () => [
      {
        align: 'center',
        width: '32px',
        isExpander: true,
        name: '',
        render: (item: BehavioralAnomalyV2TableRow) => {
          const isExpanded = expandedRowIds.has(item.id);
          return (
            <EuiButtonIcon
              data-test-subj={`${BEHAVIORAL_ANOMALIES_V2_TABLE_ROW_EXPANDER_TEST_ID}-${item.id}`}
              aria-label={
                isExpanded ? ANOMALIES_TABLE_V2_COLLAPSE_ROW_ARIA : ANOMALIES_TABLE_V2_EXPAND_ROW_ARIA
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
        name: ANOMALIES_TABLE_V2_JOB_COLUMN,
        field: 'jobDisplayName',
        sortable: true,
        render: (_jobDisplayName: string, item: BehavioralAnomalyV2TableRow) => (
          <AnomalyJobNameCellV2 row={item} />
        ),
      },
      {
        name: ANOMALIES_TABLE_V2_TACTIC_COLUMN,
        field: 'mitreTactics',
        render: (_tactics: string[], item: BehavioralAnomalyV2TableRow) => (
          <TacticBadgesCellV2 tactics={item.mitreTactics} />
        ),
      },
      {
        name: ANOMALIES_TABLE_V2_TIMESTAMP_COLUMN,
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
        name: ANOMALIES_TABLE_V2_BASELINE_COLUMN,
        render: (item: BehavioralAnomalyV2TableRow) => (
          <EuiToolTip content={item.baseline} anchorProps={{ css: truncatedAnchorCss }}>
            <EuiText size="xs" component="span">
              {item.baseline}
            </EuiText>
          </EuiToolTip>
        ),
      },
      {
        name: ANOMALIES_TABLE_V2_ANOMALY_COLUMN,
        render: (item: BehavioralAnomalyV2TableRow) => (
          <EuiToolTip content={item.anomaly} anchorProps={{ css: truncatedAnchorCss }}>
            <EuiText size="xs" component="span">
              {item.anomaly}
            </EuiText>
          </EuiToolTip>
        ),
      },
      {
        name: ANOMALIES_TABLE_V2_SCORE_COLUMN,
        field: 'anomalyScore',
        sortable: true,
        width: '120px',
        render: (anomalyScore: number) => <AnomalyScoreBadgeV2 score={anomalyScore} />,
      },
      {
        name: ANOMALIES_TABLE_V2_ACTIONS_COLUMN,
        width: '64px',
        align: 'right',
        render: (item: BehavioralAnomalyV2TableRow) => <AnomalyRowActionsMenuV2 row={item} />,
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
          data-test-subj={`${BEHAVIORAL_ANOMALIES_V2_TABLE_ROW_DESCRIPTION_TEST_ID}-${row.id}`}
        >
          <EuiText size="xs">
            <strong>{ANOMALIES_TABLE_V2_DESCRIPTION_HEADING}</strong>
          </EuiText>
          <EuiSpacer size="xs" />
          <EuiText size="xs">{row.description}</EuiText>
        </div>
      );
    }
    return map;
  }, [expandedRowIds, filteredRows]);

  const sorting = useMemo<EuiTableSortingType<BehavioralAnomalyV2TableRow>>(
    () => ({
      sort: { field: 'timestamp', direction: 'desc' },
    }),
    []
  );

  const pagination = useMemo(
    () => ({
      initialPageSize: DEFAULT_PAGE_SIZE_V2,
      pageSizeOptions: PAGE_SIZE_OPTIONS_V2,
    }),
    []
  );

  const handleTableChange = useCallback(
    ({ page }: CriteriaWithPagination<BehavioralAnomalyV2TableRow>) => {
      setPageIndex(page.index);
      setPageSize(page.size);
    },
    []
  );

  const from = filteredRows.length > 0 ? pageIndex * pageSize + 1 : 0;
  const to = Math.min((pageIndex + 1) * pageSize, filteredRows.length);

  return (
    <div data-test-subj={BEHAVIORAL_ANOMALIES_V2_TABLE_SECTION_TEST_ID}>
      <EuiTitle size="xs">
        <h3>{ANOMALIES_TABLE_V2_TITLE}</h3>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiText size="xs">
        <FormattedMessage
          id="xpack.securitySolution.entityAnalytics.behavioralAnomaliesV2.table.showing"
          defaultMessage="Showing {from}-{to} of {total} anomalies"
          values={{
            from: <strong>{from}</strong>,
            to: <strong>{to}</strong>,
            total: <strong>{filteredRows.length}</strong>,
          }}
        />
      </EuiText>
      <EuiSpacer size="s" />
      {/* `key` is bound to the active filter so EuiInMemoryTable remounts
          (and resets its internal pagination back to page 0) whenever the
          dataset shrinks/grows — otherwise switching from 80 rows to 5 can
          leave the table stranded on an empty page. Trade-off: sort state
          resets too, which is acceptable for a prototype. */}
      <EuiInMemoryTable
        key={selectedTactic ?? 'all-tactics'}
        data-test-subj={BEHAVIORAL_ANOMALIES_V2_TABLE_TEST_ID}
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
  );
};
