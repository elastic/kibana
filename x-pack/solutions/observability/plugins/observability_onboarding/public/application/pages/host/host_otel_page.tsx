/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { EuiStepsProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useLocation } from 'react-router-dom';
import { useSearchParams } from 'react-router-dom-v5-compat';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import { type LogsLocatorParams, LOGS_LOCATOR_ID } from '@kbn/logs-shared-plugin/common';
import { usePerformanceContext } from '@kbn/ebt-tools';
import { useFetcher } from '../../../hooks/use_fetcher';
import type { ObservabilityOnboardingAppServices } from '../../..';
import { OnboardingFlowLayout } from '../../shared/onboarding_flow_layout';
import type { HostOs } from './host_os';
import { CollectionMethodSelector } from '../../shared/collection_method_selector';
import type { SupportedLogo } from '../../shared/logo_icon';
import { usePreExistingDataCheck } from '../../quickstart_flows/shared/use_pre_existing_data_check';
import { useWindowBlurDataMonitoringTrigger } from '../../quickstart_flows/shared/use_window_blur_data_monitoring_trigger';
import { useTimeWindowDataDetection } from '../../quickstart_flows/shared/use_time_window_data_detection';
import { useWiredStreamsStatus } from '../../../hooks/use_wired_streams_status';
import { useManagedOtlpServiceAvailability } from '../../shared/use_managed_otlp_service_availability';
import { usePricingFeature } from '../../quickstart_flows/shared/use_pricing_feature';
import { ObservabilityOnboardingPricingFeature } from '../../../../common/pricing_features';
import {
  OtelLogsInstallStep,
  OtelLogsStartStep,
  OtelLogsVisualizeStep,
  type OtelLogsSetupData,
} from '../../quickstart_flows/otel_logs/steps';
import {
  OTEL_HOST_FETCH_INTERVAL_MS,
  OTEL_HOST_SHOW_TROUBLESHOOTING_DELAY_MS,
} from '../../quickstart_flows/otel_logs/data_detection_constants';
import {
  parseIngestionMode,
  type IngestionMode,
} from '../../quickstart_flows/shared/wired_streams_ingestion_selector';
import { FeedbackButtons } from '../../quickstart_flows/shared/feedback_buttons';
import { MultiIntegrationInstallBanner } from '../../quickstart_flows/otel_logs/multi_integration_install_banner';
import { ManagedOtlpCallout } from '../../quickstart_flows/shared/managed_otlp_callout';
import { EmptyPrompt } from '../../quickstart_flows/shared/empty_prompt';
import { useFlowBreadcrumb } from '../../shared/use_flow_breadcrumbs';
import { WIRED_OTEL_DATA_VIEW_SPEC } from '../../quickstart_flows/shared/wired_streams_data_view';
import {
  buildHostCollectionMethodOptions,
  HOST_SELECTOR_LEGEND,
  HOST_SELECTOR_STEP_TITLE,
} from './host_collection_method_options';

export interface HostOtelPageProps {
  os: HostOs;
  routePath: string;
  breadcrumbLabel: string;
  title: string;
  subtitle: string;
  logo: SupportedLogo;
  installStepTitle: string;
}

