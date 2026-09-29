/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { screen } from '@testing-library/react';
import React from 'react';
import { HostWindowsOtelPage } from '../windows_otel_page';
import { buildFetchError, renderWithHostPageProviders } from './test_helpers';

vi.mock('../../../quickstart_flows/otel_logs/steps', () => {
  const mocked = {
    OtelLogsInstallStep: ({ os }: { os: string }) => (
      <div data-test-subj="otelInstallStep" data-os={os} />
    ),
    OtelLogsStartStep: () => <div data-test-subj="otelStartStep" />,
    OtelLogsVisualizeStep: () => <div data-test-subj="otelVisualizeStep" />,
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

vi.mock('../../../../hooks/use_fetcher', () => {
  const mocked = {
    useFetcher: vi.fn().mockReturnValue({
      data: undefined,
      status: 'loading',
      refetch: vi.fn(),
    }),
    FETCH_STATUS: {
      LOADING: 'loading',
      SUCCESS: 'success',
      FAILURE: 'failure',
      NOT_INITIATED: 'not_initiated',
    },
  };
  return { ...mocked, default: mocked };
});

const { useFetcher: useFetcherMock } = await vi.importMock('../../../../hooks/use_fetcher');

vi.mock('../../../quickstart_flows/shared/use_pre_existing_data_check', () => {
  const mocked = {
    usePreExistingDataCheck: vi.fn().mockReturnValue(false),
  };
  return { ...mocked, default: mocked };
});
vi.mock('../../../quickstart_flows/shared/use_window_blur_data_monitoring_trigger', () => {
  const mocked = {
    useWindowBlurDataMonitoringTrigger: vi.fn().mockReturnValue(false),
  };
  return { ...mocked, default: mocked };
});
vi.mock('../../../quickstart_flows/shared/use_time_window_data_detection', () => {
  const mocked = {
    useTimeWindowDataDetection: vi.fn().mockReturnValue({
      hasData: false,
      hasPreExistingData: false,
      isTroubleshootingVisible: false,
    }),
  };
  return { ...mocked, default: mocked };
});

const { usePreExistingDataCheck: usePreExistingDataCheckMock } = await vi.importMock(
  '../../../quickstart_flows/shared/use_pre_existing_data_check'
);
const { useWindowBlurDataMonitoringTrigger: useWindowBlurDataMonitoringTriggerMock } =
  await vi.importMock('../../../quickstart_flows/shared/use_window_blur_data_monitoring_trigger');
const { useTimeWindowDataDetection: useTimeWindowDataDetectionMock } = await vi.importMock(
  '../../../quickstart_flows/shared/use_time_window_data_detection'
);

vi.mock('../../../shared/use_flow_breadcrumbs', () => {
  const mocked = {
    useFlowBreadcrumb: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../shared/use_managed_otlp_service_availability', () => {
  const mocked = {
    useManagedOtlpServiceAvailability: () => false,
  };
  return { ...mocked, default: mocked };
});

const renderWindowsOtelPage = (initialEntries: string[] = ['/host/windows']) =>
  renderWithHostPageProviders(<HostWindowsOtelPage />, { initialEntries });

describe('HostWindowsOtelPage', () => {
  it('renders the Windows layout chrome', () => {
    renderWindowsOtelPage();
    expect(screen.getByTestId('observabilityOnboardingHostLayout-windows')).toBeInTheDocument();
  });

  it('does not render the collection method selector', () => {
    renderWindowsOtelPage();
    expect(screen.queryByTestId('collectionMethodSelector')).toBeNull();
  });

  it('renders the OTel install step', () => {
    renderWindowsOtelPage();
    expect(screen.getByTestId('otelInstallStep')).toBeInTheDocument();
  });

  it('wires the pre-existing-data probe with the otel_host flow id', () => {
    usePreExistingDataCheckMock.mockClear();
    renderWindowsOtelPage();
    expect(usePreExistingDataCheckMock).toHaveBeenCalledWith({ flow: 'otel_host' });
  });

  it('reports onboardingFlowType=otel_logs to the window-blur and time-window detection hooks', () => {
    useWindowBlurDataMonitoringTriggerMock.mockClear();
    useTimeWindowDataDetectionMock.mockClear();
    renderWindowsOtelPage();
    expect(useWindowBlurDataMonitoringTriggerMock).toHaveBeenCalledWith(
      expect.objectContaining({ onboardingFlowType: 'otel_logs' })
    );
    expect(useTimeWindowDataDetectionMock).toHaveBeenCalledWith(
      expect.objectContaining({ flowType: 'otel_logs' })
    );
  });

  it('pins the windows osType filter to the has-data probe so cross-OS ingest cannot complete the wrong session', () => {
    useTimeWindowDataDetectionMock.mockClear();
    renderWindowsOtelPage();
    expect(useTimeWindowDataDetectionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        extraQueryParams: { osType: 'windows' },
        keepExtraParamsOnFallback: true,
      })
    );
  });

  it('renders an inline EmptyPrompt and drops the start + visualize steps when setup errors', () => {
    const previous = useFetcherMock.getMockImplementation();
    useFetcherMock.mockReturnValue({
      data: undefined,
      status: 'failure',
      error: buildFetchError(),
      refetch: vi.fn(),
    });
    try {
      renderWindowsOtelPage();
      const emptyPrompt = screen.getByTestId('emptyPromptStub');
      expect(emptyPrompt.getAttribute('data-onboarding-flow-type')).toBe('otel_logs');
      expect(emptyPrompt.getAttribute('data-inline')).toBe('true');
      expect(screen.queryByTestId('otelStartStep')).toBeNull();
      expect(screen.queryByTestId('otelVisualizeStep')).toBeNull();
    } finally {
      useFetcherMock.mockReset();
      if (previous) {
        useFetcherMock.mockImplementation(previous);
      } else {
        useFetcherMock.mockReturnValue({
          data: undefined,
          status: 'loading',
          refetch: vi.fn(),
        });
      }
    }
  });

  it('does not render the collection method step title', () => {
    renderWindowsOtelPage();
    expect(screen.queryByText('Choose how to collect host telemetry')).toBeNull();
  });
});
