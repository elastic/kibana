/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { CriteriaWithPagination, EuiTableSortingType } from '@elastic/eui';
import { EuiInMemoryTable, EuiSpacer, EuiText, EuiTitle, EuiToolTip } from '@elastic/eui';
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
  ANOMALIES_TABLE_V2_JOB_COLUMN,
  ANOMALIES_TABLE_V2_SCORE_COLUMN,
  ANOMALIES_TABLE_V2_SPIKE_COLUMN,
  ANOMALIES_TABLE_V2_TIMESTAMP_COLUMN,
  ANOMALIES_TABLE_V2_TITLE,
} from '../translations';
import {
  BEHAVIORAL_ANOMALIES_V2_TABLE_SECTION_TEST_ID,
  BEHAVIORAL_ANOMALIES_V2_TABLE_TEST_ID,
} from '../test_ids';
import { AnomalyJobNameCellV2 } from './anomaly_job_name_cell';
import { AnomalyScoreBadgeV2 } from './anomaly_score_badge';
import { AnomalyRowActionsMenuV2 } from './anomaly_row_actions_menu';

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

export const AnomaliesTableSectionV2: React.FC = () => {
  // Tracked locally only so the "Showing X-Y of Z" indicator stays in sync;
  // EuiInMemoryTable handles the actual paging/sorting internally.
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE_V2);

  const columns: Array<EuiBasicTableColumn<BehavioralAnomalyV2TableRow>> = useMemo(
    () => [
      {
        name: ANOMALIES_TABLE_V2_JOB_COLUMN,
        field: 'jobDisplayName',
        sortable: true,
        render: (_jobDisplayName: string, item: BehavioralAnomalyV2TableRow) => (
          <AnomalyJobNameCellV2 row={item} />
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
        name: ANOMALIES_TABLE_V2_SPIKE_COLUMN,
        field: 'spike',
        sortable: true,
        width: '64px',
        render: (spike: string | undefined) => <EuiText size="xs">{spike ?? 'N/A'}</EuiText>,
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
    []
  );

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

  const from = MOCK_ANOMALY_V2_TABLE_ROWS.length > 0 ? pageIndex * pageSize + 1 : 0;
  const to = Math.min((pageIndex + 1) * pageSize, MOCK_ANOMALY_V2_TABLE_ROWS.length);

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
            total: <strong>{MOCK_ANOMALY_V2_TABLE_ROWS.length}</strong>,
          }}
        />
      </EuiText>
      <EuiSpacer size="s" />
      <EuiInMemoryTable
        data-test-subj={BEHAVIORAL_ANOMALIES_V2_TABLE_TEST_ID}
        items={MOCK_ANOMALY_V2_TABLE_ROWS}
        itemId="id"
        columns={columns}
        sorting={sorting}
        pagination={pagination}
        onTableChange={handleTableChange}
        compressed
      />
    </div>
  );
};
