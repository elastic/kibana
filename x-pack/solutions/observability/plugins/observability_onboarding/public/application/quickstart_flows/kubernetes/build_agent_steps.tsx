/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiStepProps, EuiStepStatus } from '@elastic/eui';
import { EuiSkeletonRectangle, EuiSkeletonText, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';
import { CommandSnippet } from './command_snippet';
import { DataIngestStatus, type ActionLink } from './data_ingest_status';
import type { IngestionMode } from '../shared/wired_streams_ingestion_selector';
import type { KubernetesFlowData } from './use_kubernetes_flow';

export const AGENT_CLUSTER_OVERVIEW_DASHBOARD_ID =
  'kubernetes-f4dc26db-1b53-4ea2-a78b-1bfab8ea267c';

export interface BuildAgentStepsParams {
  data?: KubernetesFlowData;
  status: FETCH_STATUS;
  isMonitoringStepActive: boolean;
  dataReceived: boolean;
  hasPreExistingDataEarly: boolean;
  ingestionMode: IngestionMode;
  onIngestionModeChange: (mode: IngestionMode) => void;
  actionLinks: ActionLink[];
  onDataReceived: () => void;
}

export const buildAgentSteps = ({
  data,
  status,
  isMonitoringStepActive,
  dataReceived,
  hasPreExistingDataEarly,
  ingestionMode,
  onIngestionModeChange,
  actionLinks,
  onDataReceived,
}: BuildAgentStepsParams): EuiStepProps[] => [
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
            ingestionMode={ingestionMode}
            onIngestionModeChange={onIngestionModeChange}
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
    status: (dataReceived || hasPreExistingDataEarly
      ? 'complete'
      : isMonitoringStepActive
      ? 'current'
      : 'incomplete') as EuiStepStatus,
    children: isMonitoringStepActive && data && (
      <DataIngestStatus
        onboardingId={data.onboardingId}
        onboardingFlowType="kubernetes"
        dataset="kubernetes"
        integration="kubernetes"
        actionLinks={actionLinks}
        onDataReceived={onDataReceived}
      />
    ),
  },
];
