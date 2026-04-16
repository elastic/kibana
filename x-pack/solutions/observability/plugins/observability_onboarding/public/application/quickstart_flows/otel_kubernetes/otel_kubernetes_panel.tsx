/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import { EuiPanel, EuiSteps, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { DASHBOARD_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import { usePerformanceContext } from '@kbn/ebt-tools';
import { type LogsLocatorParams, LOGS_LOCATOR_ID } from '@kbn/logs-shared-plugin/common';
import { ObservabilityOnboardingPricingFeature } from '../../../../common/pricing_features';
import { type ObservabilityOnboardingAppServices } from '../../..';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';
import { EmptyPrompt } from '../shared/empty_prompt';
import { FeedbackButtons } from '../shared/feedback_buttons';
import { usePreExistingDataCheck } from '../shared/use_pre_existing_data_check';
import { useWindowBlurDataMonitoringTrigger } from '../shared/use_window_blur_data_monitoring_trigger';
import { type ActionLink } from '../kubernetes/data_ingest_status';
import { type IngestionMode } from '../shared/wired_streams_ingestion_selector';
import { useKubernetesFlow } from '../kubernetes/use_kubernetes_flow';
import { useFlowBreadcrumb } from '../../shared/use_flow_breadcrumbs';
import { buildInstallStackCommand } from './build_install_stack_command';
import { CLUSTER_OVERVIEW_DASHBOARD_ID, OTEL_HELM_CHARTS_REPO } from './constants';
import { buildValuesFileUrl } from './build_values_file_url';
import { useManagedOtlpServiceAvailability } from '../../shared/use_managed_otlp_service_availability';
import { usePricingFeature } from '../shared/use_pricing_feature';
import { ManagedOtlpCallout } from '../shared/managed_otlp_callout';
import { useWiredStreamsStatus } from '../../../hooks/use_wired_streams_status';
import { WIRED_OTEL_DATA_VIEW_SPEC } from '../shared/wired_streams_data_view';
import { buildOtelSteps } from './build_otel_steps';

export const OtelKubernetesPanel: React.FC = () => {
  useFlowBreadcrumb({
    text: i18n.translate('xpack.observability_onboarding.autoDetectPanel.breadcrumbs.k8sOtel', {
      defaultMessage: 'Kubernetes: OpenTelemetry',
    }),
  });
  const { data, status, error, refetch } = useKubernetesFlow('kubernetes_otel');
  const [idSelected, setIdSelected] = useState('nodejs');
  const {
    services: { share, docLinks },
  } = useKibana<ObservabilityOnboardingAppServices>();

  const apmLocator = share.url.locators.get('APM_LOCATOR');
  const dashboardLocator = share.url.locators.get(DASHBOARD_APP_LOCATOR);
  const logsLocator = share.url.locators.get<LogsLocatorParams>(LOGS_LOCATOR_ID);
  const theme = useEuiTheme();
  const { onPageReady } = usePerformanceContext();
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

  const [dataReceived, setDataReceived] = useState(false);

  const hasPreExistingDataEarly = usePreExistingDataCheck({
    flow: 'kubernetes',
    onboardingId: data?.onboardingId,
    enabled: useWiredStreams,
  });

  const windowBlurred = useWindowBlurDataMonitoringTrigger({
    isActive: status === FETCH_STATUS.SUCCESS,
    onboardingFlowType: 'kubernetes_otel',
    onboardingId: data?.onboardingId,
  });

  const isMonitoringStepActive = windowBlurred || hasPreExistingDataEarly;
  const logsLocatorParams = useWiredStreams ? { dataViewSpec: WIRED_OTEL_DATA_VIEW_SPEC } : {};

  useEffect(() => {
    if (data) {
      onPageReady({
        meta: {
          description: `[ttfmp_onboarding] Request to create the onboarding flow succeeded and the flow's UI has rendered`,
        },
      });
    }
  }, [data, onPageReady]);

  if (error) {
    return (
      <EmptyPrompt onboardingFlowType="kubernetes_otel" error={error} onRetryClick={refetch} />
    );
  }

  const addRepoCommand = `helm repo add open-telemetry '${OTEL_HELM_CHARTS_REPO}' --force-update`;
  const otelKubeStackValuesFileUrl = data
    ? buildValuesFileUrl({
        isMetricsOnboardingEnabled,
        isManagedOtlpServiceAvailable,
        agentVersion: data.elasticAgentVersionInfo.agentBaseVersion,
      })
    : undefined;
  const installStackCommand = data
    ? buildInstallStackCommand({
        isMetricsOnboardingEnabled,
        isManagedOtlpServiceAvailable,
        managedOtlpEndpointUrl: data.managedOtlpServiceUrl,
        elasticsearchUrl: data.elasticsearchUrl,
        apiKeyEncoded: data.apiKeyEncoded,
        agentVersion: data.elasticAgentVersionInfo.agentBaseVersion,
        useWiredStreams,
        onboardingId: data.onboardingId,
      })
    : undefined;

  const otelKubernetesActionLinks: ActionLink[] = [
    ...(isMetricsOnboardingEnabled
      ? [
          {
            id: CLUSTER_OVERVIEW_DASHBOARD_ID,
            title: i18n.translate(
              'xpack.observability_onboarding.otelKubernetesPanel.monitoringCluster',
              { defaultMessage: 'Check your Kubernetes cluster health:' }
            ),
            label: i18n.translate(
              'xpack.observability_onboarding.otelKubernetesPanel.exploreDashboard',
              { defaultMessage: 'Explore Kubernetes Cluster Dashboard' }
            ),
            requires: 'metrics' as const,
            href:
              dashboardLocator?.getRedirectUrl({
                dashboardId: CLUSTER_OVERVIEW_DASHBOARD_ID,
              }) ?? '',
          },
          {
            id: 'services',
            title: i18n.translate(
              'xpack.observability_onboarding.otelKubernetesPanel.servicesTitle',
              { defaultMessage: 'Check your application services:' }
            ),
            label: i18n.translate(
              'xpack.observability_onboarding.otelKubernetesPanel.servicesLabel',
              { defaultMessage: 'Explore Service inventory' }
            ),
            requires: 'metrics' as const,
            href: apmLocator?.getRedirectUrl({ serviceName: undefined }) ?? '',
          },
        ]
      : []),
    {
      id: 'logs',
      title: i18n.translate('xpack.observability_onboarding.otelKubernetesPanel.logsTitle', {
        defaultMessage: 'View and analyze your logs:',
      }),
      label: i18n.translate('xpack.observability_onboarding.otelKubernetesPanel.logsLabel', {
        defaultMessage: 'Explore logs',
      }),
      href: logsLocator?.getRedirectUrl(logsLocatorParams) ?? '',
    },
  ];

  const steps = buildOtelSteps({
    data,
    isMonitoringStepActive,
    dataReceived,
    hasPreExistingDataEarly,
    isMetricsOnboardingEnabled,
    isManagedOtlpServiceAvailable,
    addRepoCommand,
    installStackCommand,
    otelKubeStackValuesFileUrl,
    ingestionMode,
    onIngestionModeChange: setIngestionMode,
    isWiredStreamsLoading,
    isWiredStreamsEnabled,
    isEnabling,
    enableWiredStreams,
    streamsDocLink: docLinks?.links.observability.logsStreams,
    useWiredStreams,
    idSelected,
    onLanguageChange: setIdSelected,
    actionLinks: otelKubernetesActionLinks,
    onDataReceived: () => setDataReceived(true),
    theme,
  });

  return (
    <EuiPanel hasBorder paddingSize="xl">
      <ManagedOtlpCallout />
      <EuiSteps steps={steps} />
      <FeedbackButtons flow="otel_kubernetes" />
    </EuiPanel>
  );
};
