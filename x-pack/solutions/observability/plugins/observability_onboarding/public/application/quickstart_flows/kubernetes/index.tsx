/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPanel, EuiSkeletonRectangle, EuiSkeletonText, EuiSpacer, EuiSteps } from '@elastic/eui';
import type { EuiStepStatus } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DASHBOARD_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';
import { EmptyPrompt } from '../shared/empty_prompt';
import { CommandSnippet } from './command_snippet';
import { DataIngestStatus } from './data_ingest_status';
import { FeedbackButtons } from '../shared/feedback_buttons';
import { useKubernetesFlow } from './use_kubernetes_flow';
import { useWindowBlurDataMonitoringTrigger } from '../shared/use_window_blur_data_monitoring_trigger';
import type { ObservabilityOnboardingContextValue } from '../../../plugin';

const CLUSTER_OVERVIEW_DASHBOARD_ID = 'kubernetes-f4dc26db-1b53-4ea2-a78b-1bfab8ea267c';

export const KubernetesPanel: React.FC = () => {
  const { data, status, error, refetch } = useKubernetesFlow('kubernetes');
  const {
    services: { share },
  } = useKibana<ObservabilityOnboardingContextValue>();
  const dashboardLocator = share.url.locators.get(DASHBOARD_APP_LOCATOR);

  const isMonitoringStepActive = useWindowBlurDataMonitoringTrigger({
    isActive: status === FETCH_STATUS.SUCCESS,
    onboardingFlowType: 'kubernetes',
    onboardingId: data?.onboardingId,
  });

  if (error !== undefined) {
    return <EmptyPrompt onboardingFlowType="kubernetes" error={error} onRetryClick={refetch} />;
  }

  const steps = [
    {
      title: i18n.translate(
        'xpack.observability_onboarding.experimentalOnboardingFlow.kubernetes.installStepTitle',
        {
          defaultMessage: 'Install standalone Elastic Agent on your Kubernetes cluster',
        }
      ),
      children: (
        <>
          {status !== FETCH_STATUS.SUCCESS && (
            <>
              <EuiSkeletonText lines={5} />
              <EuiSpacer />
              <EuiSkeletonRectangle width="170px" height="40px" />
            </>
          )}
          {status === FETCH_STATUS.SUCCESS && data !== undefined && (
            <CommandSnippet
              encodedApiKey={data.apiKeyEncoded}
              onboardingId={data.onboardingId}
              elasticsearchUrl={data.elasticsearchUrl}
              elasticAgentVersionInfo={data.elasticAgentVersionInfo}
              isCopyPrimaryAction={!isMonitoringStepActive}
            />
          )}
        </>
      ),
    },
    {
      title: i18n.translate(
        'xpack.observability_onboarding.experimentalOnboardingFlow.kubernetes.monitorStepTitle',
        {
          defaultMessage: 'Monitor your Kubernetes cluster',
        }
      ),
      status: (isMonitoringStepActive ? 'current' : 'incomplete') as EuiStepStatus,
      children: isMonitoringStepActive && data && (
        <DataIngestStatus
          onboardingId={data.onboardingId}
          onboardingFlowType="kubernetes"
          dataset="kubernetes"
          integration="kubernetes"
          respectPreExistingData={false}
          actionLinks={[
            {
              id: CLUSTER_OVERVIEW_DASHBOARD_ID,
              label: i18n.translate(
                'xpack.observability_onboarding.kubernetesPanel.exploreDashboard',
                {
                  defaultMessage: 'Explore Kubernetes cluster',
                }
              ),
              title: i18n.translate(
                'xpack.observability_onboarding.kubernetesPanel.monitoringCluster',
                {
                  defaultMessage: 'Overview your Kubernetes cluster with this pre-made dashboard',
                }
              ),
              href:
                dashboardLocator?.getRedirectUrl({
                  dashboardId: CLUSTER_OVERVIEW_DASHBOARD_ID,
                }) ?? '',
            },
          ]}
        />
      ),
    },
  ];

  return (
    <EuiPanel hasBorder paddingSize="xl">
      <EuiSteps steps={steps} />
      <FeedbackButtons flow="kubernetes" />
    </EuiPanel>
  );
};
