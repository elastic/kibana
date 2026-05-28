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
import { OnboardingFlowLayout } from '../../shared/onboarding_flow_layout';
import { CollectionMethodSelector } from '../../shared/collection_method_selector';
import { usePreExistingDataCheck } from '../../quickstart_flows/shared/use_pre_existing_data_check';
import { useWindowBlurDataMonitoringTrigger } from '../../quickstart_flows/shared/use_window_blur_data_monitoring_trigger';
import {
  parseIngestionMode,
  type IngestionMode,
} from '../../quickstart_flows/shared/wired_streams_ingestion_selector';
import { FeedbackButtons } from '../../quickstart_flows/shared/feedback_buttons';
import { EmptyPrompt } from '../../quickstart_flows/shared/empty_prompt';
import { useFlowBreadcrumb } from '../../shared/use_flow_breadcrumbs';
import { WIRED_ECS_DATA_VIEW_SPEC } from '../../quickstart_flows/shared/wired_streams_data_view';
import { useKubernetesFlow } from '../../quickstart_flows/kubernetes/use_kubernetes_flow';
import { KubernetesElasticAgentVisualizeStep } from '../../quickstart_flows/kubernetes/steps';
import { ElasticAgentAppInstrumentationStep } from './elastic_agent_app_instrumentation_step';
import { ElasticAgentDeploymentStep } from './elastic_agent_deployment_step';
import type { ActionLink } from '../../quickstart_flows/kubernetes/data_ingest_status';
import { usePricingFeature } from '../../quickstart_flows/shared/use_pricing_feature';
import {
  buildKubernetesCollectionMethodOptions,
  KUBERNETES_SELECTOR_LEGEND,
  KUBERNETES_SELECTOR_STEP_TITLE,
} from './kubernetes_collection_method_options';

const CLUSTER_OVERVIEW_DASHBOARD_ID = 'kubernetes-f4dc26db-1b53-4ea2-a78b-1bfab8ea267c';

