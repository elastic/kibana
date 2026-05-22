/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSteps,
  EuiText,
  EuiButtonGroup,
} from '@elastic/eui';
import type { EuiStepStatus } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import { type LogsLocatorParams, LOGS_LOCATOR_ID } from '@kbn/logs-shared-plugin/common';
import { usePerformanceContext } from '@kbn/ebt-tools';
import { ObservabilityOnboardingPricingFeature } from '../../../../common/pricing_features';
import type { ObservabilityOnboardingAppServices } from '../../..';
import { useFetcher } from '../../../hooks/use_fetcher';
import { usePreExistingDataCheck } from '../shared/use_pre_existing_data_check';
import { useWindowBlurDataMonitoringTrigger } from '../shared/use_window_blur_data_monitoring_trigger';
import { useTimeWindowDataDetection } from '../shared/use_time_window_data_detection';
import { useWiredStreamsStatus } from '../../../hooks/use_wired_streams_status';
import { MultiIntegrationInstallBanner } from './multi_integration_install_banner';
import { EmptyPrompt } from '../shared/empty_prompt';
import { FeedbackButtons } from '../shared/feedback_buttons';
import { type IngestionMode } from '../shared/wired_streams_ingestion_selector';
import { useFlowBreadcrumb } from '../../shared/use_flow_breadcrumbs';
import {
  OtelLogsInstallStep,
  OtelLogsStartStep,
  OtelLogsVisualizeStep,
  type OtelOs,
} from './steps';
import { useManagedOtlpServiceAvailability } from '../../shared/use_managed_otlp_service_availability';
import { usePricingFeature } from '../shared/use_pricing_feature';
import { ManagedOtlpCallout } from '../shared/managed_otlp_callout';
import { WIRED_OTEL_DATA_VIEW_SPEC } from '../shared/wired_streams_data_view';
import {
  OTEL_HOST_FETCH_INTERVAL_MS,
  OTEL_HOST_SHOW_TROUBLESHOOTING_DELAY_MS,
} from './data_detection_constants';

export const OtelLogsPanel: React.FC = () => {
  useFlowBreadcrumb(
    i18n.translate('xpack.observability_onboarding.otelLogsPanel.breadcrumb', {
      defaultMessage: 'OpenTelemetry: Logs & Metrics',
    })
  );
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

  const [selectedTab, setSelectedTab] = useState<OtelOs>('linux');

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
    fetchInterval: OTEL_HOST_FETCH_INTERVAL_MS,
    troubleshootingDelay: OTEL_HOST_SHOW_TROUBLESHOOTING_DELAY_MS,
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
    () =>
      [
        { id: 'linux' as const, name: 'Linux' },
        { id: 'mac' as const, name: 'Mac' },
        { id: 'windows' as const, name: 'Windows' },
      ] as const,
    []
  );

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
                              'xpack.observability_onboarding.otelLogsPanel.operatingSystemLabel',
                              {
                                defaultMessage: 'Operating system',
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
                            setSelectedTab(id as OtelOs);
                          }}
                        />
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlexItem>

                  <OtelLogsInstallStep
                    os={selectedTab}
                    setupData={setupData}
                    ingestionMode={ingestionMode}
                    onIngestionModeChange={setIngestionMode}
                    isMetricsOnboardingEnabled={isMetricsOnboardingEnabled}
                    isManagedOtlpServiceAvailable={isManagedOtlpServiceAvailable}
                    wiredStreamsStatus={{
                      isEnabled: isWiredStreamsEnabled,
                      isLoading: isWiredStreamsLoading,
                      isEnabling,
                      enableWiredStreams,
                    }}
                    streamsDocLink={docLinks?.links.observability.logsStreams}
                  />
                </EuiFlexGroup>
              ),
            },
            {
              title: i18n.translate('xpack.observability_onboarding.otelLogsPanel.steps.start', {
                defaultMessage: 'Start the collector',
              }),
              children: <OtelLogsStartStep os={selectedTab} />,
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
              children: (
                <OtelLogsVisualizeStep
                  isMonitoringStepActive={isMonitoringStepActive}
                  hasData={hasData}
                  hasPreExistingData={hasPreExistingDataFinal}
                  isTroubleshootingVisible={isTroubleshootingVisible}
                  onboardingId={setupData?.onboardingId ?? ''}
                  actionLinks={visualizeActionLinks}
                />
              ),
            },
          ]}
        />

        <FeedbackButtons flow="otel_logs" />
      </EuiFlexGroup>
    </EuiPanel>
  );
};
