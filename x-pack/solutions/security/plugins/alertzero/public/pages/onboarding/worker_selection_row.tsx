/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSwitch,
  EuiText,
  tint,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import {
  resolveWatchAccent,
  SYSTEM_SECURITY_WATCH_CATALOG,
  type Worker,
} from '@kbn/alertzero-common';
import { WorkerDependenciesCallout } from '../../components/worker_dependencies/worker_dependencies_callout';
import { workerScheduleCadenceLabel } from '../watches/components/worker_trigger_cadence';
import { workerName } from '../watches/workers/translations';
import type { CatalogWorker } from './use_worker_selection';
import * as i18n from './translations';

interface Props {
  worker: CatalogWorker;
  serverWorker?: Pick<Worker, 'id'>;
  scheduleInterval?: string;
  checked: boolean;
  disabled: boolean;
  onToggle: (workerId: string, checked: boolean) => void;
}

export const WorkerSelectionRow: React.FC<Props> = ({
  worker: { id, name, watchId },
  serverWorker,
  scheduleInterval,
  checked,
  disabled,
  onToggle,
}) => {
  const { euiTheme } = useEuiTheme();

  const description = i18n.onboardingWorkerDescription(id);
  const watch = SYSTEM_SECURITY_WATCH_CATALOG.find((entry) => entry.id === watchId);
  const triggerLabel = scheduleInterval
    ? workerScheduleCadenceLabel(scheduleInterval)
    : i18n.onboardingWorkerEventTrigger(id);
  return (
    <div
      css={css`
        padding: ${euiTheme.size.l};
      `}
    >
      <EuiFlexGroup alignItems="flexStart" gutterSize="m" responsive={false}>
        <EuiFlexItem>
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap>
            <EuiFlexItem grow={false}>
              <EuiText size="s">
                <strong>{workerName(id, name)}</strong>
              </EuiText>
            </EuiFlexItem>
            {watch ? (
              <EuiFlexItem grow={false}>
                <EuiBadge
                  color={tint(resolveWatchAccent(euiTheme.colors, watch.color), 0.8)}
                  data-test-subj={`alertZeroOnboardingWorkerWatch-${id}`}
                >
                  {watch.name}
                </EuiBadge>
              </EuiFlexItem>
            ) : null}
            {triggerLabel ? (
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow" data-test-subj={`alertZeroOnboardingWorkerTrigger-${id}`}>
                  {triggerLabel}
                </EuiBadge>
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
          {description ? (
            <EuiText
              size="s"
              color="subdued"
              css={css`
                margin-top: ${euiTheme.size.xs};
              `}
            >
              <p id={`alertZeroOnboardingWorkerDescription-${id}`}>{description}</p>
            </EuiText>
          ) : null}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiSwitch
                label={workerName(id, name)}
                showLabel={false}
                checked={checked}
                disabled={disabled}
                onChange={(e) => onToggle(id, e.target.checked)}
                data-test-subj={`alertZeroOnboardingWorkerToggle-${id}`}
                aria-describedby={
                  description ? `alertZeroOnboardingWorkerDescription-${id}` : undefined
                }
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              {/* The switch is named after the Worker; this is the visible state only. */}
              <EuiText
                size="s"
                color="subdued"
                aria-hidden
                css={css`
                  min-width: ${euiTheme.size.xl};
                `}
              >
                {checked ? i18n.ONBOARDING_WORKER_TOGGLE_ON : i18n.ONBOARDING_WORKER_TOGGLE_OFF}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      {/* Full width so each dependency's action lines up with the toggle column. */}
      <WorkerDependenciesCallout worker={serverWorker ?? { id }} surface="onboarding" />
    </div>
  );
};
