/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiBadge, EuiBasicTable, EuiText, type EuiBasicTableColumn } from '@elastic/eui';
import type { WatchLedgerEntry, WatchRunAction, WatchRunOutcome } from '@kbn/pnd-common';
import * as i18n from '../settings_translations';
import * as workerI18n from '../workers/translations';
import * as skillI18n from '../skills_table_translations';

/** Draft and gated runs are awaiting a human, so they read as accented rather than neutral. */
const ACTION_BADGE_COLOR: Record<WatchRunAction, string> = {
  read: 'hollow',
  draft: 'accent',
  gated: 'warning',
  auto: 'primary',
};

const OUTCOME_COLOR: Record<WatchRunOutcome, string | undefined> = {
  'awaiting-review': 'warning',
  accepted: 'success',
  dismissed: 'subdued',
  executed: 'success',
  completed: undefined,
};

/**
 * A ledger row names the worker or skill that ran, so resolve against both copy maps. Ids are unique
 * only within a kind, and workers are checked first because they orchestrate the run.
 */
const callableName = (callableId: string): string => {
  const asWorker = workerI18n.WORKER_NAMES[callableId];
  return asWorker ?? skillI18n.skillName(callableId);
};

const timeOfDay = (isoTimestamp: string): string => {
  const parsed = new Date(isoTimestamp);
  if (Number.isNaN(parsed.getTime())) {
    return isoTimestamp;
  }
  return parsed.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
};

interface WatchRunsLedgerProps {
  entries: WatchLedgerEntry[];
}

export const WatchRunsLedger: React.FC<WatchRunsLedgerProps> = ({ entries }) => {
  const columns = useMemo<Array<EuiBasicTableColumn<WatchLedgerEntry>>>(
    () => [
      {
        field: 'time',
        name: i18n.COL_TIME,
        width: '90px',
        render: (time: string) => (
          <EuiText size="s" color="subdued">
            {timeOfDay(time)}
          </EuiText>
        ),
      },
      {
        field: 'callableId',
        name: i18n.COL_WORKFLOW,
        width: '190px',
        render: (callableId: string) => <EuiText size="s">{callableName(callableId)}</EuiText>,
      },
      {
        field: 'action',
        name: i18n.COL_ACTION,
        width: '110px',
        render: (action: WatchRunAction) => (
          <EuiBadge color={ACTION_BADGE_COLOR[action]}>
            {i18n.RUN_ACTION_LABELS[action] ?? action}
          </EuiBadge>
        ),
      },
      {
        field: 'event',
        name: i18n.COL_EVENT,
        render: (event: string) => <EuiText size="s">{event}</EuiText>,
      },
      {
        field: 'outcome',
        name: i18n.COL_OUTCOME,
        width: '150px',
        render: (outcome: WatchRunOutcome) => (
          <EuiText size="s" color={OUTCOME_COLOR[outcome]}>
            {i18n.RUN_OUTCOME_LABELS[outcome] ?? outcome}
          </EuiText>
        ),
      },
    ],
    []
  );

  return (
    <EuiBasicTable
      items={entries}
      columns={columns}
      tableLayout="auto"
      tableCaption={i18n.LEDGER_SECTION_SUBTITLE}
      noItemsMessage={i18n.NO_LEDGER_ENTRIES}
      data-test-subj="pndWatchRunsLedger"
    />
  );
};
