/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen } from '@testing-library/react';
import React from 'react';
import { KubernetesElasticAgentPage } from '../kubernetes_elastic_agent_page';
import { buildFetchError, renderWithHostPageProviders } from '../../host/__tests__/test_helpers';

jest.mock('../elastic_agent_deployment_step', () => ({
  ElasticAgentDeploymentStep: ({ ingestionMode }: { ingestionMode: string }) => (
    <div data-test-subj="elasticAgentDeploymentStep" data-ingestion-mode={ingestionMode} />
  ),
}));

jest.mock('../elastic_agent_app_instrumentation_step', () => ({
  ElasticAgentAppInstrumentationStep: () => (
    <div data-test-subj="elasticAgentAppInstrumentationStep" />
  ),
}));

jest.mock('../../../quickstart_flows/kubernetes/steps', () => ({
  KubernetesElasticAgentVisualizeStep: () => <div data-test-subj="kubernetesEaVisualizeStep" />,
}));

jest.mock('../../../quickstart_flows/shared/empty_prompt', () => ({
  EmptyPrompt: ({
    onboardingFlowType,
    inline,
  }: {
    onboardingFlowType: string;
    inline?: boolean;
  }) => (
    <div
      data-test-subj="emptyPromptStub"
      data-onboarding-flow-type={onboardingFlowType}
      data-inline={inline ? 'true' : 'false'}
    />
  ),
}));

jest.mock('@kbn/ebt-tools', () => ({
  usePerformanceContext: () => ({
    onPageReady: jest.fn(),
    onPageRefreshStart: jest.fn(),
  }),
}));

jest.mock('../../../quickstart_flows/kubernetes/use_kubernetes_flow', () => ({
  useKubernetesFlow: jest.fn().mockReturnValue({
    data: undefined,
    status: 'loading',
    error: undefined,
    refetch: jest.fn(),
  }),
}));

const { useKubernetesFlow: useKubernetesFlowMock } = jest.requireMock(
  '../../../quickstart_flows/kubernetes/use_kubernetes_flow'
);

jest.mock('../../../shared/use_flow_breadcrumbs', () => ({
  useFlowBreadcrumb: jest.fn(),
}));

jest.mock('../../../../hooks/use_wired_streams_status', () => ({
  useWiredStreamsStatus: () => ({
    isEnabled: false,
    isLoading: false,
    isEnabling: false,
    enableWiredStreams: jest.fn(),
  }),
}));

jest.mock('../../../quickstart_flows/shared/use_pricing_feature', () => ({
  usePricingFeature: () => true,
}));

jest.mock('../../../quickstart_flows/shared/use_pre_existing_data_check', () => ({
  usePreExistingDataCheck: jest.fn().mockReturnValue(false),
}));
jest.mock('../../../quickstart_flows/shared/use_window_blur_data_monitoring_trigger', () => ({
  useWindowBlurDataMonitoringTrigger: jest.fn().mockReturnValue(false),
}));

const { usePreExistingDataCheck: usePreExistingDataCheckMock } = jest.requireMock(
  '../../../quickstart_flows/shared/use_pre_existing_data_check'
);
const { useWindowBlurDataMonitoringTrigger: useWindowBlurDataMonitoringTriggerMock } =
  jest.requireMock('../../../quickstart_flows/shared/use_window_blur_data_monitoring_trigger');

const mockKubernetesFlowData = {
  onboardingId: 'test-onboarding-id',
  elasticsearchUrl: 'https://localhost:9200',
  apiKeyEncoded: 'encoded-key',
  elasticAgentVersionInfo: { agentBaseVersion: '8.0.0' },
};

const renderPage = (initialEntries: string[] = ['/kubernetes/elastic-agent']) =>
  renderWithHostPageProviders(<KubernetesElasticAgentPage />, { initialEntries });

describe('KubernetesElasticAgentPage', () => {
  beforeEach(() => {
    useKubernetesFlowMock.mockReturnValue({
      data: mockKubernetesFlowData,
      status: 'success',
      error: undefined,
      refetch: jest.fn(),
    });
    usePreExistingDataCheckMock.mockReturnValue(false);
    useWindowBlurDataMonitoringTriggerMock.mockReturnValue(false);
  });

  it('renders the Kubernetes Elastic Agent layout chrome', () => {
    renderPage();
    expect(
      screen.getByTestId('observabilityOnboardingKubernetesV2Layout-elastic-agent')
    ).toBeInTheDocument();
  });

  it('renders the collection method selector with Elastic Agent selected', () => {
    renderPage();
    expect(
      screen.getByTestId('collectionMethodSelectorCard-elastic-agent').getAttribute('data-selected')
    ).toBe('true');
    expect(
      screen.getByTestId('collectionMethodSelectorCard-otel').getAttribute('data-selected')
    ).toBe('false');
  });

  it('passes wired ingestion mode into the deployment step when the URL says so', () => {
    renderPage(['/kubernetes/elastic-agent?ingestion=wired']);
    const deploymentStep = screen.getByTestId('elasticAgentDeploymentStep');
    expect(deploymentStep.getAttribute('data-ingestion-mode')).toBe('wired');
  });

  it('calls useKubernetesFlow with no arguments', () => {
    useKubernetesFlowMock.mockClear();
    renderPage();
    expect(useKubernetesFlowMock).toHaveBeenCalledWith();
  });

  it('wires the pre-existing-data probe with the kubernetes flow id', () => {
    usePreExistingDataCheckMock.mockClear();
    renderPage();
    expect(usePreExistingDataCheckMock).toHaveBeenCalledWith({
      flow: 'kubernetes',
      onboardingId: mockKubernetesFlowData.onboardingId,
    });
  });

  it('reports onboardingFlowType=kubernetes to the window-blur hook', () => {
    useWindowBlurDataMonitoringTriggerMock.mockClear();
    renderPage();
    expect(useWindowBlurDataMonitoringTriggerMock).toHaveBeenCalledWith(
      expect.objectContaining({ onboardingFlowType: 'kubernetes' })
    );
  });

  it('renders the app instrumentation step before visualize when setup succeeds', () => {
    renderPage();
    expect(screen.getByTestId('elasticAgentAppInstrumentationStep')).toBeInTheDocument();
    expect(screen.getByTestId('kubernetesEaVisualizeStep')).toBeInTheDocument();
  });

  it('renders an inline EmptyPrompt and drops the visualize step when setup errors', () => {
    useKubernetesFlowMock.mockReturnValue({
      data: undefined,
      status: 'failure',
      error: buildFetchError(),
      refetch: jest.fn(),
    });
    renderPage();
    const emptyPrompt = screen.getByTestId('emptyPromptStub');
    expect(emptyPrompt.getAttribute('data-onboarding-flow-type')).toBe('kubernetes');
    expect(emptyPrompt.getAttribute('data-inline')).toBe('true');
    expect(screen.getByTestId('collectionMethodSelector')).toBeInTheDocument();
    expect(screen.queryByTestId('elasticAgentAppInstrumentationStep')).toBeNull();
    expect(screen.queryByTestId('kubernetesEaVisualizeStep')).toBeNull();
  });
});
