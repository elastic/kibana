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
  EuiLink,
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

interface Destination {
  appId: string;
  path?: string;
}

interface DependencyMessage {
  id: DependencyId;
  status: DependencyStatus;
  label: string;
  description: string;
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
  worker: Pick<Worker, 'id' | 'enableBlockedReason'>;
  surface: 'onboarding' | 'settings';
}

const ConfiguredWorkerDependenciesCallout: React.FC<Props> = ({ worker, surface }) => {
  const { euiTheme } = useEuiTheme();
  const {
    services: { application, http, notifications, uiSettings },
  } = useKibana<CoreStart>();
  const queryClient = useQueryClient();
  const checks = useWorkerDependencyChecks(worker.id);
  const dependencyIds = DEPENDENCIES_BY_WORKER[worker.id] ?? [];

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
      if (id === 'attackDiscoveryWorkflows') {
        notifications.toasts.addSuccess(i18n.ATTACK_DISCOVERY_RELOAD_NOTE);
      }
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

  const messages: DependencyMessage[] = dependencyIds.map((id): DependencyMessage => {
    switch (id) {
      case 'contextEngine':
        return {
          id,
          status: checks.contextEngine,
          label: i18n.CONTEXT_ENGINE_LABEL,
          description: i18n.contextEngineDescription(worker.id),
          destination: advancedSettingsDestination('Context Engine'),
          linkText: i18n.ADVANCED_SETTINGS_LINK_TEXT,
        };
      case 'alertAnalysis':
        return {
          id,
          status: worker.enableBlockedReason ? 'missing' : 'satisfied',
          label: i18n.ALERT_ANALYSIS_LABEL,
          description:
            worker.enableBlockedReason === 'alertAnalysisWorkflowDisabled'
              ? i18n.ALERT_ANALYSIS_WORKFLOW_DESCRIPTION
              : i18n.ALERT_ANALYSIS_RUNTIME_DESCRIPTION,
          destination: { appId: 'security', path: '/rules/alert_analysis_workflow' },
          linkText: i18n.ALERT_ANALYSIS_LINK_TEXT,
        };
      case 'attackDiscoveryWorkflows':
        return {
          id,
          status: checks.attackDiscoveryFeatureAvailable
            ? checks.attackDiscoveryWorkflows
            : 'missing',
          label: i18n.ATTACK_DISCOVERY_LABEL,
          description: checks.attackDiscoveryFeatureAvailable
            ? i18n.ATTACK_DISCOVERY_DESCRIPTION
            : i18n.ATTACK_DISCOVERY_DEPLOYMENT_DESCRIPTION,
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
          description: i18n.DEFEND_DESCRIPTION,
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
          description: i18n.THREAT_WORKFLOW_DESCRIPTION(label),
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

  const visible = messages.filter(({ status }) => status === 'missing' || status === 'unknown');
  if (visible.length === 0) return null;

  const hasMissing = visible.some(({ status }) => status === 'missing');
  const showWarning = surface === 'settings' && hasMissing;
  const hasUnknown = visible.some(({ status }) => status === 'unknown');

  return (
    <div
      css={css`
        margin-top: ${surface === 'onboarding' ? euiTheme.size.s : 0};
        margin-bottom: ${surface === 'settings' ? euiTheme.size.m : 0};
      `}
      data-test-subj={`alertZeroWorkerDependencies-${surface}-${worker.id}`}
    >
      <EuiCallOut
        size="s"
        color={showWarning ? 'warning' : 'primary'}
        iconType={showWarning ? 'warning' : 'info'}
        title={
          surface === 'settings'
            ? hasMissing
              ? i18n.MISSING_TITLE
              : i18n.UNKNOWN_TITLE
            : undefined
        }
      >
        <ul
          css={css`
            margin-bottom: 0;

            li + li {
              margin-top: ${euiTheme.size.s};
            }
          `}
        >
          {visible.map(({ id, status, label, description, destination, linkText }) => (
            <li key={id} data-test-subj={`alertZeroWorkerDependency-${id}`}>
              <div data-test-subj={`alertZeroDependencyDescription-${id}`}>
                {status === 'unknown'
                  ? id === 'threatIngest' || id === 'threatEnrich'
                    ? i18n.unableToVerifyThreatWorkflowDescription(label)
                    : i18n.unableToVerifyDescription(label)
                  : description}
              </div>
              {canEnableDependency(id, status) || (destination && linkText) ? (
                <EuiFlexGroup
                  alignItems="center"
                  gutterSize="s"
                  responsive={false}
                  wrap
                  css={css`
                    margin-top: ${euiTheme.size.xs};
                  `}
                  data-test-subj={`alertZeroDependencyActions-${id}`}
                >
                  {destination && linkText ? (
                    <EuiFlexItem grow={false}>
                      <EuiLink
                        href={application.getUrlForApp(destination.appId, {
                          path: destination.path,
                        })}
                        onClick={(event: React.MouseEvent<HTMLAnchorElement>) => {
                          if (
                            event.button !== 0 ||
                            event.metaKey ||
                            event.ctrlKey ||
                            event.shiftKey ||
                            event.altKey
                          ) {
                            return;
                          }
                          event.preventDefault();
                          void application.navigateToApp(destination.appId, {
                            path: destination.path,
                          });
                        }}
                      >
                        {linkText}
                      </EuiLink>
                    </EuiFlexItem>
                  ) : null}
                  {canEnableDependency(id, status) ? (
                    <EuiFlexItem grow={false}>
                      <EuiButtonEmpty
                        size="xs"
                        isLoading={enableDependency.isLoading && enableDependency.variables === id}
                        isDisabled={enableDependency.isLoading}
                        onClick={() => enableDependency.mutate(id)}
                      >
                        {i18n.enableDependencyButtonLabel(label)}
                      </EuiButtonEmpty>
                    </EuiFlexItem>
                  ) : null}
                </EuiFlexGroup>
              ) : null}
              {enableDependency.isError && enableDependency.variables === id ? (
                <EuiText size="xs" color="danger">
                  <p role="alert">{i18n.enableDependencyFailedDescription(label)}</p>
                </EuiText>
              ) : null}
            </li>
          ))}
        </ul>
        {hasUnknown ? (
          <EuiButtonEmpty size="xs" onClick={checks.retry}>
            {i18n.RETRY_BUTTON_LABEL}
          </EuiButtonEmpty>
        ) : null}
      </EuiCallOut>
    </div>
  );
};

export const WorkerDependenciesCallout: React.FC<Props> = (props) =>
  DEPENDENCIES_BY_WORKER[props.worker.id] ? (
    <ConfiguredWorkerDependenciesCallout {...props} />
  ) : null;
