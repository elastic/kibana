/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { UseMutateAsyncFunction } from '@kbn/react-query';
import {
  EuiBadge,
  EuiButton,
  EuiCallOut,
  EuiCode,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { NotificationsStart } from '@kbn/core/public';
import { FormattedMessage } from '@kbn/i18n-react';
import type { CaptureConfig, ComponentStatus } from '../../../common/constants';
import { ComponentRow } from './component_row';

export function Setup({
  components,
  captureConfig,
  needsInstall,
  isInstalling,
  notifications,
  repair,
  refetch,
  repairingId,
  runIntrospect,
  isRunningIntrospect,
  onExport,
}: {
  components: ComponentStatus[];
  captureConfig: CaptureConfig | null;
  needsInstall: boolean;
  isInstalling: boolean;
  notifications: NotificationsStart;
  repair: UseMutateAsyncFunction<unknown, unknown, string, unknown>;
  refetch: any;
  repairingId: string | null;
  runIntrospect: () => Promise<unknown>;
  isRunningIntrospect: boolean;
  onExport: () => void;
}) {
  const handleRepair = async (componentId: string) => {
    try {
      await repair(componentId);
      notifications.toasts.addSuccess(
        i18n.translate('xpack.errorSentry.overview.repairSuccess', {
          defaultMessage: 'Repaired successfully.',
        })
      );
    } catch (err) {
      notifications.toasts.addDanger(
        i18n.translate('xpack.errorSentry.overview.repairFailed', {
          defaultMessage: 'Repair failed. Please try again.',
        })
      );
    }
  };

  return (
    <>
      {needsInstall && !isInstalling && (
        <>
          <EuiCallOut
            announceOnMount
            color="warning"
            iconType="wrench"
            title={i18n.translate('xpack.errorSentry.overview.needsSetup', {
              defaultMessage: 'Some components need attention',
            })}
          >
            <FormattedMessage
              id="xpack.errorSentry.overview.needsSetupBody"
              defaultMessage="Click Install to deploy all Error Sentry workflows, or use individual Repair buttons below."
            />
          </EuiCallOut>
          <EuiSpacer />
        </>
      )}

      {!needsInstall && (
        <>
          <EuiCallOut
            announceOnMount
            color="primary"
            iconType="checkCircleFill"
            title={i18n.translate('xpack.errorSentry.overview.installed', {
              defaultMessage: 'Error Sentry is set up successfully',
            })}
          >
            <EuiFlexGroup alignItems="center" justifyContent="flexEnd" responsive={false}>
              <EuiFlexItem grow>
                <FormattedMessage
                  id="xpack.errorSentry.overview.needsSetupBody"
                  defaultMessage="All components are correctly installed."
                />
              </EuiFlexItem>

              <EuiFlexItem grow={false}>
                <EuiLink onClick={() => refetch()} data-test-subj="errorSentryRefresh">
                  <FormattedMessage
                    id="xpack.errorSentry.overview.refreshLabel"
                    defaultMessage="Refresh"
                  />
                </EuiLink>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  size="s"
                  iconType="download"
                  onClick={onExport}
                  data-test-subj="errorSentryExport"
                >
                  <FormattedMessage
                    id="xpack.errorSentry.setup.exportLabel"
                    defaultMessage="Export"
                  />
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiCallOut>
          <EuiSpacer />
        </>
      )}

      <EuiPanel hasShadow={false} hasBorder={false} paddingSize="s">
        {CATEGORY_ORDER.map((category, catIndex) => {
          const items = components.filter((c) => COMPONENT_CATEGORY[c.id] === category);

          if (items.length === 0) return null;

          return (
            <React.Fragment key={category}>
              {catIndex > 0 && <EuiSpacer size="m" />}
              <EuiText size="xs" color="subdued">
                <strong>{CATEGORY_LABELS[category]}</strong>
              </EuiText>
              <EuiSpacer size="s" />

              {items.map((component, index) => (
                <React.Fragment key={component.id}>
                  {index > 0 && <EuiSpacer size="s" />}
                  <ComponentRow
                    component={component}
                    onRepair={handleRepair}
                    repairingId={repairingId}
                    actions={
                      component.id === 'log_source' ? (
                        <EuiFlexItem grow={false}>
                          <EuiButton
                            size="s"
                            iconType="refresh"
                            onClick={runIntrospect}
                            isLoading={isRunningIntrospect}
                            data-test-subj="errorSentryRunIntrospect"
                          >
                            <FormattedMessage
                              id="xpack.errorSentry.setup.introspectLabel"
                              defaultMessage="Run Introspection"
                            />
                          </EuiButton>
                        </EuiFlexItem>
                      ) : undefined
                    }
                  />
                </React.Fragment>
              ))}

              {category === 'log_sources' && (
                <>
                  <EuiSpacer size="m" />
                  <CaptureConfigPanel captureConfig={captureConfig} />
                </>
              )}
            </React.Fragment>
          );
        })}
      </EuiPanel>
    </>
  );
}

type CategoryKey = 'scs' | 'log_sources' | 'workflows' | 'connectors' | 'agents';

const CATEGORY_ORDER: CategoryKey[] = ['log_sources', 'workflows', 'connectors', 'agents', 'scs'];

const CATEGORY_LABELS: Record<CategoryKey, string> = {
  workflows: 'Workflows',
  connectors: 'Connectors',
  agents: 'Agents',
  scs: 'Semantic Code Search',
  log_sources: 'Observed system',
};

const COMPONENT_CATEGORY: Record<string, CategoryKey> = {
  step: 'workflows',
  step_introspect: 'workflows',
  workflow_capture: 'workflows',
  workflow_escalate_github: 'workflows',
  workflow_ask_ralph: 'workflows',
  workflow_introspect: 'workflows',
  workflow_ralph_investigation: 'workflows',
  github_connector: 'connectors',
  agent_ralph: 'agents',
  scs_repos: 'scs',
  scs_tools: 'scs',
  log_source: 'log_sources',
};

function CaptureConfigPanel({ captureConfig }: { captureConfig: CaptureConfig | null }) {
  if (!captureConfig) {
    return (
      <EuiText size="xs" color="subdued">
        <p>
          <FormattedMessage
            id="xpack.errorSentry.setup.introspectNotRun"
            defaultMessage="Run Introspection to detect your log source configuration."
          />
        </p>
      </EuiText>
    );
  }

  const {
    index,
    categoryField,
    severityStrategy,
    severityField,
    logLevels,
    textFilter,
    k8s,
    totalDocs7d,
    errorMatchingDocs7d,
    updatedAt,
  } = captureConfig;

  const detectionMode =
    severityStrategy === 'severity'
      ? i18n.translate('xpack.errorSentry.setup.strategyFieldValue', {
          defaultMessage: 'Severity field',
        })
      : i18n.translate('xpack.errorSentry.setup.strategyText', {
          defaultMessage: 'Text keyword matching',
        });

  const detectedK8sKeys = Object.entries(k8s ?? {})
    .filter(([, v]) => v)
    .map(([k, v]) => ({ label: K8S_KEY_LABELS[k] ?? k, value: v as string }));

  const listItems = [
    {
      title: i18n.translate('xpack.errorSentry.setup.configIndex', { defaultMessage: 'Index' }),
      description: <EuiCode>{index}</EuiCode>,
    },
    {
      title: i18n.translate('xpack.errorSentry.setup.configCategoryField', {
        defaultMessage: 'Category field',
      }),
      description: <EuiCode>{categoryField}</EuiCode>,
    },
    {
      title: i18n.translate('xpack.errorSentry.setup.configSeverityField', {
        defaultMessage: 'Severity field',
      }),
      description: severityField ? (
        <EuiCode>{severityField}</EuiCode>
      ) : (
        <FormattedMessage
          id="xpack.errorSentry.setup.configSeverityFieldNotDetected"
          defaultMessage="Not detected in log data, using text filter instead"
        />
      ),
    },
    {
      title: i18n.translate('xpack.errorSentry.setup.configDetectionMode', {
        defaultMessage: 'Detection mode',
      }),
      description: detectionMode,
    },
    ...(severityStrategy === 'severity' && logLevels && logLevels.length > 0
      ? [
          {
            title: i18n.translate('xpack.errorSentry.setup.configLogLevels', {
              defaultMessage: 'Log levels',
            }),
            description: (
              <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
                {logLevels.map((level) => (
                  <EuiFlexItem key={level} grow={false}>
                    <EuiBadge color="hollow">{level}</EuiBadge>
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>
            ),
          },
        ]
      : []),
    ...(severityStrategy === 'text' && textFilter
      ? [
          {
            title: i18n.translate('xpack.errorSentry.setup.configTextFilter', {
              defaultMessage: 'Text filter',
            }),
            description: <EuiCode>{textFilter}</EuiCode>,
          },
        ]
      : []),
    ...(detectedK8sKeys.length > 0
      ? [
          {
            title: i18n.translate('xpack.errorSentry.setup.configK8s', {
              defaultMessage: 'K8s attributes',
            }),
            description: (
              <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
                {detectedK8sKeys.map(({ label, value }) => (
                  <EuiFlexItem key={value} grow={false}>
                    <EuiBadge color="hollow" title={value}>
                      {label}
                    </EuiBadge>
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>
            ),
          },
        ]
      : []),
    {
      title: i18n.translate('xpack.errorSentry.setup.configTotalDocs', {
        defaultMessage: 'Docs (7d)',
      }),
      description: totalDocs7d != null ? totalDocs7d.toLocaleString() : '—',
    },
    {
      title: i18n.translate('xpack.errorSentry.setup.configErrorDocs', {
        defaultMessage: 'Error docs (7d)',
      }),
      description: errorMatchingDocs7d != null ? errorMatchingDocs7d.toLocaleString() : '—',
    },
  ];

  return (
    <EuiPanel paddingSize="m" color="subdued" hasShadow={false} hasBorder>
      <EuiTitle size="xxs">
        <h4>
          <FormattedMessage
            id="xpack.errorSentry.setup.introspectResultsTitle"
            defaultMessage="Introspection results"
          />
        </h4>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiDescriptionList
        type="column"
        columnWidths={['200px', 'auto']}
        listItems={listItems.map(({ title, description }) => ({
          title: <EuiText size="s">{title}</EuiText>,
          description,
        }))}
      />
    </EuiPanel>
  );
}

const K8S_KEY_LABELS: Record<string, string> = {
  podKey: 'Pod',
  namespaceKey: 'Namespace',
  deploymentKey: 'Deployment',
  hostKey: 'Host',
  serviceKey: 'Service',
};
