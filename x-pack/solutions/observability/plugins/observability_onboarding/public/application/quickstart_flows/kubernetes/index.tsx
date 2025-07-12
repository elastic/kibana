/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import {
  EuiPanel,
  EuiSkeletonRectangle,
  EuiSkeletonText,
  EuiSpacer,
  EuiSteps,
  EuiStepStatus,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { usePerformanceContext } from '@kbn/ebt-tools';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';
import { EmptyPrompt } from '../shared/empty_prompt';
import { CommandSnippet } from './command_snippet';
import { DataIngestStatus } from './data_ingest_status';
import { FeedbackButtons } from '../shared/feedback_buttons';
import { useKubernetesFlow } from './use_kubernetes_flow';
import { useWindowBlurDataMonitoringTrigger } from '../shared/use_window_blur_data_monitoring_trigger';
import { useFlowBreadcrumb } from '../../shared/use_flow_breadcrumbs';

export const KubernetesPanel: React.FC = () => {
  useFlowBreadcrumb({
    text: i18n.translate('xpack.observability_onboarding.autoDetectPanel.breadcrumbs.k8s', {
      defaultMessage: 'Kubernetes: Logs & Metrics',
    }),
  });
  const { data, status, error, refetch } = useKubernetesFlow();
  const { onPageReady } = usePerformanceContext();

  const isMonitoringStepActive = useWindowBlurDataMonitoringTrigger({
    isActive: status === FETCH_STATUS.SUCCESS,
    onboardingFlowType: 'kubernetes',
    onboardingId: data?.onboardingId,
  });

  useEffect(() => {
    if (data) {
      onPageReady({
        meta: {
          description: `[ttfmp_onboarding] Request to create the onboarding flow succeeded and the flow's UI has rendered`,
        },
      });
    }
  }, [data, onPageReady]);

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
        <DataIngestStatus onboardingId={data.onboardingId} />
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