export const KubernetesElasticAgentPage: React.FC = () => {
  useFlowBreadcrumb(
    i18n.translate('xpack.observability_onboarding.autoDetectPanel.breadcrumbs.k8sElasticAgent', {
      defaultMessage: 'Kubernetes: Elastic Agent',
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

  const { data, status, error, refetch } = useKubernetesFlow();
  const {
    services: { share },
  } = useKibana<ObservabilityOnboardingAppServices>();

  const { onPageReady } = usePerformanceContext();
  const metricsOnboardingEnabled = usePricingFeature(
    ObservabilityOnboardingPricingFeature.METRICS_ONBOARDING
  );

  const useWiredStreams = ingestionMode === 'wired';
  const logsLocatorParams = useMemo(
    () => (useWiredStreams ? { dataViewSpec: WIRED_ECS_DATA_VIEW_SPEC } : {}),
    [useWiredStreams]
  );

  const [dataReceived, setDataReceived] = useState(false);

  const hasPreExistingDataEarly = usePreExistingDataCheck({
    flow: 'kubernetes',
    onboardingId: data?.onboardingId,
  });

  const windowBlurred = useWindowBlurDataMonitoringTrigger({
    isActive: status === FETCH_STATUS.SUCCESS,
    onboardingFlowType: 'kubernetes',
    onboardingId: data?.onboardingId,
  });

  const isMonitoringStepActive = windowBlurred || hasPreExistingDataEarly;

  useEffect(() => {
    if (data) {
      onPageReady({
        meta: {
          description: `[ttfmp_onboarding] Request to create the onboarding flow succeeded and the flow's UI has rendered`,
        },
      });
    }
  }, [data, onPageReady]);

  const dashboardLocator = share.url.locators.get(DASHBOARD_APP_LOCATOR);
  const logsLocator = share.url.locators.get<LogsLocatorParams>(LOGS_LOCATOR_ID);

  const kubernetesActionLinks: ActionLink[] = useMemo(
    () => [
      ...(metricsOnboardingEnabled
        ? [
            {
              id: CLUSTER_OVERVIEW_DASHBOARD_ID,
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
                  dashboardId: CLUSTER_OVERVIEW_DASHBOARD_ID,
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
    ],
    [metricsOnboardingEnabled, dashboardLocator, logsLocator, logsLocatorParams]
  );

  const search = location.search;
  const otelNavigateTo = `/kubernetes${search}`;
  const elasticAgentNavigateTo = `/kubernetes/elastic-agent${search}`;

  const installStepTitle = i18n.translate(
    'xpack.observability_onboarding.kubernetesV2.elasticAgent.deploymentStepTitle',
    {
      defaultMessage: 'Deploy Elastic Agent on your Kubernetes cluster',
    }
  );

  const monitorStepTitle = i18n.translate(
    'xpack.observability_onboarding.experimentalOnboardingFlow.kubernetes.monitorStepTitle',
    {
      defaultMessage: 'Monitor your Kubernetes cluster',
    }
  );

  const steps: EuiStepsProps['steps'] = useMemo(() => {
    const collectionMethodStep = {
      title: KUBERNETES_SELECTOR_STEP_TITLE,
      children: (
        <CollectionMethodSelector
          legend={KUBERNETES_SELECTOR_LEGEND}
          selectedId="elastic-agent"
          options={buildKubernetesCollectionMethodOptions({
            otelNavigateTo,
            elasticAgentNavigateTo,
          })}
        />
      ),
    };

    const installStep = error
      ? {
          title: installStepTitle,
          status: 'danger' as const,
          children: (
            <EmptyPrompt
              inline
              onboardingFlowType="kubernetes"
              error={error}
              onRetryClick={refetch}
            />
          ),
        }
      : {
          title: installStepTitle,
          children: (
            <ElasticAgentDeploymentStep
              status={status}
              data={data}
              isMonitoringStepActive={isMonitoringStepActive}
              ingestionMode={ingestionMode}
              onIngestionModeChange={setIngestionMode}
            />
          ),
        };

    if (error) {
      return [collectionMethodStep, installStep];
    }

    const appInstrumentationStep = {
      title: i18n.translate(
        'xpack.observability_onboarding.kubernetesV2.elasticAgent.appInstrumentationStepTitle',
        { defaultMessage: 'Instrument your application' }
      ),
      children: <ElasticAgentAppInstrumentationStep />,
    };

    const visualizeStep = {
      title: monitorStepTitle,
      status: (dataReceived || hasPreExistingDataEarly
        ? 'complete'
        : isMonitoringStepActive
        ? 'current'
        : 'incomplete') as EuiStepStatus,
      children: (
        <KubernetesElasticAgentVisualizeStep
          isMonitoringStepActive={isMonitoringStepActive}
          data={data}
          actionLinks={kubernetesActionLinks}
          onDataReceived={() => setDataReceived(true)}
        />
      ),
    };

    return [collectionMethodStep, installStep, appInstrumentationStep, visualizeStep];
  }, [
    otelNavigateTo,
    elasticAgentNavigateTo,
    error,
    refetch,
    installStepTitle,
    status,
    data,
    isMonitoringStepActive,
    ingestionMode,
    setIngestionMode,
    monitorStepTitle,
    dataReceived,
    hasPreExistingDataEarly,
    kubernetesActionLinks,
  ]);

  return (
    <OnboardingFlowLayout
      title={i18n.translate('xpack.observability_onboarding.kubernetesV2.elasticAgent.title', {
        defaultMessage: 'Monitor your Kubernetes cluster',
      })}
      subtitle={i18n.translate(
        'xpack.observability_onboarding.kubernetesV2.elasticAgent.subtitle',
        {
          defaultMessage: 'Collect logs, metrics, and traces from your Kubernetes infrastructure.',
        }
      )}
      logo="kubernetes"
      returnTo="/"
      bodyDataTestSubj="observabilityOnboardingKubernetesV2Layout-elastic-agent"
      returnDataTestSubj="observabilityOnboardingKubernetesV2Return"
      steps={steps}
      feedback={<FeedbackButtons flow="kubernetes" />}
    />
  );
};
