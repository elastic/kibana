/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiBadge, EuiBasicTable, EuiText, type EuiBasicTableColumn } from '@elastic/eui';
import type { WatchRecentRun } from '@kbn/pnd-common';
import * as i18n from '../translations';

interface RecentRunsTableProps {
  runs: WatchRecentRun[];
}

export const RecentRunsTable: React.FC<RecentRunsTableProps> = ({ runs }) => {
  const columns = useMemo<Array<EuiBasicTableColumn<WatchRecentRun>>>(
    () => [
      {
        field: 'startedAt',
        name: i18n.COL_TIME,
        width: '160px',
        render: (startedAt: string) => (
          <EuiText size="s">
            <code>{startedAt}</code>
          </EuiText>
        ),
      },
      {
        field: 'status',
        name: i18n.COL_STATUS,
        width: '120px',
        render: (status: string) => <EuiBadge color="hollow">{status}</EuiBadge>,
      },
      {
        field: 'summary',
        name: i18n.COL_SUMMARY,
        truncateText: true,
        render: (_summary: string, run: WatchRecentRun) => {
          if (run.steps.length > 0) {
            return run.steps.map((s) => s.name).join(' → ');
          }
          return run.summary;
        },
      },
      {
        field: 'triggerType',
        name: i18n.COL_TRIGGER,
        width: '120px',
        render: (triggerType: string | undefined) => triggerType ?? '—',
      },
    ],
    []
  );

  if (runs.length === 0) {
    return (
      <EuiText size="s" color="subdued">
        {i18n.NO_RUNS_YET}
      </EuiText>
    );
  }

  return (
    <EuiBasicTable
      items={runs}
      columns={columns}
      tableLayout="auto"
      tableCaption={i18n.RECENT_RUNS_TABLE_CAPTION}
    />
  );
};
