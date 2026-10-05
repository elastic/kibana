/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiSwitch,
  EuiText,
  tint,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  resolveWatchAccent,
  SYSTEM_SECURITY_WATCH_CATALOG,
  SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
} from '@kbn/alertzero-common';
import { workerScheduleCadenceLabel } from '../watches/components/worker_trigger_cadence';
import { workerName } from '../watches/workers/translations';
import type { CatalogWorker } from './use_worker_selection';
import * as i18n from './translations';

interface Props {
  worker: CatalogWorker;
  scheduleInterval?: string;
  checked: boolean;
  blocked: boolean;
  alertAnalysisSettingsUrl: string;
  disabled: boolean;
  onToggle: (workerId: string, checked: boolean) => void;
}

export const WorkerSelectionRow: React.FC<Props> = ({
  worker: { id, name, watchId },
  scheduleInterval,
  checked,
  blocked,
  alertAnalysisSettingsUrl,
  disabled,
  onToggle,
}) => {
  const { euiTheme } = useEuiTheme();

  const description = i18n.onboardingWorkerDescription(id);
  const watch = SYSTEM_SECURITY_WATCH_CATALOG.find((entry) => entry.id === watchId);
  const triggerLabel = scheduleInterval
    ? workerScheduleCadenceLabel(scheduleInterval)
    : i18n.onboardingWorkerEventTrigger(id);
  const hasWorkflowsNote = id === SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID;
  const hasNote = hasWorkflowsNote || blocked;

  return (
    <>
      <EuiFlexGroup
        alignItems="flexStart"
        gutterSize="m"
        responsive={false}
        css={css`
          padding: ${euiTheme.size.l} ${euiTheme.size.l}
            ${hasNote ? euiTheme.size.m : euiTheme.size.l};
        `}
      >
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
            <EuiText size="s" color="subdued">
              <p id={`alertZeroOnboardingWorkerDescription-${id}`}>{description}</p>
            </EuiText>
          ) : null}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiSwitch
            label={workerName(id, name)}
            showLabel={false}
            checked={checked}
            disabled={blocked || disabled}
            onChange={(e) => onToggle(id, e.target.checked)}
            data-test-subj={`alertZeroOnboardingWorkerToggle-${id}`}
            aria-describedby={
              [
                description ? `alertZeroOnboardingWorkerDescription-${id}` : undefined,
                blocked ? `alertZeroOnboardingWorkerBlockedReason-${id}` : undefined,
              ]
                .filter(Boolean)
                .join(' ') || undefined
            }
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      {hasNote ? (
        <div
          css={css`
            padding: 0 ${euiTheme.size.l} ${euiTheme.size.l};
          `}
        >
          {hasWorkflowsNote ? (
            <EuiCallOut
              announceOnMount
              size="s"
              iconType="info"
              data-test-subj="alertZeroOnboardingAttackDiscoveryNote"
            >
              <p>{i18n.ATTACK_DISCOVERY_WORKFLOWS_NOTE}</p>
            </EuiCallOut>
          ) : null}
          {blocked ? (
            <EuiCallOut
              announceOnMount
              size="s"
              iconType="info"
              data-test-subj={`alertZeroOnboardingWorkerBlockedReason-${id}`}
            >
              <p id={`alertZeroOnboardingWorkerBlockedReason-${id}`}>
                <FormattedMessage
                  id="xpack.alertzero.onboarding.workerRequiresAlertAnalysis"
                  defaultMessage="Requires alert analysis. Turn it on in {settingsLink}, then enable this Worker on Watches."
                  values={{
                    settingsLink: (
                      <EuiLink
                        href={alertAnalysisSettingsUrl}
                        data-test-subj={`alertZeroOnboardingAlertAnalysisSettingsLink-${id}`}
                      >
                        {i18n.ONBOARDING_ALERT_ANALYSIS_SETTINGS_LINK}
                      </EuiLink>
                    ),
                  }}
                />
              </p>
            </EuiCallOut>
          ) : null}
        </div>
      ) : null}
    </>
  );
};
