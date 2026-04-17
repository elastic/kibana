/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  EuiButton,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiSteps,
  EuiText,
  EuiButtonGroup,
  EuiCopy,
  EuiCallOut,
  EuiSkeletonText,
} from '@elastic/eui';
import type { EuiStepStatus } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import { FormattedMessage } from '@kbn/i18n-react';
import { type LogsLocatorParams, LOGS_LOCATOR_ID } from '@kbn/logs-shared-plugin/common';
import { usePerformanceContext } from '@kbn/ebt-tools';
import { ObservabilityOnboardingPricingFeature } from '../../../../common/pricing_features';
import type { ObservabilityOnboardingAppServices } from '../../..';
import { useFetcher } from '../../../hooks/use_fetcher';
import { usePreExistingDataCheck } from '../shared/use_pre_existing_data_check';
import { useWindowBlurDataMonitoringTrigger } from '../shared/use_window_blur_data_monitoring_trigger';
import { useTimeWindowDataDetection } from '../shared/use_time_window_data_detection';
import { ProgressIndicator } from '../shared/progress_indicator';
import { GetStartedPanel } from '../shared/get_started_panel';
import { useWiredStreamsStatus } from '../../../hooks/use_wired_streams_status';
import { MultiIntegrationInstallBanner } from './multi_integration_install_banner';
import { EmptyPrompt } from '../shared/empty_prompt';
import { FeedbackButtons } from '../shared/feedback_buttons';
import {
  WiredStreamsIngestionSelector,
  type IngestionMode,
} from '../shared/wired_streams_ingestion_selector';
import { useFlowBreadcrumb } from '../../shared/use_flow_breadcrumbs';
import { buildInstallCommand } from './build_install_command';
import { useManagedOtlpServiceAvailability } from '../../shared/use_managed_otlp_service_availability';
import { usePricingFeature } from '../shared/use_pricing_feature';
import { ManagedOtlpCallout } from '../shared/managed_otlp_callout';
import { WIRED_OTEL_DATA_VIEW_SPEC } from '../shared/wired_streams_data_view';

const HOST_COMMAND = i18n.translate(
  'xpack.observability_onboarding.otelLogsPanel.p.runTheCommandOnYourHostLabel',
  {
    defaultMessage:
      'Run the following command on your host to download and configure the collector.',
  }
);

const FETCH_INTERVAL = 2000;
const SHOW_TROUBLESHOOTING_DELAY = 120_000;

