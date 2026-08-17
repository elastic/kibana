/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiBadge,
  EuiBasicTable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSwitch,
  EuiText,
  EuiToolTip,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import type { WatchWorker, WatchWorkerAttachment } from '@kbn/pnd-common';
import { useWorkers } from '../../../hooks/use_workers_api';
import { formatRelativeTime } from './format_relative_time';
import * as sectionI18n from '../translations';
import * as i18n from '../settings_translations';
import * as workerI18n from '../workers/translations';

/** An attachment paired with the catalog entry it points at. */
interface WorkerRow {
  workerId: string;
  attachedEnabled: boolean;
  worker: WatchWorker | undefined;
}

/**
 * Reads like the design's status line: "enabled · last run 4m ago", or the reason it is not running.
 * A worker whose global flag is off reads as disabled everywhere, since effective enablement is the
 * global flag AND this watch's attachment.
 */
const statusLine = (row: WorkerRow): string => {
  const { worker, attachedEnabled } = row;
  if (!worker) {
    return i18n.STATUS_UNAVAILABLE;
  }
  if (!worker.enabled) {
    return i18n.STATUS_DISABLED_GLOBALLY;
  }
  if (!attachedEnabled) {
    return i18n.STATUS_DISABLED;
  }

  if (worker.state === 'paused') {
    return i18n.STATUS_PAUSED;
  }
  if (worker.state === 'unavailable') {
    return i18n.STATUS_UNAVAILABLE;
  }
  if (worker.state === 'degraded') {
    return worker.stateReason ? i18n.degradedStatus(worker.stateReason) : i18n.STATUS_DEGRADED;
  }

  const parts = [i18n.STATUS_ENABLED];
  if (worker.lastRun) {
    parts.push(i18n.lastRunStatus(formatRelativeTime(worker.lastRun)));
  }
  return parts.join(' · ');
};

interface WatchWorkersTableProps {
  attachments: WatchWorkerAttachment[];
  onToggle: (workerId: string, enabled: boolean) => void;
}

export const WatchWorkersTable: React.FC<WatchWorkersTableProps> = ({ attachments, onToggle }) => {
  const { data } = useWorkers();

  const rows = useMemo<WorkerRow[]>(() => {
    const byId = new Map((data?.workers ?? []).map((worker) => [worker.id, worker]));
    return attachments.map(({ workerId, enabled }) => ({
      workerId,
      attachedEnabled: enabled,
      worker: byId.get(workerId),
    }));
  }, [attachments, data?.workers]);

  const columns = useMemo<Array<EuiBasicTableColumn<WorkerRow>>>(
    () => [
      {
        field: 'workerId',
        name: i18n.COL_WORKER,
        render: (workerId: string, row: WorkerRow) => {
          const isGloballyOff = row.worker != null && !row.worker.enabled;
          return (
            <EuiFlexGroup direction="column" gutterSize="none" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiText size="s" color={isGloballyOff ? 'subdued' : undefined}>
                      <strong>{workerI18n.workerName(workerId)}</strong>
                    </EuiText>
                  </EuiFlexItem>
                  {row.worker?.lifecycle && row.worker.lifecycle !== 'ga' ? (
                    <EuiFlexItem grow={false}>
                      <EuiBadge color="hollow">
                        {row.worker.lifecycle === 'beta'
                          ? sectionI18n.LIFECYCLE_BETA
                          : sectionI18n.LIFECYCLE_PILOT}
                      </EuiBadge>
                    </EuiFlexItem>
                  ) : null}
                </EuiFlexGroup>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">
                  {statusLine(row)}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          );
        },
      },
      {
        field: 'attachedEnabled',
        name: i18n.COL_ENABLED,
        width: '100px',
        align: 'right',
        render: (attachedEnabled: boolean, row: WorkerRow) => {
          const isGloballyOff = row.worker != null && !row.worker.enabled;
          const control = (
            <EuiSwitch
              checked={attachedEnabled && !isGloballyOff}
              disabled={isGloballyOff}
              showLabel={false}
              label={workerI18n.enableWorkerAriaLabel(workerI18n.workerName(row.workerId))}
              data-test-subj={`pndWatchWorkerToggle-${row.workerId}`}
              onChange={(event) => onToggle(row.workerId, event.target.checked)}
            />
          );

          // Explain why the control is inert rather than leaving a dead switch.
          return isGloballyOff ? (
            <EuiToolTip content={i18n.STATUS_DISABLED_GLOBALLY}>{control}</EuiToolTip>
          ) : (
            control
          );
        },
      },
    ],
    [onToggle]
  );

  return (
    <EuiBasicTable
      items={rows}
      columns={columns}
      tableLayout="auto"
      tableCaption={i18n.WORKERS_SECTION_SUBTITLE}
      data-test-subj="pndWatchWorkersTable"
    />
  );
};
