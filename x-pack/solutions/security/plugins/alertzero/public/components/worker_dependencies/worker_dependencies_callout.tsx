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
import { DependencySentence, type DependencySentenceId } from './dependency_sentence';
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

interface WorkerDependency {
  id: DependencyId;
  severity: DependencySeverity;
  /** Sentence shown while the dependency is missing. */
  sentence: DependencySentenceId;
}

const DEPENDENCIES_BY_WORKER: Readonly<Record<string, readonly WorkerDependency[]>> = {
  [SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID]: [
    { id: 'alertAnalysis', severity: 'blocked', sentence: 'alertAnalysisOff' },
  ],
  [SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID]: [
    { id: 'contextEngine', severity: 'limited', sentence: 'contextEngineAttack' },
    { id: 'attackDiscoveryWorkflows', severity: 'blocked', sentence: 'attackDiscoveryOff' },
  ],
  [SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID]: [
    { id: 'contextEngine', severity: 'limited', sentence: 'contextEngineHunt' },
    { id: 'threatIngest', severity: 'limited', sentence: 'threatWorkflowOff' },
    { id: 'threatEnrich', severity: 'limited', sentence: 'threatWorkflowOff' },
  ],
  [SYSTEM_SECURITY_WORKER_DETECTION_RULE_COVERAGE_ID]: [
    { id: 'contextEngine', severity: 'blocked', sentence: 'contextEngineCoverage' },
  ],
  [SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID]: [
    { id: 'contextEngine', severity: 'blocked', sentence: 'contextEngineEndpoint' },
    { id: 'defend', severity: 'blocked', sentence: 'defendMissing' },
  ],
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
  severity: DependencySeverity;
  label: string;
  sentence: DependencySentenceId;
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

interface Props {
  worker: Pick<Worker, 'id'>;
  surface: 'onboarding' | 'settings';
}

interface DestinationButtonProps {
  destination: Destination;
  linkText: string;
}

/** A plain href; Kibana's global link redirect turns plain left clicks into in-app navigation. */
const DestinationButton: React.FC<DestinationButtonProps> = ({ destination, linkText }) => {
  const {
    services: { application },
  } = useKibana<CoreStart>();
  const href = application.getUrlForApp(destination.appId, { path: destination.path });

  return (
    <EuiButtonEmpty size="s" flush="right" href={href}>
      {linkText}
    </EuiButtonEmpty>
  );
};

const unverifiedSentence = (id: DependencyId): DependencySentenceId =>
  id === 'threatIngest' || id === 'threatEnrich' ? 'unverifiedThreatWorkflow' : 'unverified';

interface DependencyRowProps {
  message: DependencyMessage;
  onEnable?: () => void;
  isEnabling: boolean;
  enableDisabled: boolean;
  enableFailed: boolean;
}

const DependencyRow: React.FC<DependencyRowProps> = ({
  message: { id, status, label, sentence, destination, linkText },
  onEnable,
  isEnabling,
  enableDisabled,
  enableFailed,
}) => {
  const { euiTheme } = useEuiTheme();

  return (
    <li data-test-subj={`alertZeroWorkerDependency-${id}`}>
      <EuiFlexGroup
        alignItems="center"
        gutterSize="m"
        responsive={false}
        css={css`
          /* Match the action button height so rows without an action align with those that have one. */
          min-height: ${euiTheme.size.xl};
        `}
      >
        <EuiFlexItem>
          <EuiText size="s" color="subdued" data-test-subj={`alertZeroDependencyDescription-${id}`}>
            <DependencySentence
              sentence={status === 'unknown' ? unverifiedSentence(id) : sentence}
              label={
                <strong
                  css={css`
                    color: ${euiTheme.colors.textParagraph};
                  `}
                >
                  {label}
                </strong>
              }
            />
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
    const dependencies = DEPENDENCIES_BY_WORKER[worker.id] ?? [];
    const messages = dependencies.map(({ id, severity, sentence }): DependencyMessage => {
      switch (id) {
        case 'contextEngine':
          return {
            id,
            severity,
            sentence,
            status: checks.contextEngine,
            label: i18n.CONTEXT_ENGINE_LABEL,
            destination: advancedSettingsDestination('Context Engine'),
            linkText: i18n.ADVANCED_SETTINGS_LINK_TEXT,
          };
        case 'alertAnalysis': {
          const workflowMissing = checks.alertAnalysisWorkflow === 'missing';
          return {
            id,
            severity,
            sentence: workflowMissing ? 'alertAnalysisWorkflowMissing' : sentence,
            status: checks.alertAnalysis,
            label: workflowMissing ? i18n.ALERT_ANALYSIS_WORKFLOW_LABEL : i18n.ALERT_ANALYSIS_LABEL,
            destination: { appId: 'security', path: '/rules/alert_analysis_workflow' },
            linkText: i18n.ALERT_ANALYSIS_LINK_TEXT,
          };
        }
        case 'attackDiscoveryWorkflows': {
          const available = checks.attackDiscoveryFeatureAvailable;
          return {
            id,
            severity,
            sentence: available ? sentence : 'attackDiscoveryUnavailable',
            status: available ? checks.attackDiscoveryWorkflows : 'missing',
            label: i18n.ATTACK_DISCOVERY_LABEL,
            destination: available
              ? advancedSettingsDestination('Attack Discovery Workflows')
              : undefined,
            linkText: i18n.ADVANCED_SETTINGS_LINK_TEXT,
          };
        }
        case 'defend':
          return {
            id,
            severity,
            sentence,
            status: checks.defend,
            label: i18n.DEFEND_LABEL,
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
            severity,
            sentence,
            status,
            label,
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
        <EuiFlexGroup
          justifyContent="flexEnd"
          responsive={false}
          css={css`
            margin-top: ${euiTheme.size.xs};
          `}
        >
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty size="s" flush="right" onClick={checks.retry}>
              {i18n.RETRY_BUTTON_LABEL}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
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
