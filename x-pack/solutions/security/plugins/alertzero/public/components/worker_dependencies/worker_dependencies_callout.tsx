/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import {
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_COVERAGE_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
  SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID,
  SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID,
  type Worker,
} from '@kbn/alertzero-common';
import type { CoreStart } from '@kbn/core/public';
import { WORKFLOWS_APP_ID } from '@kbn/deeplinks-workflows';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { CONTEXT_ENGINE_ENABLED_SETTING_ID } from '@kbn/management-settings-ids';
import { useMutation, useQueryClient } from '@kbn/react-query';
import { queryKeys } from '../../query_keys';
import {
  ATTACK_DISCOVERY_WORKFLOWS_SETTING,
  THREAT_REPORT_WORKFLOWS,
  useWorkerDependencyChecks,
  type DependencyStatus,
} from './use_worker_dependency_checks';
import * as i18n from './translations';

type DependencyId =
  | 'contextEngine'
  | 'alertAnalysis'
  | 'attackDiscoveryWorkflows'
  | 'defend'
  | 'threatIngest'
  | 'threatEnrich';

type EnableableDependencyId =
  | 'contextEngine'
  | 'attackDiscoveryWorkflows'
  | 'threatIngest'
  | 'threatEnrich';

/** `blocked` stops the Worker from doing its job; `limited` only degrades a hand-off. */
type DependencySeverity = 'blocked' | 'limited';

const DEPENDENCIES_BY_WORKER: Readonly<Record<string, readonly DependencyId[]>> = {
  [SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID]: ['alertAnalysis'],
  [SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID]: ['contextEngine', 'attackDiscoveryWorkflows'],
  [SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID]: [
    'contextEngine',
    'threatIngest',
    'threatEnrich',
  ],
  [SYSTEM_SECURITY_WORKER_DETECTION_RULE_COVERAGE_ID]: ['contextEngine'],
  [SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID]: ['contextEngine', 'defend'],
};

const SEVERITY_ORDER: Readonly<Record<DependencyStatus, number>> = {
  missing: 0,
  unknown: 1,
  loading: 2,
  satisfied: 3,
};

interface Destination {
  appId: string;
  path?: string;
}

interface DependencyMessage {
  id: DependencyId;
  status: DependencyStatus;
  label: string;
  /** Verb phrase after the label, e.g. "is off". */
  state: string;
  severity: DependencySeverity;
  /** What the Worker can't do, e.g. "can't generate discoveries". */
  consequence: string;
  destination?: Destination;
  linkText?: string;
}

const advancedSettingsDestination = (query: string): Destination => ({
  appId: 'management',
  path: `/kibana/settings?query=${encodeURIComponent(query)}`,
});

const enableableDependencyLabel = (id: EnableableDependencyId): string => {
  switch (id) {
    case 'contextEngine':
      return i18n.CONTEXT_ENGINE_LABEL;
    case 'attackDiscoveryWorkflows':
      return i18n.ATTACK_DISCOVERY_LABEL;
    case 'threatIngest':
      return i18n.INGEST_WORKFLOW_LABEL;
    case 'threatEnrich':
      return i18n.ENRICH_WORKFLOW_LABEL;
  }
};

const isPlainLeftClick = (event: React.MouseEvent): boolean =>
  event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;

interface Props {
  worker: Pick<Worker, 'id'>;
  surface: 'onboarding' | 'settings';
}

interface DestinationButtonProps {
  destination: Destination;
  linkText: string;
}

const DestinationButton: React.FC<DestinationButtonProps> = ({ destination, linkText }) => {
  const {
    services: { application },
  } = useKibana<CoreStart>();
  const href = application.getUrlForApp(destination.appId, { path: destination.path });
  const onClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (!isPlainLeftClick(event)) return;
    event.preventDefault();
    void application.navigateToApp(destination.appId, { path: destination.path });
  };

  return (
    <EuiButtonEmpty size="s" flush="right" href={href} onClick={onClick}>
      {linkText}
    </EuiButtonEmpty>
  );
};

interface DependencyRowProps {
  message: DependencyMessage;
  onEnable?: () => void;
  isEnabling: boolean;
  enableDisabled: boolean;
  enableFailed: boolean;
}