export const HostOtelPage: React.FC<HostOtelPageProps> = ({
  os,
  routePath,
  breadcrumbLabel,
  title,
  subtitle,
  logo,
  installStepTitle,
}) => {
  useFlowBreadcrumb(breadcrumbLabel);

  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const ingestionMode = parseIngestionMode(searchParams.get('ingestion'));
  const setIngestionMode = useCallback(
    (mode: IngestionMode) => {
      const next = new URLSearchParams(searchParams);
      if (mode === 'classic') {
        next.delete('ingestion');
      } else {
        next.set('ingestion', mode);
      }
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  const {
    services: { share, docLinks },
  } = useKibana<ObservabilityOnboardingAppServices>();

  const { onPageReady } = usePerformanceContext();

  const isMetricsOnboardingEnabled = usePricingFeature(
    ObservabilityOnboardingPricingFeature.METRICS_ONBOARDING
  );
  const isManagedOtlpServiceAvailable = useManagedOtlpServiceAvailability();
  const wiredStreamsStatus = useWiredStreamsStatus();

  const {
    data: setupData,
    error,
    refetch,
  } = useFetcher<Promise<OtelLogsSetupData>>(
    (callApi) => callApi('POST /internal/observability_onboarding/otel_host/setup'),
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

  // has-data probe is namespaced per backend route (otel_host); analytics
  // stays on otel_logs so V1 and V2 dashboards remain continuous.
  const hasPreExistingDataEarly = usePreExistingDataCheck({ flow: 'otel_host' });

  const windowBlurred = useWindowBlurDataMonitoringTrigger({
    isActive: !!setupData,
    onboardingFlowType: 'otel_logs',
    onboardingId: setupData?.onboardingId,
  });
  const isMonitoringStepActive = windowBlurred || hasPreExistingDataEarly;

  const [sessionStartTime, setSessionStartTime] = useState<string | null>(null);
  useEffect(() => {
    if (isMonitoringStepActive && sessionStartTime === null) {
      setSessionStartTime(new Date().toISOString());
    }
  }, [isMonitoringStepActive, sessionStartTime]);

  const onboardingId = setupData?.onboardingId;
  const useWiredStreams = ingestionMode === 'wired';
  // OTel semantic-convention `host.os.type` filter so cross-OS ingest in the
  // same cluster can't complete an unrelated session. Skipped for wired
  // streams because the streams pipeline does not project host.os.type onto
  // the indexed docs, and wired streams are already per-stream-name isolated
  // so cross-OS bleed-through isn't a risk there.
  const hostOsTypeFilter: Record<HostOs, string> = {
    linux: 'linux',
    mac: 'darwin',
    windows: 'windows',
  };
  const { hasData, hasPreExistingData, isTroubleshootingVisible } = useTimeWindowDataDetection({
    isMonitoringActive:
      isMonitoringStepActive && sessionStartTime !== null && onboardingId !== undefined,
    sessionStartTime: sessionStartTime ?? '',
    fetchInterval: OTEL_HOST_FETCH_INTERVAL_MS,
    troubleshootingDelay: OTEL_HOST_SHOW_TROUBLESHOOTING_DELAY_MS,
    flowType: 'otel_logs',
    onboardingId: onboardingId ?? '',
    endpoint: '/internal/observability_onboarding/otel_host/has-data',
    extraQueryParams: useWiredStreams ? undefined : { osType: hostOsTypeFilter[os] },
    keepExtraParamsOnFallback: true,
  });

  const hasPreExistingDataFinal = hasPreExistingData || hasPreExistingDataEarly;

  // Elastic Agent auto-detect script is bash-only; Windows has no counterpart.
  const showCollectionMethodSelector = os !== 'windows';
  const otelNavigateTo = `${routePath}${location.search}`;
  const eaNavigateTo = showCollectionMethodSelector
    ? `${routePath}/auto-detect${location.search}`
    : undefined;

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

  const steps: EuiStepsProps['steps'] = useMemo(() => {
    const collectionMethodStep =
      showCollectionMethodSelector && eaNavigateTo
        ? {
            title: HOST_SELECTOR_STEP_TITLE,
            children: (
              <CollectionMethodSelector
                legend={HOST_SELECTOR_LEGEND}
                selectedId="otel"
                options={buildHostCollectionMethodOptions({ otelNavigateTo, eaNavigateTo })}
              />
            ),
          }
        : null;

    const installStep = error
      ? {
          title: installStepTitle,
          status: 'danger' as const,
          children: (
            <EmptyPrompt
              inline
              onboardingFlowType="otel_logs"
              error={error}
              onRetryClick={refetch}
            />
          ),
        }
      : {
          title: installStepTitle,
          children: (
            <OtelLogsInstallStep
              os={os}
              setupData={setupData}
              ingestionMode={ingestionMode}
              onIngestionModeChange={setIngestionMode}
              isMetricsOnboardingEnabled={isMetricsOnboardingEnabled}
              isManagedOtlpServiceAvailable={isManagedOtlpServiceAvailable}
              wiredStreamsStatus={wiredStreamsStatus}
              streamsDocLink={docLinks?.links.observability.logsStreams}
              useInlineCopyOnly
              useColoredSyntax
            />
          ),
        };

    if (error) {
      return collectionMethodStep ? [collectionMethodStep, installStep] : [installStep];
    }

    const startStep = {
      title: i18n.translate('xpack.observability_onboarding.otelLogsPanel.steps.start', {
        defaultMessage: 'Start the collector',
      }),
      children: <OtelLogsStartStep os={os} useInlineCopyOnly useColoredSyntax />,
    };

    const visualizeStep = {
      title: i18n.translate('xpack.observability_onboarding.otelLogsPanel.steps.visualize', {
        defaultMessage: 'Visualize your data',
      }),
      ...(hasData || hasPreExistingDataFinal
        ? { status: 'complete' as const }
        : isMonitoringStepActive
        ? { status: 'current' as const }
        : {}),
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
    };

    return collectionMethodStep
      ? [collectionMethodStep, installStep, startStep, visualizeStep]
      : [installStep, startStep, visualizeStep];
  }, [
    os,
    showCollectionMethodSelector,
    installStepTitle,
    otelNavigateTo,
    eaNavigateTo,
    error,
    refetch,
    setupData,
    ingestionMode,
    setIngestionMode,
    isMetricsOnboardingEnabled,
    isManagedOtlpServiceAvailable,
    wiredStreamsStatus,
    docLinks?.links.observability.logsStreams,
    isMonitoringStepActive,
    hasData,
    hasPreExistingDataFinal,
    isTroubleshootingVisible,
    visualizeActionLinks,
  ]);

  return (
    <OnboardingFlowLayout
      title={title}
      subtitle={subtitle}
      logo={logo}
      returnTo="/"
      bodyDataTestSubj={`observabilityOnboardingHostLayout-${os}`}
      returnDataTestSubj="observabilityOnboardingHostReturn"
      banners={
        <>
          <MultiIntegrationInstallBanner />
          <ManagedOtlpCallout />
        </>
      }
      steps={steps}
      feedback={<FeedbackButtons flow="otel_logs" />}
    />
  );
};
