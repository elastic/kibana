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
  type EuiBasicTableColumn,
} from '@elastic/eui';
import type { Worker, WorkerRunState } from '@kbn/pnd-common';
import { useUpdateWorker, useWorkers } from '../../../hooks/use_workers_api';
import { formatRelativeTime } from '../components/format_relative_time';
import { WatchBadges } from '../components/watch_badges';
import * as sectionI18n from '../translations';
import * as i18n from './translations';

/** Workers report health, so the last-run cell doubles as a status cell. */
const LastRunCell: React.FC<{ lastRun: string | null; state: WorkerRunState }> = ({
  lastRun,
  state,
}) => {
  if (state === 'paused') {
    return (
      <EuiText size="s" color="subdued">
        {sectionI18n.RUN_STATE_PAUSED}
      </EuiText>
    );
  }

  if (state === 'unavailable') {
    return (
      <EuiText size="s" color="warning">
        {sectionI18n.RUN_STATE_UNAVAILABLE}
      </EuiText>
    );
  }

  if (lastRun == null) {
    return (
      <EuiText size="s" color="subdued">
        {sectionI18n.NOT_RUN_YET}
      </EuiText>
    );
  }

  return (
    <EuiText size="s" color={state === 'degraded' ? 'warning' : undefined}>
      {formatRelativeTime(lastRun)}
    </EuiText>
  );
};

export const WorkersTable: React.FC = () => {
  const { data, isLoading, error } = useWorkers();
  const { mutate: updateWorker } = useUpdateWorker();

  const columns = useMemo<Array<EuiBasicTableColumn<Worker>>>(
    () => [
      {
        field: 'id',
        name: i18n.COL_WORKER,
        render: (_id: string, worker: Worker) => {
          const description = i18n.workerDescription(worker.id);
          return (
            <EuiFlexGroup direction="column" gutterSize="none" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiText size="s">
                      <strong>{i18n.workerName(worker.id, worker.name)}</strong>
                    </EuiText>
                  </EuiFlexItem>
                  {worker.lifecycle && worker.lifecycle !== 'ga' ? (
                    <EuiFlexItem grow={false}>
                      <EuiBadge color="hollow">
                        {worker.lifecycle === 'beta'
                          ? sectionI18n.LIFECYCLE_BETA
                          : sectionI18n.LIFECYCLE_PILOT}
                      </EuiBadge>
                    </EuiFlexItem>
                  ) : null}
                </EuiFlexGroup>
              </EuiFlexItem>
              {description ? (
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" color="subdued">
                    {description}
                  </EuiText>
                </EuiFlexItem>
              ) : null}
            </EuiFlexGroup>
          );
        },
      },
      {
        field: 'watchIds',
        name: i18n.COL_WATCHES,
        width: '220px',
        render: (watchIds: string[]) => <WatchBadges watchIds={watchIds} />,
      },
      {
        field: 'lastRun',
        name: i18n.COL_LAST_RUN,
        width: '140px',
        render: (lastRun: string | null, worker: Worker) => (
          <LastRunCell lastRun={lastRun} state={worker.state} />
        ),
      },
      {
        field: 'enabled',
        name: i18n.COL_ENABLED,
        width: '100px',
        align: 'right',
        render: (enabled: boolean, worker: Worker) => (
          <EuiSwitch
            checked={enabled}
            showLabel={false}
            label={i18n.enableWorkerAriaLabel(i18n.workerName(worker.id, worker.name))}
            disabled={worker.state === 'unavailable'}
            data-test-subj={`pndWorkerToggle-${worker.id}`}
            onChange={(event) =>
              updateWorker({ workerId: worker.id, patch: { enabled: event.target.checked } })
            }
          />
        ),
      },
    ],
    [updateWorker]
  );

  return (
    <EuiBasicTable
      items={data?.workers ?? []}
      columns={columns}
      tableLayout="auto"
      tableCaption={i18n.TABLE_CAPTION}
      loading={isLoading}
      error={error ? i18n.LOAD_ERROR : undefined}
      noItemsMessage={i18n.NO_WORKERS}
      data-test-subj="pndWorkersTable"
    />
  );
};
