/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiSpacer, EuiTabbedContent, type EuiTabbedContentTab } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { FETCH_STATUS } from '../../../hooks/use_fetcher';
import {
  KubernetesElasticAgentInstallStep,
  type KubernetesFlowData,
} from '../../quickstart_flows/kubernetes/steps';
import type { IngestionMode } from '../../quickstart_flows/shared/wired_streams_ingestion_selector';
import { FleetManagedKubernetesStep } from './fleet_managed';

type DeploymentTabId = 'fleet-managed' | 'standalone';

export interface ElasticAgentDeploymentStepProps {
  status: FETCH_STATUS;
  data?: KubernetesFlowData;
  isMonitoringStepActive: boolean;
  ingestionMode: IngestionMode;
  onIngestionModeChange: (mode: IngestionMode) => void;
}

export const ElasticAgentDeploymentStep: React.FC<ElasticAgentDeploymentStepProps> = ({
  status,
  data,
  isMonitoringStepActive,
  ingestionMode,
  onIngestionModeChange,
}) => {
  const tabs = useMemo<Array<EuiTabbedContentTab & { id: DeploymentTabId }>>(
    () => [
      {
        id: 'fleet-managed',
        name: i18n.translate(
          'xpack.observability_onboarding.kubernetesV2.elasticAgentDeployment.fleetManagedTabLabel',
          { defaultMessage: 'Fleet-managed' }
        ),
        'data-test-subj':
          'observabilityOnboardingKubernetesV2ElasticAgentDeploymentTab-fleet-managed',
        content: (
          <div data-test-subj="observabilityOnboardingKubernetesV2ElasticAgentDeploymentContent">
            <EuiSpacer size="l" />
            <FleetManagedKubernetesStep />
          </div>
        ),
      },
      {
        id: 'standalone',
        name: i18n.translate(
          'xpack.observability_onboarding.kubernetesV2.elasticAgentDeployment.standaloneTabLabel',
          { defaultMessage: 'Standalone' }
        ),
        'data-test-subj': 'observabilityOnboardingKubernetesV2ElasticAgentDeploymentTab-standalone',
        content: (
          <div data-test-subj="observabilityOnboardingKubernetesV2ElasticAgentDeploymentContent">
            <EuiSpacer size="l" />
            <KubernetesElasticAgentInstallStep
              status={status}
              data={data}
              isMonitoringStepActive={isMonitoringStepActive}
              ingestionMode={ingestionMode}
              onIngestionModeChange={onIngestionModeChange}
              useInlineCopyOnly={true}
              useColoredSyntax={true}
            />
          </div>
        ),
      },
    ],
    [status, data, isMonitoringStepActive, ingestionMode, onIngestionModeChange]
  );

  return (
    <div data-test-subj="observabilityOnboardingKubernetesV2ElasticAgentDeploymentTabs">
      <EuiTabbedContent tabs={tabs} initialSelectedTab={tabs[0]} />
    </div>
  );
};
