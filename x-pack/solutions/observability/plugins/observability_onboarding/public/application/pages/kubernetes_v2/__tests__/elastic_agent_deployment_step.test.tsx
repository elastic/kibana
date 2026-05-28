/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { FETCH_STATUS } from '../../../../hooks/use_fetcher';
import type { IngestionMode } from '../../../quickstart_flows/shared/wired_streams_ingestion_selector';
import type { KubernetesFlowData } from '../../../quickstart_flows/kubernetes/steps';
import { renderWithHostPageProviders } from '../../host/__tests__/test_helpers';
import { ElasticAgentDeploymentStep } from '../elastic_agent_deployment_step';

jest.mock('../fleet_managed', () => ({
  FleetManagedKubernetesStep: () => (
    <div data-test-subj="observabilityOnboardingKubernetesV2FleetManagedStep" />
  ),
}));

jest.mock('../../../quickstart_flows/kubernetes/steps', () => ({
  KubernetesElasticAgentInstallStep: ({
    status,
    data,
    isMonitoringStepActive,
    ingestionMode,
    onIngestionModeChange,
    useInlineCopyOnly,
    useColoredSyntax,
  }: {
    status: FETCH_STATUS;
    data?: KubernetesFlowData;
    isMonitoringStepActive: boolean;
    ingestionMode: IngestionMode;
    onIngestionModeChange: (mode: IngestionMode) => void;
    useInlineCopyOnly?: boolean;
    useColoredSyntax?: boolean;
  }) => (
    <div
      data-test-subj="kubernetesEaInstallStep"
      data-status={status}
      data-onboarding-id={data?.onboardingId}
      data-is-monitoring-step-active={String(isMonitoringStepActive)}
      data-ingestion-mode={ingestionMode}
      data-has-on-ingestion-mode-change={String(typeof onIngestionModeChange === 'function')}
      data-use-inline-copy-only={String(useInlineCopyOnly)}
      data-use-colored-syntax={String(useColoredSyntax)}
    />
  ),
}));

const mockFlowData: KubernetesFlowData = {
  apiKeyEncoded: 'encoded-key',
  onboardingId: 'onboarding-123',
  elasticsearchUrl: 'https://localhost:9200',
  elasticAgentVersionInfo: {
    agentVersion: '8.0.0',
    agentBaseVersion: '8.0.0',
    agentDockerImageVersion: '8.0.0',
  },
};

const defaultProps = {
  status: FETCH_STATUS.SUCCESS,
  data: mockFlowData,
  isMonitoringStepActive: false,
  ingestionMode: 'classic' as const,
  onIngestionModeChange: jest.fn(),
};

describe('ElasticAgentDeploymentStep', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('selects the Fleet-managed tab by default', () => {
    renderWithHostPageProviders(<ElasticAgentDeploymentStep {...defaultProps} />);

    expect(
      screen.getByTestId('observabilityOnboardingKubernetesV2ElasticAgentDeploymentTabs')
    ).toBeInTheDocument();
    expect(
      screen.getByTestId(
        'observabilityOnboardingKubernetesV2ElasticAgentDeploymentTab-fleet-managed'
      )
    ).toHaveAttribute('aria-selected', 'true');
    expect(
      screen.getByTestId('observabilityOnboardingKubernetesV2FleetManagedStep')
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('observabilityOnboardingKubernetesV2ElasticAgentDeploymentContent')
    ).toBeInTheDocument();
    expect(screen.queryByTestId('kubernetesEaInstallStep')).not.toBeInTheDocument();
  });

  it('renders the Fleet-managed step in the first tab', () => {
    renderWithHostPageProviders(<ElasticAgentDeploymentStep {...defaultProps} />);

    expect(
      screen.getByTestId('observabilityOnboardingKubernetesV2FleetManagedStep')
    ).toBeInTheDocument();
  });

  it('renders the standalone install step when the Standalone tab is selected', async () => {
    renderWithHostPageProviders(<ElasticAgentDeploymentStep {...defaultProps} />);

    await userEvent.click(
      screen.getByTestId('observabilityOnboardingKubernetesV2ElasticAgentDeploymentTab-standalone')
    );

    expect(screen.getByTestId('kubernetesEaInstallStep')).toBeInTheDocument();
    expect(
      screen.queryByTestId('observabilityOnboardingKubernetesV2FleetManagedStep')
    ).not.toBeInTheDocument();
  });

  it('passes install step props to the standalone tab', async () => {
    const onIngestionModeChange = jest.fn();

    renderWithHostPageProviders(
      <ElasticAgentDeploymentStep
        {...defaultProps}
        status={FETCH_STATUS.LOADING}
        data={mockFlowData}
        isMonitoringStepActive={true}
        ingestionMode="wired"
        onIngestionModeChange={onIngestionModeChange}
      />
    );

    await userEvent.click(
      screen.getByTestId('observabilityOnboardingKubernetesV2ElasticAgentDeploymentTab-standalone')
    );

    const installStep = screen.getByTestId('kubernetesEaInstallStep');
    expect(installStep).toHaveAttribute('data-status', FETCH_STATUS.LOADING);
    expect(installStep).toHaveAttribute('data-onboarding-id', 'onboarding-123');
    expect(installStep).toHaveAttribute('data-is-monitoring-step-active', 'true');
    expect(installStep).toHaveAttribute('data-ingestion-mode', 'wired');
    expect(installStep).toHaveAttribute('data-has-on-ingestion-mode-change', 'true');
    expect(installStep).toHaveAttribute('data-use-inline-copy-only', 'true');
    expect(installStep).toHaveAttribute('data-use-colored-syntax', 'true');
  });
});
