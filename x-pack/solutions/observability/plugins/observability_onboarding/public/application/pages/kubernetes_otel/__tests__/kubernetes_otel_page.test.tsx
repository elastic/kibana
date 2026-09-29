/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { KubernetesOtelPage } from '../kubernetes_otel_page';
import { buildFetchError, renderWithHostPageProviders } from '../../host/__tests__/test_helpers';

interface MockOtelCollectorSetupStepProps {
  isManagedOtlpServiceAvailable: boolean;
  onboardingId?: string;
  selectedCollectorMethod: string;
  onCollectorMethodChange: (method: string) => void;
}

const mockOtelCollectorSetupStep = vi.fn(
  ({
    isManagedOtlpServiceAvailable,
    onboardingId,
    selectedCollectorMethod,
    onCollectorMethodChange,
  }: MockOtelCollectorSetupStepProps) => (
    <div data-test-subj="otelCollectorSetupStep">
      <span data-test-subj="selectedCollectorMethod">{selectedCollectorMethod}</span>
      <span data-test-subj="managedOtlpServiceAvailable">
        {String(isManagedOtlpServiceAvailable)}
      </span>
      <span data-test-subj="collectorOnboardingId">{onboardingId}</span>
      <button
        type="button"
        data-test-subj="selectExistingCollector"
        onClick={() => onCollectorMethodChange('existing_collector')}
      />
    </div>
  )
);

vi.mock('../otel_collector_setup_step', () => {
  const mocked = {
    OtelCollectorSetupStep: (props: MockOtelCollectorSetupStepProps) =>
      mockOtelCollectorSetupStep(props),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../otel_instrumentation_step', () => {
  const mocked = {
    OtelInstrumentationStep: () => <div data-test-subj="otelInstrumentationStep" />,
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../quickstart_flows/otel_kubernetes/steps', () => {
  const mocked = {
    OtelKubernetesVisualizeStep: () => <div data-test-subj="otelK8sVisualizeStep" />,
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../quickstart_flows/shared/empty_prompt', () => {
  const mocked = {
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
  };
  return { ...mocked, default: mocked };
});

vi.mock('@kbn/ebt-tools', () => {
  const mocked = {
    usePerformanceContext: () => ({
      onPageReady: vi.fn(),
      onPageRefreshStart: vi.fn(),
    }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../quickstart_flows/kubernetes/use_kubernetes_flow', () => {
  const mocked = {
    useKubernetesFlow: vi.fn().mockReturnValue({
      data: undefined,
      status: 'loading',
      error: undefined,
      refetch: vi.fn(),
    }),
  };
  return { ...mocked, default: mocked };
});

const { useKubernetesFlow: useKubernetesFlowMock } = await vi.importMock(
  '../../../quickstart_flows/kubernetes/use_kubernetes_flow'
);

vi.mock('../../../shared/use_flow_breadcrumbs', () => {
  const mocked = {
    useFlowBreadcrumb: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

const mockUseManagedOtlpServiceAvailability = vi.fn().mockReturnValue(false);
vi.mock('../../../shared/use_managed_otlp_service_availability', () => {
  const mocked = {
    useManagedOtlpServiceAvailability: () => mockUseManagedOtlpServiceAvailability(),
  };
  return { ...mocked, default: mocked };
});

const mockUsePricingFeature = vi.fn().mockReturnValue(true);
vi.mock('../../../quickstart_flows/shared/use_pricing_feature', () => {
  const mocked = {
    usePricingFeature: (...args: unknown[]) => mockUsePricingFeature(...args),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../quickstart_flows/shared/use_window_blur_data_monitoring_trigger', () => {
  const mocked = {
    useWindowBlurDataMonitoringTrigger: vi.fn().mockReturnValue(false),
  };
  return { ...mocked, default: mocked };
});

const { useWindowBlurDataMonitoringTrigger: useWindowBlurDataMonitoringTriggerMock } =
  await vi.importMock('../../../quickstart_flows/shared/use_window_blur_data_monitoring_trigger');

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
      refetch: vi.fn(),
    });
    useWindowBlurDataMonitoringTriggerMock.mockReturnValue(false);
  });

  it('renders the Kubernetes OTel layout chrome', () => {
    renderPage();
    expect(screen.getByTestId('observabilityOnboardingKubernetesLayout-otel')).toBeInTheDocument();
  });

  it('does not render the collection method selector', () => {
    renderPage();
    expect(screen.queryByTestId('collectionMethodSelector')).toBeNull();
  });

  it('ignores the deprecated wired ingestion query param', () => {
    renderPage(['/kubernetes?ingestion=wired']);

    expect(screen.getByTestId('selectedCollectorMethod')).toHaveTextContent('edot');
  });

  it('passes managed OTLP availability into the collector setup step', () => {
    mockUseManagedOtlpServiceAvailability.mockReturnValue(true);

    renderPage();

    expect(screen.getByTestId('managedOtlpServiceAvailable')).toHaveTextContent('true');
  });

  it('passes the active onboarding ID into the collector setup step', () => {
    renderPage();

    expect(screen.getByTestId('collectorOnboardingId')).toHaveTextContent(
      mockKubernetesFlowData.onboardingId
    );
  });

  it('reports onboardingFlowType and selected collector method to the window-blur hook', async () => {
    useWindowBlurDataMonitoringTriggerMock.mockClear();
    renderPage();
    expect(useWindowBlurDataMonitoringTriggerMock).toHaveBeenCalledWith(
      expect.objectContaining({
        onboardingFlowType: 'kubernetes_otel',
        telemetryEventContext: {
          kubernetes: { selectedCollectorMethod: 'edot' },
        },
      })
    );

    await userEvent.click(screen.getByTestId('selectExistingCollector'));

    expect(useWindowBlurDataMonitoringTriggerMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        onboardingFlowType: 'kubernetes_otel',
        telemetryEventContext: {
          kubernetes: { selectedCollectorMethod: 'existing_collector' },
        },
      })
    );
  });

  it('renders the instrumentation step when metrics onboarding is enabled', () => {
    renderPage();
    expect(screen.getByTestId('otelInstrumentationStep')).toBeInTheDocument();
  });

  it('omits the instrumentation step when metrics onboarding is disabled', () => {
    mockUsePricingFeature.mockReturnValue(false);
    renderPage();
    expect(screen.queryByTestId('otelInstrumentationStep')).toBeNull();
  });

  it('renders an inline EmptyPrompt and drops later OTel steps when setup errors', () => {
    useKubernetesFlowMock.mockReturnValue({
      data: undefined,
      status: 'failure',
      error: buildFetchError(),
      refetch: vi.fn(),
    });
    renderPage();
    const emptyPrompt = screen.getByTestId('emptyPromptStub');
    expect(emptyPrompt.getAttribute('data-onboarding-flow-type')).toBe('kubernetes_otel');
    expect(emptyPrompt.getAttribute('data-inline')).toBe('true');
    expect(screen.queryByTestId('collectionMethodSelector')).toBeNull();
    expect(screen.queryByTestId('otelInstrumentationStep')).toBeNull();
    expect(screen.queryByTestId('otelK8sVisualizeStep')).toBeNull();
  });
});
