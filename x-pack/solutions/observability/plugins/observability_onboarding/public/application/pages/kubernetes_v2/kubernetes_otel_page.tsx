/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { EuiStepStatus, EuiStepsProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useLocation } from 'react-router-dom';
import { useSearchParams } from 'react-router-dom-v5-compat';
import { DASHBOARD_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import { usePerformanceContext } from '@kbn/ebt-tools';
import { type LogsLocatorParams, LOGS_LOCATOR_ID } from '@kbn/logs-shared-plugin/common';
import { ObservabilityOnboardingPricingFeature } from '../../../../common/pricing_features';
import type { ObservabilityOnboardingAppServices } from '../../..';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';
import { useWiredStreamsStatus } from '../../../hooks/use_wired_streams_status';
import { OnboardingFlowLayout } from '../../shared/onboarding_flow_layout';
import { CollectionMethodSelector } from '../../shared/collection_method_selector';
import { usePreExistingDataCheck } from '../../quickstart_flows/shared/use_pre_existing_data_check';
import { useWindowBlurDataMonitoringTrigger } from '../../quickstart_flows/shared/use_window_blur_data_monitoring_trigger';
import { useManagedOtlpServiceAvailability } from '../../shared/use_managed_otlp_service_availability';
import { usePricingFeature } from '../../quickstart_flows/shared/use_pricing_feature';
import {
  parseIngestionMode,
  type IngestionMode,
} from '../../quickstart_flows/shared/wired_streams_ingestion_selector';
import { FeedbackButtons } from '../../quickstart_flows/shared/feedback_buttons';
import { ManagedOtlpCallout } from '../../quickstart_flows/shared/managed_otlp_callout';
import { EmptyPrompt } from '../../quickstart_flows/shared/empty_prompt';
import { useFlowBreadcrumb } from '../../shared/use_flow_breadcrumbs';
import { WIRED_OTEL_DATA_VIEW_SPEC } from '../../quickstart_flows/shared/wired_streams_data_view';
import { useKubernetesFlow } from '../../quickstart_flows/kubernetes/use_kubernetes_flow';
import { buildInstallStackCommand } from '../../quickstart_flows/otel_kubernetes/build_install_stack_command';
import {
  CLUSTER_OVERVIEW_DASHBOARD_ID,
  OTEL_HELM_CHARTS_REPO,
} from '../../quickstart_flows/otel_kubernetes/constants';
import { buildValuesFileUrl } from '../../quickstart_flows/otel_kubernetes/build_values_file_url';
import { buildOtelKubernetesActionLinks } from '../../quickstart_flows/otel_kubernetes/build_otel_kubernetes_action_links';
import { OtelKubernetesVisualizeStep } from '../../quickstart_flows/otel_kubernetes/steps';
import { OtelCollectorSetupStep } from './otel_collector_setup_step';
import { OtelInstrumentationStep } from './otel_instrumentation_step';
import {
  buildKubernetesCollectionMethodOptions,
  KUBERNETES_SELECTOR_LEGEND,
  KUBERNETES_SELECTOR_STEP_TITLE,
} from './kubernetes_collection_method_options';

const SET_UP_OTEL_COLLECTOR_TITLE = i18n.translate(
  'xpack.observability_onboarding.kubernetesV2.otel.collectorSetupStepTitle',
  {
    defaultMessage: 'Set up the OpenTelemetry Collector',
  }
);

const INSTRUMENT_APPLICATION_STEP_TITLE = i18n.translate(
  'xpack.observability_onboarding.kubernetesV2.otel.instrumentationStepTitle',
  {
    defaultMessage: 'Instrument your application',
  }
);

export const KubernetesOtelPage: React.FC = () => {
  useFlowBreadcrumb(
    i18n.translate('xpack.observability_onboarding.autoDetectPanel.breadcrumbs.k8sOtel', {
      defaultMessage: 'Kubernetes: OpenTelemetry',
    })
  );

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

  const { data, status, error, refetch } = useKubernetesFlow('kubernetes_otel');
  const {
    services: { share, docLinks },
  } = useKibana<ObservabilityOnboardingAppServices>();

  const { onPageReady } = usePerformanceContext();
  const isMetricsOnboardingEnabled = usePricingFeature(
    ObservabilityOnboardingPricingFeature.METRICS_ONBOARDING
  );
  const isManagedOtlpServiceAvailable = useManagedOtlpServiceAvailability();
  const wiredStreamsStatus = useWiredStreamsStatus();

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
  const logsLocatorParams = useMemo(
    () => (useWiredStreams ? { dataViewSpec: WIRED_OTEL_DATA_VIEW_SPEC } : {}),
    [useWiredStreams]
  );

  useEffect(() => {
    if (data) {
      onPageReady({
        meta: {
          description: `[ttfmp_onboarding] Request to create the onboarding flow succeeded and the flow's UI has rendered`,
        },
      });
    }
  }, [data, onPageReady]);

  const apmLocator = share.url.locators.get('APM_LOCATOR');
  const dashboardLocator = share.url.locators.get(DASHBOARD_APP_LOCATOR);
  const logsLocator = share.url.locators.get<LogsLocatorParams>(LOGS_LOCATOR_ID);

  const otelKubernetesActionLinks = useMemo(
    () =>
      buildOtelKubernetesActionLinks({
        isMetricsOnboardingEnabled,
        dashboardHref:
          dashboardLocator?.getRedirectUrl({ dashboardId: CLUSTER_OVERVIEW_DASHBOARD_ID }) ?? '',
        servicesHref: apmLocator?.getRedirectUrl({ serviceName: undefined }) ?? '',
        logsHref: logsLocator?.getRedirectUrl(logsLocatorParams) ?? '',
      }),
    [isMetricsOnboardingEnabled, dashboardLocator, apmLocator, logsLocator, logsLocatorParams]
  );

  const search = location.search;
  const otelNavigateTo = `/kubernetes${search}`;
  const elasticAgentNavigateTo = `/kubernetes/elastic-agent${search}`;

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

  const steps: EuiStepsProps['steps'] = useMemo(() => {
    const collectionMethodStep = {
      title: KUBERNETES_SELECTOR_STEP_TITLE,
      children: (
        <CollectionMethodSelector
          legend={KUBERNETES_SELECTOR_LEGEND}
          selectedId="otel"
          options={buildKubernetesCollectionMethodOptions({
            otelNavigateTo,
            elasticAgentNavigateTo,
          })}
        />
      ),
    };

    const collectorSetupStep = error
      ? {
          title: SET_UP_OTEL_COLLECTOR_TITLE,
          status: 'danger' as const,
          children: (
            <EmptyPrompt
              inline
              onboardingFlowType="kubernetes_otel"
              error={error}
              onRetryClick={refetch}
            />
          ),
        }
      : {
          title: SET_UP_OTEL_COLLECTOR_TITLE,
          children: (
            <OtelCollectorSetupStep
              addRepoCommand={addRepoCommand}
              installStackCommand={installStackCommand}
              valuesFileUrl={otelKubeStackValuesFileUrl}
              ingestionMode={ingestionMode}
              onIngestionModeChange={setIngestionMode}
              streamsDocLink={docLinks?.links.observability.logsStreams}
              isManagedOtlpServiceAvailable={isManagedOtlpServiceAvailable}
              onboardingId={data?.onboardingId}
              wiredStreamsStatus={wiredStreamsStatus}
            />
          ),
        };

    if (error) {
      return [collectionMethodStep, collectorSetupStep];
    }

    const instrumentStep = isMetricsOnboardingEnabled
      ? {
          title: INSTRUMENT_APPLICATION_STEP_TITLE,
          children: <OtelInstrumentationStep />,
        }
      : null;

    const visualizeStep = {
      title: i18n.translate('xpack.observability_onboarding.otelKubernetesPanel.monitorStepTitle', {
        defaultMessage: 'Visualize your data',
      }),
      status: (dataReceived || hasPreExistingDataEarly
        ? 'complete'
        : isMonitoringStepActive
        ? 'current'
        : 'incomplete') as EuiStepStatus,
      children: (
        <OtelKubernetesVisualizeStep
          isMonitoringStepActive={isMonitoringStepActive}
          data={data}
          actionLinks={otelKubernetesActionLinks}
          useWiredStreams={useWiredStreams}
          onDataReceived={() => setDataReceived(true)}
        />
      ),
    };

    return [
      collectionMethodStep,
      collectorSetupStep,
      ...(instrumentStep ? [instrumentStep] : []),
      visualizeStep,
    ];
  }, [
    otelNavigateTo,
    elasticAgentNavigateTo,
    addRepoCommand,
    error,
    refetch,
    installStackCommand,
    otelKubeStackValuesFileUrl,
    ingestionMode,
    setIngestionMode,
    docLinks?.links.observability.logsStreams,
    isManagedOtlpServiceAvailable,
    wiredStreamsStatus,
    isMetricsOnboardingEnabled,
    dataReceived,
    hasPreExistingDataEarly,
    isMonitoringStepActive,
    data,
    otelKubernetesActionLinks,
    useWiredStreams,
  ]);

  return (
    <OnboardingFlowLayout
      title={i18n.translate('xpack.observability_onboarding.kubernetesV2.otel.title', {
        defaultMessage: 'Monitor your Kubernetes cluster',
      })}
      subtitle={i18n.translate('xpack.observability_onboarding.kubernetesV2.otel.subtitle', {
        defaultMessage: 'Collect logs, metrics, and traces from your Kubernetes infrastructure.',
      })}
      logo="kubernetes"
      returnTo="/"
      bodyDataTestSubj="observabilityOnboardingKubernetesV2Layout-otel"
      returnDataTestSubj="observabilityOnboardingKubernetesV2Return"
      banners={<ManagedOtlpCallout />}
      steps={steps}
      feedback={<FeedbackButtons flow="otel_kubernetes" />}
    />
  );
};
