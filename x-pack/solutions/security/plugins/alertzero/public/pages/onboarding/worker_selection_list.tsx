/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPanel, EuiSpacer, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { CatalogWorker, ServerWorker } from './use_worker_selection';
import { WorkerSelectionRow } from './worker_selection_row';
import * as i18n from './translations';

interface Props {
  workers: readonly CatalogWorker[];
  serverWorkers: ReadonlyMap<string, ServerWorker>;
  workerEnabled: Readonly<Record<string, boolean>>;
  enabledCount: number;
  isSaving: boolean;
  /** Disables every toggle, for a user who can't change Workers or a space with no AI model. */
  isLocked: boolean;
  onToggle: (workerId: string, checked: boolean) => void;
}

export const WorkerSelectionList: React.FC<Props> = ({
  workers,
  serverWorkers,
  workerEnabled,
  enabledCount,
  isSaving,
  isLocked,
  onToggle,
}) => {
  const { euiTheme } = useEuiTheme();

  if (workers.length === 0) {
    return (
      <EuiPanel hasBorder hasShadow={false} paddingSize="l">
        <div data-test-subj="alertZeroOnboardingNoWorkersAvailable">
          <EuiText size="s" color="subdued">
            <p>{i18n.ONBOARDING_NO_WORKERS_AVAILABLE}</p>
          </EuiText>
        </div>
      </EuiPanel>
    );
  }

  return (
    <>
      {workers.map((worker, index) => {
        const checked = workerEnabled[worker.id] ?? false;
        return (
          <React.Fragment key={worker.id}>
            {index > 0 && <EuiSpacer size="m" />}
            <EuiPanel
              hasBorder
              hasShadow={false}
              paddingSize="none"
              data-test-subj={`alertZeroOnboardingWorkerCard-${worker.id}`}
            >
              <WorkerSelectionRow
                worker={worker}
                serverWorker={serverWorkers.get(worker.id)}
                scheduleInterval={serverWorkers.get(worker.id)?.settings?.scheduleInterval}
                checked={checked}
                disabled={(checked && enabledCount <= 1) || isSaving || isLocked}
                onToggle={onToggle}
              />
            </EuiPanel>
          </React.Fragment>
        );
      })}
      <div
        css={css`
          padding: ${euiTheme.size.s} ${euiTheme.size.s} 0;
        `}
      >
        <EuiText size="xs" color="subdued">
          <p>
            {i18n.ONBOARDING_KEEP_ALL_ENABLED_NOTE} {i18n.ONBOARDING_WORKERS_FOOTNOTE}
          </p>
        </EuiText>
      </div>
    </>
  );
};