export const OtelLogsPanel: React.FC = () => {
  useFlowBreadcrumb({
    text: i18n.translate('xpack.observability_onboarding.autoDetectPanel.breadcrumbs.otelHost', {
      defaultMessage: 'OpenTelemetry: Logs & Metrics',
    }),
  });
  const { onPageReady } = usePerformanceContext();
  const {
    services: { share, docLinks },
  } = useKibana<ObservabilityOnboardingAppServices>();

  const {
    data: setupData,
    error,
    refetch,
  } = useFetcher(
    (callApi) => {
      return callApi('POST /internal/observability_onboarding/otel_host/setup');
    },
    [],
    { showToastOnError: false }
  );

  useEffect(() => {
    if (setupData) {
      onPageReady({
        meta: {
          description: `[ttfmp_onboarding] Requests to setup the flow succeeded and the flow's UI has rendered`,
        },
      });
    }
  }, [onPageReady, setupData]);

  const [selectedTab, setSelectedTab] = useState('linux');

  const hasPreExistingDataEarly = usePreExistingDataCheck({ flow: 'otel_host' });

  const windowBlurred = useWindowBlurDataMonitoringTrigger({
    isActive: !!setupData,
    onboardingFlowType: 'otel_logs',
    onboardingId: setupData?.onboardingId,
  });

  const isMonitoringStepActive = windowBlurred || hasPreExistingDataEarly;

  // Set sessionStartTime when monitoring begins, not on mount.
  const [sessionStartTime, setSessionStartTime] = useState<string | null>(null);
  useEffect(() => {
    if (isMonitoringStepActive && sessionStartTime === null) {
      setSessionStartTime(new Date().toISOString());
    }
  }, [isMonitoringStepActive, sessionStartTime]);

  const { hasData, hasPreExistingData, isTroubleshootingVisible } = useTimeWindowDataDetection({
    isMonitoringActive: isMonitoringStepActive && sessionStartTime !== null,
    sessionStartTime: sessionStartTime ?? '',
    fetchInterval: FETCH_INTERVAL,
    troubleshootingDelay: SHOW_TROUBLESHOOTING_DELAY,
    flowType: 'otel_logs',
    onboardingId: setupData?.onboardingId ?? '',
    endpoint: '/internal/observability_onboarding/otel_host/has-data',
  });

  const hasPreExistingDataFinal = hasPreExistingData || hasPreExistingDataEarly;

  const isMetricsOnboardingEnabled = usePricingFeature(
    ObservabilityOnboardingPricingFeature.METRICS_ONBOARDING
  );
  const isManagedOtlpServiceAvailable = useManagedOtlpServiceAvailability();

  const {
    isEnabled: isWiredStreamsEnabled,
    isLoading: isWiredStreamsLoading,
    isEnabling,
    enableWiredStreams,
  } = useWiredStreamsStatus();
  const [ingestionMode, setIngestionMode] = useState<IngestionMode>('classic');
  const useWiredStreams = ingestionMode === 'wired';

  const logsLocator = share.url.locators.get<LogsLocatorParams>(LOGS_LOCATOR_ID);
  const hostsLocator = share.url.locators.get('HOSTS_LOCATOR');
  const logsLocatorParams = useMemo<LogsLocatorParams>(
    () => (useWiredStreams ? { dataViewSpec: WIRED_OTEL_DATA_VIEW_SPEC } : {}),
    [useWiredStreams]
  );

  const [{ value: deeplinks }, getDeeplinks] = useAsyncFn(async () => {
    return {
      logs: logsLocator?.getRedirectUrl(logsLocatorParams),
      metrics: hostsLocator?.getRedirectUrl({}),
    };
  }, [logsLocator, logsLocatorParams, hostsLocator]);

  useEffect(() => {
    getDeeplinks();
  }, [getDeeplinks]);

  const visualizeActionLinks = useMemo(
    () => [
      ...(deeplinks?.logs
        ? [
            {
              id: 'logs',
              title: i18n.translate('xpack.observability_onboarding.otelLogsPanel.logsTitle', {
                defaultMessage: 'View and analyze your logs',
              }),
              label: i18n.translate('xpack.observability_onboarding.otelLogsPanel.logsLabel', {
                defaultMessage: 'Explore logs',
              }),
              href: deeplinks.logs,
            },
          ]
        : []),
      ...(isMetricsOnboardingEnabled && deeplinks?.metrics
        ? [
            {
              id: 'metrics',
              title: i18n.translate('xpack.observability_onboarding.otelLogsPanel.metricsTitle', {
                defaultMessage: 'View and analyze your metrics',
              }),
              label: i18n.translate('xpack.observability_onboarding.otelLogsPanel.metricsLabel', {
                defaultMessage: 'Open Hosts',
              }),
              href: deeplinks.metrics,
            },
          ]
        : []),
    ],
    [deeplinks, isMetricsOnboardingEnabled]
  );

  const installTabContents = useMemo(
    () => [
      {
        id: 'linux',
        name: 'Linux',
        firstStepTitle: HOST_COMMAND,
        content: setupData
          ? buildInstallCommand({
              platform: 'linux',
              isMetricsOnboardingEnabled,
              isManagedOtlpServiceAvailable,
              managedOtlpServiceUrl: setupData.managedOtlpServiceUrl,
              elasticsearchUrl: setupData.elasticsearchUrl,
              apiKeyEncoded: setupData.apiKeyEncoded,
              agentVersion: setupData.elasticAgentVersionInfo.agentVersion,
              useWiredStreams,
            })
          : '',
        start: 'sudo ./otelcol --config otel.yml',
        codeLanguage: 'sh',
      },
      {
        id: 'mac',
        name: 'Mac',
        firstStepTitle: HOST_COMMAND,
        content: setupData
          ? buildInstallCommand({
              platform: 'mac',
              isMetricsOnboardingEnabled,
              isManagedOtlpServiceAvailable,
              managedOtlpServiceUrl: setupData.managedOtlpServiceUrl,
              elasticsearchUrl: setupData.elasticsearchUrl,
              apiKeyEncoded: setupData.apiKeyEncoded,
              agentVersion: setupData.elasticAgentVersionInfo.agentVersion,
              useWiredStreams,
            })
          : '',
        start: './otelcol --config otel.yml',
        codeLanguage: 'sh',
      },
      {
        id: 'windows',
        name: 'Windows',
        firstStepTitle: HOST_COMMAND,
        content: setupData
          ? buildInstallCommand({
              platform: 'windows',
              isMetricsOnboardingEnabled,
              isManagedOtlpServiceAvailable,
              managedOtlpServiceUrl: setupData.managedOtlpServiceUrl,
              elasticsearchUrl: setupData.elasticsearchUrl,
              apiKeyEncoded: setupData.apiKeyEncoded,
              agentVersion: setupData.elasticAgentVersionInfo.agentVersion,
              useWiredStreams,
            })
          : '',
        start: '.\\otelcol.ps1 --config otel.yml',
        codeLanguage: 'powershell',
      },
    ],
    [setupData, isMetricsOnboardingEnabled, isManagedOtlpServiceAvailable, useWiredStreams]
  );

  const selectedContent = installTabContents.find((tab) => tab.id === selectedTab)!;

  if (error) {
    return <EmptyPrompt onboardingFlowType="otel_logs" error={error} onRetryClick={refetch} />;
  }

  return (
    <EuiPanel hasBorder paddingSize="xl">
      <EuiFlexGroup direction="column" gutterSize="none">
        <MultiIntegrationInstallBanner />
        <ManagedOtlpCallout />
        <EuiSteps
          steps={[
            {
              title: i18n.translate('xpack.observability_onboarding.otelLogsPanel.steps.platform', {
                defaultMessage: 'Select your platform',
              }),

              children: (
                <EuiFlexGroup direction="column" gutterSize="l">
                  <EuiFlexItem grow={false}>
                    <EuiFlexGroup direction="column" gutterSize="s">
                      {!isWiredStreamsLoading && (
                        <EuiText size="s">
                          <strong>
                            {i18n.translate(
                              'xpack.observability_onboarding.otelLogsPanel.osSelector',
                              {
                                defaultMessage: 'OS selector',
                              }
                            )}
                          </strong>
                        </EuiText>
                      )}
                      <EuiFlexItem grow={false}>
                        <EuiButtonGroup
                          legend={i18n.translate(
                            'xpack.observability_onboarding.otelLogsPanel.choosePlatform',
                            {
                              defaultMessage: 'Choose platform',
                            }
                          )}
                          options={installTabContents.map(({ id, name }) => ({
                            id,
                            label: name,
                          }))}
                          type="single"
                          idSelected={selectedTab}
                          onChange={(id: string) => {
                            setSelectedTab(id);
                          }}
                        />
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlexItem>

                  {!isWiredStreamsLoading && (
                    <EuiFlexItem grow={false}>
                      <WiredStreamsIngestionSelector
                        ingestionMode={ingestionMode}
                        onChange={setIngestionMode}
                        streamsDocLink={docLinks?.links.observability.logsStreams}
                        isWiredStreamsEnabled={isWiredStreamsEnabled}
                        isEnabling={isEnabling}
                        flowType="otel_host"
                        onEnableWiredStreams={enableWiredStreams}
                      />
                    </EuiFlexItem>
                  )}

                  {!setupData && <EuiSkeletonText lines={6} />}

                  {setupData && (
                    <>
                      <EuiFlexItem grow={false}>
                        <EuiFlexGroup direction="column" gutterSize="s">
                          <EuiText size="s">
                            <strong>{selectedContent.firstStepTitle}</strong>
                          </EuiText>
                          <EuiCodeBlock
                            language={selectedContent.codeLanguage}
                            isCopyable
                            overflowHeight={300}
                          >
                            {selectedContent.content}
                          </EuiCodeBlock>
                        </EuiFlexGroup>
                      </EuiFlexItem>
                      <EuiFlexItem align="left">
                        <EuiFlexGroup>
                          <EuiCopy textToCopy={selectedContent.content}>
                            {(copy) => (
                              <EuiButton
                                data-test-subj="observabilityOnboardingOtelLogsPanelButton"
                                iconType="copy"
                                onClick={copy}
                              >
                                {i18n.translate(
                                  'xpack.observability_onboarding.installOtelCollector.configStep.copyCommand',
                                  { defaultMessage: 'Copy to clipboard' }
                                )}
                              </EuiButton>
                            )}
                          </EuiCopy>
                        </EuiFlexGroup>
                      </EuiFlexItem>
                    </>
                  )}
                </EuiFlexGroup>
              ),
            },
            {
              title: i18n.translate('xpack.observability_onboarding.otelLogsPanel.steps.start', {
                defaultMessage: 'Start the collector',
              }),
              children: (
                <EuiFlexGroup direction="column">
                  <EuiCallOut
                    title={i18n.translate(
                      'xpack.observability_onboarding.otelLogsPanel.limitationTitle',
                      {
                        defaultMessage: 'Configuration Information',
                      }
                    )}
                    color="warning"
                    iconType="info"
                  >
                    <p>
                      {i18n.translate(
                        'xpack.observability_onboarding.otelLogsPanel.historicalDataDescription',
                        {
                          defaultMessage: 'New log messages are collected from the setup onward.',
                        }
                      )}
                    </p>
                    <p>
                      {selectedTab === 'windows'
                        ? i18n.translate(
                            'xpack.observability_onboarding.otelLogsPanel.windowsLogDescription',
                            {
                              defaultMessage:
                                'On Windows, logs are collected from the Windows Event Log. You can customize this in the otel.yml file.',
                            }
                          )
                        : i18n.translate(
                            'xpack.observability_onboarding.otelLogsPanel.historicalDataDescription2',
                            {
                              defaultMessage:
                                'The default log path is /var/log/*. You can change this path in the otel.yml file if needed.',
                            }
                          )}
                    </p>
                  </EuiCallOut>

                  <EuiText>
                    <p>
                      {i18n.translate(
                        'xpack.observability_onboarding.otelLogsPanel.p.startTheCollectorLabel',
                        {
                          defaultMessage: 'Run the following command to start the collector',
                        }
                      )}
                    </p>
                  </EuiText>
                  <CopyableCodeBlock content={selectedContent.start} />
                </EuiFlexGroup>
              ),
            },
            {
              title: i18n.translate(
                'xpack.observability_onboarding.otelLogsPanel.steps.visualize',
                {
                  defaultMessage: 'Visualize your data',
                }
              ),
              status: (hasData || hasPreExistingDataFinal
                ? 'complete'
                : isMonitoringStepActive
                ? 'current'
                : 'incomplete') as EuiStepStatus,
              children: isMonitoringStepActive ? (
                <>
                  {!(hasPreExistingDataFinal && !hasData) && (
                    <ProgressIndicator
                      title={
                        hasData
                          ? i18n.translate(
                              'xpack.observability_onboarding.otelLogsPanel.monitoringHost',
                              { defaultMessage: 'We are monitoring your host' }
                            )
                          : i18n.translate(
                              'xpack.observability_onboarding.otelLogsPanel.waitingForData',
                              { defaultMessage: 'Waiting for data to be shipped' }
                            )
                      }
                      iconType="checkInCircleFilled"
                      isLoading={!hasData}
                      css={css`
                        max-width: 40%;
                      `}
                      data-test-subj="observabilityOnboardingOtelHostDataProgressIndicator"
                    />
                  )}

                  {isTroubleshootingVisible && (
                    <>
                      <EuiSpacer />
                      <EuiText color="subdued" size="s">
                        <FormattedMessage
                          id="xpack.observability_onboarding.otelLogsPanel.troubleshootingTextLabel"
                          defaultMessage="Find more details and troubleshooting solutions in our documentation. {troubleshootingLink}"
                          values={{
                            troubleshootingLink: (
                              <EuiLink
                                data-test-subj="observabilityOnboardingOtelLogsPanelTroubleshootingLink"
                                href="https://ela.st/elastic-otel"
                                external
                                target="_blank"
                              >
                                {i18n.translate(
                                  'xpack.observability_onboarding.otelLogsPanel.troubleshootingLinkText',
                                  { defaultMessage: 'Open documentation' }
                                )}
                              </EuiLink>
                            ),
                          }}
                        />
                      </EuiText>
                    </>
                  )}

                  {(hasData === true || hasPreExistingDataFinal) &&
                    visualizeActionLinks.length > 0 && (
                      <>
                        <EuiSpacer />
                        <GetStartedPanel
                          onboardingFlowType="otel_logs"
                          dataset="otel_logs"
                          integration="system_otel"
                          onboardingId={setupData?.onboardingId ?? ''}
                          newTab={false}
                          isLoading={false}
                          actionLinks={visualizeActionLinks}
                        />
                      </>
                    )}
                </>
              ) : null,
            },
          ]}
        />

        <FeedbackButtons flow="otel_logs" />
      </EuiFlexGroup>
    </EuiPanel>
  );
};

function CopyableCodeBlock({ content }: { content: string }) {
  return (
    <>
      <EuiCodeBlock language="yaml">{content}</EuiCodeBlock>
      <EuiCopy textToCopy={content}>
        {(copy) => (
          <EuiButton
            data-test-subj="observabilityOnboardingCopyableCodeBlockCopyToClipboardButton"
            iconType="copy"
            onClick={copy}
          >
            {i18n.translate(
              'xpack.observability_onboarding.installOtelCollector.configStep.copyCommand',
              {
                defaultMessage: 'Copy to clipboard',
              }
            )}
          </EuiButton>
        )}
      </EuiCopy>
    </>
  );
}
