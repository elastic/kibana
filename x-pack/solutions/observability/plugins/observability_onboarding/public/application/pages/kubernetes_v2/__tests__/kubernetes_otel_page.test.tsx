/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen } from '@testing-library/react';
import React from 'react';
import { KubernetesOtelPage } from '../kubernetes_otel_page';
import { buildFetchError, renderWithHostPageProviders } from '../../host/__tests__/test_helpers';

interface MockOtelCollectorSetupStepProps {
  ingestionMode: string;
  isManagedOtlpServiceAvailable: boolean;
  onboardingId?: string;
}

const mockOtelCollectorSetupStep = jest.fn(
  ({
    ingestionMode,
    isManagedOtlpServiceAvailable,
    onboardingId,
  }: MockOtelCollectorSetupStepProps) => (
    <div
      data-test-subj="otelCollectorSetupStep"
      data-ingestion-mode={ingestionMode}
      data-managed-otlp-service-available={String(isManagedOtlpServiceAvailable)}
      data-onboarding-id={onboardingId}
    />
  )
);

jest.mock('../otel_collector_setup_step', () => ({
  OtelCollectorSetupStep: (props: MockOtelCollectorSetupStepProps) =>
    mockOtelCollectorSetupStep(props),
}));

jest.mock('../otel_instrumentation_step', () => ({
  OtelInstrumentationStep: () => <div data-test-subj="otelInstrumentationStep" />,
}));

jest.mock('../../../quickstart_flows/otel_kubernetes/steps', () => ({
  OtelKubernetesInstrumentStep: () => <div data-test-subj="otelK8sInstrumentStep" />,
  OtelKubernetesVisualizeStep: () => <div data-test-subj="otelK8sVisualizeStep" />,
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

const mockUseManagedOtlpServiceAvailability = jest.fn().mockReturnValue(false);
jest.mock('../../../shared/use_managed_otlp_service_availability', () => ({
  useManagedOtlpServiceAvailability: () => mockUseManagedOtlpServiceAvailability(),
}));

jest.mock('../../../../hooks/use_wired_streams_status', () => ({
  useWiredStreamsStatus: () => ({
    isEnabled: false,
    isLoading: false,
    isEnabling: false,
    enableWiredStreams: jest.fn(),
  }),
}));

const mockUsePricingFeature = jest.fn().mockReturnValue(true);
jest.mock('../../../quickstart_flows/shared/use_pricing_feature', () => ({
  usePricingFeature: (...args: unknown[]) => mockUsePricingFeature(...args),
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
  managedOtlpServiceUrl: 'https://otlp.example',
  elasticAgentVersionInfo: { agentBaseVersion: '8.0.0' },
};

const renderPage = (initialEntries: string[] = ['/kubernetes']) =>
  renderWithHostPageProviders(<KubernetesOtelPage />, { initialEntries });

describe('KubernetesOtelPage', () => {
  beforeEach(() => {
    mockOtelCollectorSetupStep.mockClear();
    mockUseManagedOtlpServiceAvailability.mockReturnValue(false);
    mockUsePricingFeature.mockReturnValue(true);
    useKubernetesFlowMock.mockReturnValue({
      data: mockKubernetesFlowData,
      status: 'success',
      error: undefined,
      refetch: jest.fn(),
    });
    usePreExistingDataCheckMock.mockReturnValue(false);
    useWindowBlurDataMonitoringTriggerMock.mockReturnValue(false);
  });

  it('renders the Kubernetes OTel layout chrome', () => {
    renderPage();
    expect(
      screen.getByTestId('observabilityOnboardingKubernetesV2Layout-otel')
    ).toBeInTheDocument();
  });

  it('renders the collection method selector with OTel selected', () => {
    renderPage();
    expect(
      screen.getByTestId('collectionMethodSelectorCard-otel').getAttribute('data-selected')
    ).toBe('true');
    expect(
      screen.getByTestId('collectionMethodSelectorCard-elastic-agent').getAttribute('data-selected')
    ).toBe('false');
  });

  it('passes wired ingestion mode into the collector setup step when the URL says so', () => {
    renderPage(['/kubernetes?ingestion=wired']);
    const collectorSetupStep = screen.getByTestId('otelCollectorSetupStep');
    expect(collectorSetupStep.getAttribute('data-ingestion-mode')).toBe('wired');
  });

  it('passes managed OTLP availability into the collector setup step', () => {
    mockUseManagedOtlpServiceAvailability.mockReturnValue(true);

    renderPage();

    const collectorSetupStep = screen.getByTestId('otelCollectorSetupStep');
    expect(collectorSetupStep.getAttribute('data-managed-otlp-service-available')).toBe('true');
  });

  it('passes the active onboarding ID into the collector setup step', () => {
    renderPage();

    const collectorSetupStep = screen.getByTestId('otelCollectorSetupStep');
    expect(collectorSetupStep.getAttribute('data-onboarding-id')).toBe(
      mockKubernetesFlowData.onboardingId
    );
  });

  it('wires the pre-existing-data probe with the kubernetes flow id and wired-streams flag', () => {
    usePreExistingDataCheckMock.mockClear();
    renderPage(['/kubernetes?ingestion=wired']);
    expect(usePreExistingDataCheckMock).toHaveBeenCalledWith({
      flow: 'kubernetes',
      onboardingId: mockKubernetesFlowData.onboardingId,
      enabled: true,
    });
  });

  it('reports onboardingFlowType=kubernetes_otel to the window-blur hook', () => {
    useWindowBlurDataMonitoringTriggerMock.mockClear();
    renderPage();
    expect(useWindowBlurDataMonitoringTriggerMock).toHaveBeenCalledWith(
      expect.objectContaining({ onboardingFlowType: 'kubernetes_otel' })
    );
  });

  it('renders the V2 instrumentation step when metrics onboarding is enabled', () => {
    renderPage();
    expect(screen.getByTestId('otelInstrumentationStep')).toBeInTheDocument();
    expect(screen.queryByTestId('otelK8sInstrumentStep')).toBeNull();
  });

  it('omits the instrumentation step when metrics onboarding is disabled', () => {
    mockUsePricingFeature.mockReturnValue(false);
    renderPage();
    expect(screen.queryByTestId('otelInstrumentationStep')).toBeNull();
    expect(screen.queryByTestId('otelK8sInstrumentStep')).toBeNull();
  });

  it('renders an inline EmptyPrompt and drops later OTel steps when setup errors', () => {
    useKubernetesFlowMock.mockReturnValue({
      data: undefined,
      status: 'failure',
      error: buildFetchError(),
      refetch: jest.fn(),
    });
    renderPage();
    const emptyPrompt = screen.getByTestId('emptyPromptStub');
    expect(emptyPrompt.getAttribute('data-onboarding-flow-type')).toBe('kubernetes_otel');
    expect(emptyPrompt.getAttribute('data-inline')).toBe('true');
    expect(screen.getByTestId('collectionMethodSelector')).toBeInTheDocument();
    expect(screen.queryByTestId('otelInstrumentationStep')).toBeNull();
    expect(screen.queryByTestId('otelK8sVisualizeStep')).toBeNull();
  });
});
