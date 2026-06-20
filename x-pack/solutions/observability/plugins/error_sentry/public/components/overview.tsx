/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  EuiButton,
  EuiCallOut,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiLink,
  EuiLoadingSpinner,
  EuiPageTemplate,
  EuiPanel,
  EuiSpacer,
  EuiIconTip,
  EuiProgress,
  EuiTab,
  EuiTabs,
  EuiText,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { HttpSetup, NotificationsStart } from '@kbn/core/public';
import type { DiscoverStart } from '@kbn/discover-plugin/public';
import type { ComponentState, ComponentStatus } from '../../common/constants';
import { ERROR_SENTRY_APP_TITLE } from '../../common/constants';
import { useErrorSentryStatus } from '../hooks/use_error_sentry_status';
import { CasesStatsPanel } from './cases_stats_panel';

const stateToHealth = (
  state: ComponentState
): 'success' | 'warning' | 'danger' | 'subdued' | 'primary' => {
  switch (state) {
    case 'ok':
      return 'success';
    case 'warning':
      return 'warning';
    case 'missing':
    case 'error':
    case 'drifted':
      return 'danger';
    case 'info':
      return 'primary';
    case 'unavailable':
      return 'subdued';
  }
};

const stateLabel = (state: ComponentState): string => {
  switch (state) {
    case 'ok':
      return i18n.translate('xpack.errorSentry.overview.state.ok', { defaultMessage: 'OK' });
    case 'warning':
      return i18n.translate('xpack.errorSentry.overview.state.warning', {
        defaultMessage: 'Warning',
      });
    case 'missing':
      return i18n.translate('xpack.errorSentry.overview.state.missing', {
        defaultMessage: 'Not installed',
      });
    case 'drifted':
      return i18n.translate('xpack.errorSentry.overview.state.drifted', {
        defaultMessage: 'Drifted',
      });
    case 'error':
      return i18n.translate('xpack.errorSentry.overview.state.error', {
        defaultMessage: 'Error',
      });
    case 'unavailable':
      return i18n.translate('xpack.errorSentry.overview.state.unavailable', {
        defaultMessage: 'Unavailable',
      });
    case 'info':
      return i18n.translate('xpack.errorSentry.overview.state.info', {
        defaultMessage: 'Optional',
      });
  }
};

const stateIcon = (state: ComponentState): { type: string; color: string } => {
  switch (state) {
    case 'ok':
      return { type: 'checkCircleFill', color: 'success' };
    case 'warning':
      return { type: 'warning', color: 'warning' };
    case 'missing':
    case 'error':
      return { type: 'crossInACircleFilled', color: 'danger' };
    case 'drifted':
      return { type: 'alert', color: 'danger' };
    case 'unavailable':
      return { type: 'minusInCircleFilled', color: 'subdued' };
    case 'info':
      return { type: 'info', color: 'primary' };
  }
};

const isActionRequired = (components: ComponentStatus[]): boolean =>
  components.some((c) => c.state === 'missing' || c.state === 'error' || c.state === 'drifted');

const allInstalled = (components: ComponentStatus[]): boolean =>
  components.length > 0 && !isActionRequired(components);

type CategoryKey = 'scs' | 'log_sources' | 'workflows' | 'connectors' | 'agents';

const CATEGORY_ORDER: CategoryKey[] = ['log_sources', 'workflows', 'connectors', 'agents', 'scs'];

const CATEGORY_LABELS: Record<CategoryKey, string> = {
  workflows: 'Workflows',
  connectors: 'Connectors',
  agents: 'Agents',
  scs: 'Semantic Code Search',
  log_sources: 'Log sources',
};

