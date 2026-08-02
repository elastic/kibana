/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiBadge, EuiInMemoryTable, EuiText, type EuiBasicTableColumn } from '@elastic/eui';
import { FormattedRelative } from '@kbn/i18n-react';
import type { PndRun, PndRunStatus } from '@kbn/pnd-common';

import { RunStatusBadge } from '../../../../components/run_status_badge';
// the five managed watches have one set of display names; resolving them twice is
// how the queue and the ledger would end up disagreeing about the same watch
import { watchLabel } from '../../../conversations/helpers/watch_label';
import { RunActions } from './run_actions';
import * as i18n from '../../translations';

export interface RunsTableProps {
  runs: PndRun[];
}

const PAGE_SIZE_OPTIONS = [10, 20, 50];

/**
 * The run and trust ledger: every recent PND orchestrator run, with a way into the
 * real execution behind each one.
 *
 * Rows come back newest-first from the route and the table keeps that as its
 * default sort. `pendingGateCount` is rendered as *who the run is waiting on*
 * rather than a bare number, because "1 approval" is the actionable state an
 * analyst scans this table for — and it is the same fact that decides whether the
 * deep link lands on a step or on the run.
 *
 * `reason` gets its own column even though it is empty for every non-terminal run:
 * a failed or cancelled run's reason is the whole reason to look at the ledger,
 * and folding it into the summary would let a failure read as a summary.
 */
export const RunsTable: React.FC<RunsTableProps> = ({ runs }) => {
  const columns = useMemo<Array<EuiBasicTableColumn<PndRun>>>(
    () => [
      {
        field: 'watchId',
        name: i18n.ACTIVITY_COL_WATCH,
        render: (watchId: string) => (
          <EuiBadge color="hollow" data-test-subj="pndRunWatch">
            {watchLabel(watchId)}
          </EuiBadge>
        ),
        sortable: true,
      },
      {
        field: 'startedAt',
        name: i18n.ACTIVITY_COL_STARTED,
        render: (startedAt: string) => (
          <EuiText size="s">
            {/* raw ISO in `dateTime` so the timestamp stays machine-readable and
                assertable without pinning a timezone in tests */}
            <time dateTime={startedAt} data-test-subj="pndRunStartedAt">
              <FormattedRelative value={startedAt} />
            </time>
          </EuiText>
        ),
        sortable: true,
      },
      {
        field: 'status',
        name: i18n.ACTIVITY_COL_STATUS,
        render: (status: PndRunStatus) => <RunStatusBadge status={status} />,
        sortable: true,
      },
      {
        field: 'summary',
        name: i18n.ACTIVITY_COL_SUMMARY,
        render: (summary: string) => (
          <EuiText data-test-subj="pndRunSummary" size="s">
            {summary}
          </EuiText>
        ),
        truncateText: true,
      },
      {
        field: 'pendingGateCount',
        name: i18n.ACTIVITY_COL_APPROVALS,
        render: (pendingGateCount: number) =>
          pendingGateCount > 0 ? (
            <EuiBadge color="warning" data-test-subj="pndRunPendingGateCount">
              {i18n.pendingGateCountLabel(pendingGateCount)}
            </EuiBadge>
          ) : (
            <EuiText color="subdued" data-test-subj="pndRunNoPendingGates" size="xs">
              {i18n.NO_PENDING_GATES}
            </EuiText>
          ),
        sortable: true,
      },
      {
        field: 'reason',
        name: i18n.RUN_REASON_LABEL,
        render: (reason: string | undefined) =>
          reason != null && reason.length > 0 ? (
            <EuiText color="danger" data-test-subj="pndRunReason" size="xs">
              {reason}
            </EuiText>
          ) : (
            <EuiText color="subdued" size="xs">
              {'—'}
            </EuiText>
          ),
        truncateText: true,
      },
      {
        name: i18n.ACTIVITY_COL_ACTIONS,
        render: (run: PndRun) => <RunActions run={run} />,
      },
    ],
    []
  );

  return (
    <EuiInMemoryTable
      columns={columns}
      data-test-subj="pndRunsTable"
      items={runs}
      itemId="executionId"
      pagination={{ initialPageSize: 20, pageSizeOptions: PAGE_SIZE_OPTIONS }}
      sorting={{ sort: { direction: 'desc', field: 'startedAt' } }}
      tableCaption={i18n.ACTIVITY_TABLE_CAPTION}
      tableLayout="auto"
    />
  );
};