const DependencyRow: React.FC<DependencyRowProps> = ({
  message: { id, status, label, state, consequence, destination, linkText },
  onEnable,
  isEnabling,
  enableDisabled,
  enableFailed,
}) => {
  const { euiTheme } = useEuiTheme();
  const unverified = status === 'unknown';

  return (
    <li data-test-subj={`alertZeroWorkerDependency-${id}`}>
      <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
        <EuiFlexItem>
          <EuiText size="s" data-test-subj={`alertZeroDependencyDescription-${id}`}>
            {unverified ? (
              <FormattedMessage
                id="xpack.alertzero.workerDependencies.unverifiedRow"
                defaultMessage="{label} {description}"
                values={{
                  label: <strong>{label}</strong>,
                  description:
                    id === 'threatIngest' || id === 'threatEnrich'
                      ? i18n.UNVERIFIED_THREAT_WORKFLOW_DESCRIPTION
                      : i18n.UNVERIFIED_DESCRIPTION,
                }}
              />
            ) : (
              <FormattedMessage
                id="xpack.alertzero.workerDependencies.missingRow"
                defaultMessage="{label} {state}, so {consequence}."
                values={{
                  label: <strong>{label}</strong>,
                  state,
                  consequence: (
                    <span
                      css={css`
                        color: ${euiTheme.colors.textSubdued};
                      `}
                    >
                      {consequence}
                    </span>
                  ),
                }}
              />
            )}
          </EuiText>
          {enableFailed ? (
            <EuiText size="xs" color="danger">
              <p role="alert">{i18n.enableDependencyFailedDescription(label)}</p>
            </EuiText>
          ) : null}
        </EuiFlexItem>
        {onEnable || (destination && linkText) ? (
          <EuiFlexItem grow={false}>
            <EuiFlexGroup
              alignItems="center"
              gutterSize="s"
              responsive={false}
              data-test-subj={`alertZeroDependencyActions-${id}`}
            >
              {destination && linkText && (!onEnable || enableFailed) ? (
                <EuiFlexItem grow={false}>
                  <DestinationButton destination={destination} linkText={linkText} />
                </EuiFlexItem>
              ) : null}
              {onEnable ? (
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    size="s"
                    flush="right"
                    isLoading={isEnabling}
                    isDisabled={enableDisabled}
                    onClick={onEnable}
                    aria-label={i18n.enableDependencyButtonLabel(label)}
                  >
                    {i18n.ENABLE_BUTTON_LABEL}
                  </EuiButtonEmpty>
                </EuiFlexItem>
              ) : null}
            </EuiFlexGroup>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    </li>
  );
};

const ConfiguredWorkerDependenciesCallout: React.FC<Props> = ({ worker, surface }) => {
  const { euiTheme } = useEuiTheme();
  const {
    services: { application, http, notifications, uiSettings },
  } = useKibana<CoreStart>();
  const queryClient = useQueryClient();
  const checks = useWorkerDependencyChecks(worker.id);

  const enableDependency = useMutation<void, Error, EnableableDependencyId>({
    mutationFn: async (id) => {
      if (id === 'contextEngine' || id === 'attackDiscoveryWorkflows') {
        const settingId =
          id === 'contextEngine'
            ? CONTEXT_ENGINE_ENABLED_SETTING_ID
            : ATTACK_DISCOVERY_WORKFLOWS_SETTING;
        const saved = await uiSettings.set(settingId, true);
        if (!saved) {
          throw new Error(i18n.enableDependencyFailedDescription(enableableDependencyLabel(id)));
        }
        return;
      }
      const workflowId = THREAT_REPORT_WORKFLOWS[id === 'threatIngest' ? 0 : 1].id;
      await http.put(`/api/workflows/workflow/${encodeURIComponent(workflowId)}`, {
        version: '2023-10-31',
        body: JSON.stringify({ enabled: true }),
      });
    },
    onSuccess: async (_, id) => {
      notifications.toasts.addSuccess(i18n.dependencyEnabledTitle(enableableDependencyLabel(id)));
      if (id === 'threatIngest' || id === 'threatEnrich') {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.workerDependencies.threatReportWorkflows(http.basePath.get()),
        });
      }
    },
    onError: (error, id) => {
      notifications.toasts.addError(error, {
        title: i18n.enableDependencyFailedTitle(enableableDependencyLabel(id)),
      });
    },
  });

  const canEnableDependency = (
    id: DependencyId,
    status: DependencyStatus
  ): id is EnableableDependencyId => {
    if (status !== 'missing') return false;
    if (id === 'contextEngine' || id === 'attackDiscoveryWorkflows') {
      const settingId =
        id === 'contextEngine'
          ? CONTEXT_ENGINE_ENABLED_SETTING_ID
          : ATTACK_DISCOVERY_WORKFLOWS_SETTING;
      return (
        application.capabilities.advancedSettings?.save === true &&
        !uiSettings.isOverridden(settingId) &&
        uiSettings.getAll()[settingId]?.readonly !== true &&
        (id !== 'attackDiscoveryWorkflows' || checks.attackDiscoveryFeatureAvailable)
      );
    }
    return (
      (id === 'threatIngest' || id === 'threatEnrich') &&
      application.capabilities.workflowsManagement?.updateWorkflow === true
    );
  };

  const visible = React.useMemo(() => {
    const dependencyIds = DEPENDENCIES_BY_WORKER[worker.id] ?? [];
    const messages: DependencyMessage[] = dependencyIds.map((id): DependencyMessage => {
      switch (id) {
        case 'contextEngine':
          return {
            id,
            status: checks.contextEngine,
            label: i18n.CONTEXT_ENGINE_LABEL,
            state: i18n.STATE_OFF,
            severity: i18n.contextEngineSeverity(worker.id),
            consequence: i18n.contextEngineConsequence(worker.id),
            destination: advancedSettingsDestination('Context Engine'),
            linkText: i18n.ADVANCED_SETTINGS_LINK_TEXT,
          };
        case 'alertAnalysis': {
          const workflowMissing = checks.alertAnalysisWorkflow === 'missing';
          return {
            id,
            status: checks.alertAnalysis,
            label: workflowMissing ? i18n.ALERT_ANALYSIS_WORKFLOW_LABEL : i18n.ALERT_ANALYSIS_LABEL,
            state: workflowMissing ? i18n.STATE_MISSING_OR_DISABLED : i18n.STATE_OFF,
            severity: 'blocked',
            consequence: i18n.ALERT_ANALYSIS_CONSEQUENCE,
            destination: { appId: 'security', path: '/rules/alert_analysis_workflow' },
            linkText: i18n.ALERT_ANALYSIS_LINK_TEXT,
          };
        }
        case 'attackDiscoveryWorkflows':
          return {
            id,
            status: checks.attackDiscoveryFeatureAvailable
              ? checks.attackDiscoveryWorkflows
              : 'missing',
            label: i18n.ATTACK_DISCOVERY_LABEL,
            state: checks.attackDiscoveryFeatureAvailable
              ? i18n.STATE_OFF_PLURAL
              : i18n.STATE_UNAVAILABLE,
            severity: 'blocked',
            consequence: checks.attackDiscoveryFeatureAvailable
              ? i18n.ATTACK_DISCOVERY_CONSEQUENCE
              : i18n.ATTACK_DISCOVERY_DEPLOYMENT_CONSEQUENCE,
            destination: checks.attackDiscoveryFeatureAvailable
              ? advancedSettingsDestination('Attack Discovery Workflows')
              : undefined,
            linkText: i18n.ADVANCED_SETTINGS_LINK_TEXT,
          };
        case 'defend':
          return {
            id,
            status: checks.defend,
            label: i18n.DEFEND_LABEL,
            state: i18n.STATE_NOT_SET_UP,
            severity: 'blocked',
            consequence: i18n.DEFEND_CONSEQUENCE,
            destination: { appId: 'integrations', path: '/detail/endpoint/overview' },
            linkText: i18n.DEFEND_LINK_TEXT,
          };
        case 'threatIngest':
        case 'threatEnrich': {
          const workflow = THREAT_REPORT_WORKFLOWS[id === 'threatIngest' ? 0 : 1];
          const label =
            id === 'threatIngest' ? i18n.INGEST_WORKFLOW_LABEL : i18n.ENRICH_WORKFLOW_LABEL;
          const status = id === 'threatIngest' ? checks.threatIngest : checks.threatEnrich;
          return {
            id,
            status,
            label,
            state: i18n.STATE_WORKFLOW_OFF,
            severity: 'limited',
            consequence: i18n.THREAT_WORKFLOW_CONSEQUENCE,
            // A missing row in the Workflows bulk response may also be unreadable. In that
            // case take the user to the list rather than linking to a possibly inaccessible ID.
            destination:
              status === 'unknown'
                ? { appId: WORKFLOWS_APP_ID }
                : { appId: WORKFLOWS_APP_ID, path: `/${encodeURIComponent(workflow.id)}` },
            linkText:
              status === 'unknown' ? i18n.WORKFLOWS_LIST_LINK_TEXT : i18n.THREAT_WORKFLOW_LINK_TEXT,
          };
        }
      }
    });
    // Blocking problems first, then degraded hand-offs, then checks that could not be verified.
    return messages
      .filter(({ status }) => status === 'missing' || status === 'unknown')
      .sort(
        (a, b) =>
          SEVERITY_ORDER[a.status] - SEVERITY_ORDER[b.status] ||
          Number(a.severity === 'limited') - Number(b.severity === 'limited')
      );
  }, [
    worker.id,
    checks.alertAnalysis,
    checks.alertAnalysisWorkflow,
    checks.contextEngine,
    checks.attackDiscoveryFeatureAvailable,
    checks.attackDiscoveryWorkflows,
    checks.defend,
    checks.threatIngest,
    checks.threatEnrich,
  ]);
  if (visible.length === 0) return null;

  const hasMissing = visible.some(({ status }) => status === 'missing');
  const showWarning = surface === 'settings' && hasMissing;
  const hasUnknown = visible.some(({ status }) => status === 'unknown');

  const rows = (
    <>
      <ul
        css={css`
          list-style: none;
          margin: 0;
          padding: 0;

          li + li {
            margin-top: ${euiTheme.size.xs};
          }

          /* Keep each line's text vertically centred on its 32px button. */
          li {
            min-height: ${euiTheme.size.xl};
          }
        `}
      >
        {visible.map((message) => {
          const { id, status } = message;
          const onEnable = canEnableDependency(id, status)
            ? () => enableDependency.mutate(id)
            : undefined;
          return (
            <DependencyRow
              key={id}
              message={message}
              onEnable={onEnable}
              isEnabling={enableDependency.isLoading && enableDependency.variables === id}
              enableDisabled={enableDependency.isLoading}
              enableFailed={enableDependency.isError && enableDependency.variables === id}
            />
          );
        })}
      </ul>
      {hasUnknown ? (
        <EuiButtonEmpty size="xs" onClick={checks.retry}>
          {i18n.RETRY_BUTTON_LABEL}
        </EuiButtonEmpty>
      ) : null}
    </>
  );

  if (surface === 'onboarding') {
    return (
      <div
        css={css`
          margin-top: ${euiTheme.size.m};
          padding-top: ${euiTheme.size.s};
          border-top: ${euiTheme.border.thin};
          /* Button hit areas add ~6px below the last line; pull it back so the
             card's bottom padding visually matches the top. */
          margin-bottom: -${euiTheme.size.s};
        `}
        data-test-subj={`alertZeroWorkerDependencies-${surface}-${worker.id}`}
      >
        {rows}
      </div>
    );
  }

  return (
    <div
      css={css`
        margin-bottom: ${euiTheme.size.m};
      `}
      data-test-subj={`alertZeroWorkerDependencies-${surface}-${worker.id}`}
    >
      <EuiCallOut
        size="s"
        color={showWarning ? 'warning' : 'primary'}
        iconType={showWarning ? 'warning' : 'info'}
        title={hasMissing ? i18n.MISSING_TITLE : i18n.UNKNOWN_TITLE}
      >
        {rows}
      </EuiCallOut>
    </div>
  );
};

export const WorkerDependenciesCallout: React.FC<Props> = (props) =>
  DEPENDENCIES_BY_WORKER[props.worker.id] ? (
    <ConfiguredWorkerDependenciesCallout {...props} />
  ) : null;