const COMPONENT_CATEGORY: Record<string, CategoryKey> = {
  step: 'workflows',
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

interface ComponentRowProps {
  component: ComponentStatus;
  onRepair: (id: string) => void;
  repairingId: string | null;
}

const ComponentRow = ({ component, onRepair, repairingId }: ComponentRowProps) => {
  const isRepairing = repairingId === component.id;
  return (
    <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
      <EuiFlexItem grow={false} style={{ minWidth: 200 }}>
        <EuiHealth color={stateToHealth(component.state)}>
          {component.actionLink ? (
            <EuiLink data-test-subj="errorSentryComponentRowLink" href={component.actionLink}>
              <strong>{component.label}</strong>
            </EuiLink>
          ) : (
            <strong>{component.label}</strong>
          )}
        </EuiHealth>
      </EuiFlexItem>
      <EuiFlexItem>
        {component.detail && (
          <EuiText size="xs" color="subdued">
            {component.detail}
          </EuiText>
        )}
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiIconTip content={stateLabel(component.state)} {...stateIcon(component.state)} />
          </EuiFlexItem>
          {component.repairable && (
            <EuiFlexItem grow={false}>
              <EuiButton
                size="s"
                onClick={() => onRepair(component.id)}
                isLoading={isRepairing}
                data-test-subj={`errorSentryRepair-${component.id}`}
              >
                <FormattedMessage id="xpack.errorSentry.overview.repair" defaultMessage="Repair" />
              </EuiButton>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const Overview = ({
  http,
  notifications,
  discover,
}: {
  http: HttpSetup;
  notifications: NotificationsStart;
  discover?: DiscoverStart;
}) => {
  const {
    isLoading,
    isInstalling,
    repairingId,
    components,
    error,
    install,
    repair,
    runCapture,
    isRunningCapture,
    refetch,
  } = useErrorSentryStatus(http, discover);

  const handleInstall = async () => {
    try {
      await install();
      notifications.toasts.addSuccess(
        i18n.translate('xpack.errorSentry.overview.installSuccess', {
          defaultMessage: 'Error Sentry workflows installed successfully.',
        })
      );
    } catch (err) {
      notifications.toasts.addDanger(
        i18n.translate('xpack.errorSentry.overview.installFailed', {
          defaultMessage: 'Installation failed. Please try again.',
        })
      );
    }
  };

  const handleRunCapture = async () => {
    try {
      await runCapture();
      setIsPolling(true);
      clearTimeout(pollingTimerRef.current);
      pollingTimerRef.current = setTimeout(() => setIsPolling(false), 60000);
      notifications.toasts.addSuccess(
        i18n.translate('xpack.errorSentry.overview.runCaptureSuccess', {
          defaultMessage: 'Capture log error patterns workflow started.',
        })
      );
    } catch (err) {
      notifications.toasts.addDanger(
        i18n.translate('xpack.errorSentry.overview.runCaptureFailed', {
          defaultMessage: 'Failed to start capture workflow. Please try again.',
        })
      );
    }
  };

  const handleRepair = async (componentId: string) => {
    try {
      await repair(componentId);
      notifications.toasts.addSuccess(
        i18n.translate('xpack.errorSentry.overview.repairSuccess', {
          defaultMessage: 'Component repaired successfully.',
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

  const needsInstall = components.length === 0 || isActionRequired(components);
  const casesEnabled = allInstalled(components);
  const [activeTab, setActiveTab] = useState<'status' | 'cases'>('cases');

  const [isPolling, setIsPolling] = useState(false);
  const pollingTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    return () => clearTimeout(pollingTimerRef.current);
  }, []);

  return (
    <EuiPageTemplate restrictWidth>
      <EuiPageTemplate.Header
        pageTitle={<>{ERROR_SENTRY_APP_TITLE}</>}
        description={i18n.translate('xpack.errorSentry.overview.description', {
          defaultMessage:
            'Use Kibana Error Sentry to monitor and investigate errors in your system',
        })}
        rightSideItems={
          components.length === 0
            ? [
                <EuiButton
                  key="install"
                  fill
                  iconType="importAction"
                  onClick={handleInstall}
                  isLoading={isInstalling}
                  isDisabled={isLoading}
                  data-test-subj="errorSentryInstall"
                >
                  <FormattedMessage
                    id="xpack.errorSentry.overview.install"
                    defaultMessage="Install Error Sentry"
                  />
                </EuiButton>,
              ]
            : []
        }
      />
      {casesEnabled && (
        <EuiProgress
          size="xs"
          color="primary"
          css={css`
            opacity: 0.2;
            &::before {
              animation-duration: 6s;
              animation-direction: alternate;
            }
          `}
        />
      )}
      <EuiPageTemplate.Section>
        {error && (
          <>
            <EuiCallOut
              color="danger"
              iconType="alert"
              title={i18n.translate('xpack.errorSentry.overview.loadError', {
                defaultMessage: 'Could not load status',
              })}
            >
              <EuiText size="s">{error}</EuiText>
            </EuiCallOut>
            <EuiSpacer />
          </>
        )}

        {isLoading && components.length === 0 ? (
          <EuiFlexGroup justifyContent="center">
            <EuiFlexItem grow={false}>
              <EuiSpacer size="xl" />
              <EuiLoadingSpinner size="xl" />
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : components.length === 0 && !error ? (
          <EuiEmptyPrompt
            iconType="inspect"
            title={
              <h2>
                <FormattedMessage
                  id="xpack.errorSentry.overview.emptyTitle"
                  defaultMessage="Error Sentry is not set up"
                />
              </h2>
            }
            body={
              <p>
                <FormattedMessage
                  id="xpack.errorSentry.overview.emptyBody"
                  defaultMessage="Click Install to set up the Error Sentry workflows and Detective Ralph agent."
                />
              </p>
            }
            actions={
              <EuiButton
                fill
                iconType="importAction"
                onClick={handleInstall}
                isLoading={isInstalling}
                data-test-subj="errorSentryInstallEmpty"
              >
                <FormattedMessage
                  id="xpack.errorSentry.overview.installLabel"
                  defaultMessage="Install Error Sentry"
                />
              </EuiButton>
            }
          />
        ) : (
          <>
            <EuiTabs>
              <EuiTab
                isSelected={activeTab === 'cases'}
                onClick={() => setActiveTab('cases')}
                disabled={!casesEnabled}
                data-test-subj="errorSentryTabCases"
              >
                <FormattedMessage
                  id="xpack.errorSentry.overview.tabCases"
                  defaultMessage="Issues Found"
                />
              </EuiTab>
              <EuiTab
                isSelected={activeTab === 'status'}
                onClick={() => setActiveTab('status')}
                data-test-subj="errorSentryTabStatus"
              >
                <FormattedMessage
                  id="xpack.errorSentry.overview.tabStatus"
                  defaultMessage="Setup"
                />
              </EuiTab>
            </EuiTabs>

            <EuiSpacer size="m" />

            {activeTab === 'cases' && casesEnabled && (
              <CasesStatsPanel
                http={http}
                onRunCapture={handleRunCapture}
                isRunningCapture={isRunningCapture}
                isPolling={isPolling}
              />
            )}

            {activeTab === 'status' && (
              <>
                {needsInstall && !isInstalling && (
                  <>
                    <EuiCallOut
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

                <EuiPanel hasShadow={false} hasBorder={false} paddingSize="s">
                  <EuiFlexGroup alignItems="center" justifyContent="flexEnd" responsive={false}>
                    <EuiFlexItem grow={false}>
                      <EuiLink onClick={() => refetch()} data-test-subj="errorSentryRefresh">
                        <FormattedMessage
                          id="xpack.errorSentry.overview.refreshLabel"
                          defaultMessage="Refresh"
                        />
                      </EuiLink>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                  <EuiSpacer size="m" />
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
                            />
                          </React.Fragment>
                        ))}
                      </React.Fragment>
                    );
                  })}
                </EuiPanel>
              </>
            )}
          </>
        )}
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
};
