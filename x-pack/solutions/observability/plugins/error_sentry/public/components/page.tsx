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
  EuiLoadingSpinner,
  EuiPageTemplate,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { HttpSetup, NotificationsStart } from '@kbn/core/public';
import type { DiscoverStart } from '@kbn/discover-plugin/public';
import type { ComponentStatus } from '../../common/constants';
import { ERROR_SENTRY_APP_TITLE } from '../../common/constants';
import { useErrorSentryStatus } from '../hooks/use_error_sentry_status';
import { useCasesStats } from '../hooks/use_cases_stats';
import { useActiveExecutions } from '../hooks/use_active_executions';
import { Overview } from './overview_tab/overview';
import { Setup } from './setup_tab/setup';

export const Page = ({
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
    components,
    error,
    install,
    runCapture,
    isRunningCapture,
    repair,
    refetch,
    repairingId,
  } = useErrorSentryStatus(http, discover);

  const needsInstall = components.length === 0 || isActionRequired(components);

  const casesEnabled = allInstalled(components);

  const [activeTab, setActiveTab] = useState<'setup' | 'overview'>('overview');

  const [isPolling, setIsPolling] = useState(false);
  const pollingTimerRef = useRef<ReturnType<typeof setTimeout>>();
  // Track whether we've seen at least one active execution so we don't stop
  // polling immediately on the first fetch (before the workflow even starts).
  const seenActiveRef = useRef(false);

  const { stats } = useCasesStats(http, isPolling);
  const hasActiveExecutions = useActiveExecutions(http, isPolling);

  useEffect(() => {
    return () => clearTimeout(pollingTimerRef.current);
  }, []);

  // Track once we've seen the capture workflow actually running.
  useEffect(() => {
    if (isPolling && hasActiveExecutions) {
      seenActiveRef.current = true;
    }
  }, [isPolling, hasActiveExecutions]);

  // Stop polling once every recent case has been investigated by Ralph.
  // Guard with seenActive so an early poll (all cases already investigated from
  // a previous run) doesn't kill the polling window right away.
  useEffect(() => {
    if (!isPolling || !stats) return;
    const { recentCases } = stats;
    if (
      seenActiveRef.current &&
      recentCases.length > 0 &&
      recentCases.every((c) => c.investigated)
    ) {
      setIsPolling(false);
      clearTimeout(pollingTimerRef.current);
    }
  }, [stats, isPolling]);

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
      seenActiveRef.current = false;
      setIsPolling(true);
      clearTimeout(pollingTimerRef.current);
      // 5-minute fallback — investigation workflows can take several minutes.
      pollingTimerRef.current = setTimeout(() => setIsPolling(false), 300_000);
      notifications.toasts.addSuccess(
        i18n.translate('xpack.errorSentry.overview.runCaptureSuccess', {
          defaultMessage: 'Searching for error patterns in your logs...',
        })
      );
    } catch (err) {
      notifications.toasts.addDanger(
        i18n.translate('xpack.errorSentry.overview.runCaptureFailed', {
          defaultMessage: 'Failed searching for error patterns. Please try again.',
        })
      );
    }
  };

  return (
    <EuiPageTemplate restrictWidth>
      <EuiPageTemplate.Header
        pageTitle={<>{ERROR_SENTRY_APP_TITLE}</>}
        description={i18n.translate('xpack.errorSentry.overview.description', {
          defaultMessage:
            'Use Kibana Error Sentry to monitor and automatically investigate errors in your observed system.',
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
      <EuiPageTemplate.Section>
        {error && (
          <>
            <EuiCallOut
              announceOnMount
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
                  defaultMessage="Error Sentry is not set up."
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
                isSelected={activeTab === 'overview'}
                onClick={() => setActiveTab('overview')}
                disabled={!casesEnabled}
                data-test-subj="errorSentryTabCases"
              >
                <FormattedMessage
                  id="xpack.errorSentry.overview.tabCases"
                  defaultMessage="Issues Found"
                />
              </EuiTab>
              <EuiTab
                isSelected={activeTab === 'setup'}
                onClick={() => setActiveTab('setup')}
                data-test-subj="errorSentryTabStatus"
              >
                <FormattedMessage
                  id="xpack.errorSentry.overview.tabStatus"
                  defaultMessage="Setup"
                />
              </EuiTab>
            </EuiTabs>

            <EuiSpacer size="m" />

            {activeTab === 'overview' && casesEnabled && (
              <Overview
                http={http}
                onRunCapture={handleRunCapture}
                isRunningCapture={isRunningCapture}
                isPolling={isPolling}
                isSetupComplete={casesEnabled}
              />
            )}

            {activeTab === 'setup' && (
              <Setup
                needsInstall={needsInstall}
                isInstalling={isInstalling}
                notifications={notifications}
                components={components}
                repair={repair}
                refetch={refetch}
                repairingId={repairingId}
              />
            )}
          </>
        )}
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
};

const isActionRequired = (components: ComponentStatus[]): boolean =>
  components.some((c) => c.state === 'missing' || c.state === 'error' || c.state === 'drifted');

const allInstalled = (components: ComponentStatus[]): boolean =>
  components.length > 0 && !isActionRequired(components);
