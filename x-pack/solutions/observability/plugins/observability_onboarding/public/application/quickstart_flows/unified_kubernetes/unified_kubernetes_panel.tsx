/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { EuiButtonGroup, EuiPanel, EuiSpacer, EuiSteps, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { usePerformanceContext } from '@kbn/ebt-tools';
import { DASHBOARD_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import { type LogsLocatorParams, LOGS_LOCATOR_ID } from '@kbn/logs-shared-plugin/common';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';
import { EmptyPrompt } from '../shared/empty_prompt';
import { FeedbackButtons } from '../shared/feedback_buttons';
import { useKubernetesFlow } from '../kubernetes/use_kubernetes_flow';
import { usePreExistingDataCheck } from '../shared/use_pre_existing_data_check';
import { useWindowBlurDataMonitoringTrigger } from '../shared/use_window_blur_data_monitoring_trigger';
import { type IngestionMode } from '../shared/wired_streams_ingestion_selector';
import { usePricingFeature } from '../shared/use_pricing_feature';
import { ObservabilityOnboardingPricingFeature } from '../../../../common/pricing_features';
import {
  WIRED_ECS_DATA_VIEW_SPEC,
  WIRED_OTEL_DATA_VIEW_SPEC,
} from '../shared/wired_streams_data_view';
import type { ObservabilityOnboardingAppServices } from '../../..';
import type { ActionLink } from '../kubernetes/data_ingest_status';
import {
  buildAgentSteps,
  AGENT_CLUSTER_OVERVIEW_DASHBOARD_ID,
} from '../kubernetes/build_agent_steps';
import { buildOtelSteps } from '../otel_kubernetes/build_otel_steps';
import { buildInstallStackCommand } from '../otel_kubernetes/build_install_stack_command';
import { buildValuesFileUrl } from '../otel_kubernetes/build_values_file_url';
import {
  CLUSTER_OVERVIEW_DASHBOARD_ID as OTEL_CLUSTER_OVERVIEW_DASHBOARD_ID,
  OTEL_HELM_CHARTS_REPO,
} from '../otel_kubernetes/constants';
import { useManagedOtlpServiceAvailability } from '../../shared/use_managed_otlp_service_availability';
import { useWiredStreamsStatus } from '../../../hooks/use_wired_streams_status';
import { ManagedOtlpCallout } from '../shared/managed_otlp_callout';

export type CollectorType = 'kubernetes' | 'kubernetes_otel';

interface UnifiedKubernetesPanelProps {
  defaultCollector?: CollectorType;
}

const COLLECTOR_OPTIONS = [
  {
    id: 'kubernetes' as const,
    label: i18n.translate(
      'xpack.observability_onboarding.unifiedKubernetesPanel.collectorToggle.agent',
      { defaultMessage: 'Elastic Agent' }
    ),
  },
  {
    id: 'kubernetes_otel' as const,
    label: i18n.translate(
      'xpack.observability_onboarding.unifiedKubernetesPanel.collectorToggle.otel',
      { defaultMessage: 'OpenTelemetry' }
    ),
  },
];

export const UnifiedKubernetesPanel: React.FC<UnifiedKubernetesPanelProps> = ({
  defaultCollector = 'kubernetes',
}) => {
  const [collector, setCollector] = useState<CollectorType>(defaultCollector);
  const isOtel = collector === 'kubernetes_otel';
  const { data, status, error, refetch } = useKubernetesFlow(collector);

  const {
    services: { share, docLinks },
  } = useKibana<ObservabilityOnboardingAppServices>();

  const theme = useEuiTheme();
  const { onPageReady } = usePerformanceContext();
  const metricsOnboardingEnabled = usePricingFeature(
    ObservabilityOnboardingPricingFeature.METRICS_ONBOARDING
  );
  const isManagedOtlpServiceAvailable = useManagedOtlpServiceAvailability();

  const dashboardLocator = share.url.locators.get(DASHBOARD_APP_LOCATOR);
  const logsLocator = share.url.locators.get<LogsLocatorParams>(LOGS_LOCATOR_ID);
  const apmLocator = share.url.locators.get('APM_LOCATOR');

  const {
    isEnabled: isWiredStreamsEnabled,
    isLoading: isWiredStreamsLoading,
    isEnabling,
    enableWiredStreams,
  } = useWiredStreamsStatus();

  const [ingestionMode, setIngestionMode] = useState<IngestionMode>('classic');
  const useWiredStreams = ingestionMode === 'wired';

  const [dataReceived, setDataReceived] = useState(false);
  const [idSelected, setIdSelected] = useState('nodejs');

  const hasPreExistingDataEarly = usePreExistingDataCheck({
    flow: 'kubernetes',
    onboardingId: data?.onboardingId,
    ...(isOtel ? { enabled: useWiredStreams } : {}),
  });

  const windowBlurred = useWindowBlurDataMonitoringTrigger({
    isActive: status === FETCH_STATUS.SUCCESS,
    onboardingFlowType: collector,
    onboardingId: data?.onboardingId,
  });

  const isMonitoringStepActive = windowBlurred || hasPreExistingDataEarly;

  const logsLocatorParams = useWiredStreams
    ? { dataViewSpec: isOtel ? WIRED_OTEL_DATA_VIEW_SPEC : WIRED_ECS_DATA_VIEW_SPEC }
    : {};

  useEffect(() => {
    if (data) {
      onPageReady({
        meta: {
          description: `[ttfmp_onboarding] Request to create the onboarding flow succeeded and the flow's UI has rendered`,
        },
      });
    }
  }, [data, onPageReady]);

  useEffect(() => {
    setDataReceived(false);
  }, [collector]);

  const onDataReceived = useCallback(() => setDataReceived(true), []);

  if (error !== undefined) {
    return <EmptyPrompt onboardingFlowType={collector} error={error} onRetryClick={refetch} />;
  }

  const agentActionLinks: ActionLink[] = [
    ...(metricsOnboardingEnabled
      ? [
          {
            id: AGENT_CLUSTER_OVERVIEW_DASHBOARD_ID,
            label: i18n.translate(
              'xpack.observability_onboarding.kubernetesPanel.exploreDashboard',
              { defaultMessage: 'Explore Kubernetes cluster' }
            ),
            title: i18n.translate(
              'xpack.observability_onboarding.kubernetesPanel.monitoringCluster',
              {
                defaultMessage: 'Overview your Kubernetes cluster with this pre-made dashboard',
              }
            ),
            requires: 'metrics' as const,
            href:
              dashboardLocator?.getRedirectUrl({
                dashboardId: AGENT_CLUSTER_OVERVIEW_DASHBOARD_ID,
              }) ?? '',
          },
        ]
      : []),
    {
      id: 'logs',
      title: i18n.translate('xpack.observability_onboarding.kubernetesPanel.logsTitle', {
        defaultMessage: 'View and analyze your logs:',
      }),
      label: i18n.translate('xpack.observability_onboarding.kubernetesPanel.logsLabel', {
        defaultMessage: 'Explore logs',
      }),
      requires: 'logs' as const,
      href: logsLocator?.getRedirectUrl(logsLocatorParams) ?? '',
    },
  ];

  const otelActionLinks: ActionLink[] = [
    ...(metricsOnboardingEnabled
      ? [
          {
            id: OTEL_CLUSTER_OVERVIEW_DASHBOARD_ID,
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
                dashboardId: OTEL_CLUSTER_OVERVIEW_DASHBOARD_ID,
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

  const addRepoCommand = `helm repo add open-telemetry '${OTEL_HELM_CHARTS_REPO}' --force-update`;
  const otelKubeStackValuesFileUrl = data
    ? buildValuesFileUrl({
        isMetricsOnboardingEnabled: metricsOnboardingEnabled,
        isManagedOtlpServiceAvailable,
        agentVersion: data.elasticAgentVersionInfo.agentBaseVersion,
      })
    : undefined;
  const installStackCommand = data
    ? buildInstallStackCommand({
        isMetricsOnboardingEnabled: metricsOnboardingEnabled,
        isManagedOtlpServiceAvailable,
        managedOtlpEndpointUrl: data.managedOtlpServiceUrl,
        elasticsearchUrl: data.elasticsearchUrl,
        apiKeyEncoded: data.apiKeyEncoded,
        agentVersion: data.elasticAgentVersionInfo.agentBaseVersion,
        useWiredStreams,
        onboardingId: data.onboardingId,
      })
    : undefined;

  const steps = isOtel
    ? buildOtelSteps({
        data,
        isMonitoringStepActive,
        dataReceived,
        hasPreExistingDataEarly,
        isMetricsOnboardingEnabled: metricsOnboardingEnabled,
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
        actionLinks: otelActionLinks,
        onDataReceived,
        theme,
      })
    : buildAgentSteps({
        data,
        status,
        isMonitoringStepActive,
        dataReceived,
        hasPreExistingDataEarly,
        ingestionMode,
        onIngestionModeChange: setIngestionMode,
        actionLinks: agentActionLinks,
        onDataReceived,
      });

  return (
    <EuiPanel hasBorder paddingSize="xl">
      {isOtel && <ManagedOtlpCallout />}
      <EuiButtonGroup
        legend={i18n.translate(
          'xpack.observability_onboarding.unifiedKubernetesPanel.collectorToggle.legend',
          { defaultMessage: 'Select collection method' }
        )}
        idSelected={collector}
        onChange={(optionId) => setCollector(optionId as CollectorType)}
        options={COLLECTOR_OPTIONS}
        buttonSize="m"
        isFullWidth
      />
      <EuiSpacer size="l" />
      <EuiSteps steps={steps} />
      <FeedbackButtons flow={isOtel ? 'otel_kubernetes' : 'kubernetes'} />
    </EuiPanel>
  );
};
