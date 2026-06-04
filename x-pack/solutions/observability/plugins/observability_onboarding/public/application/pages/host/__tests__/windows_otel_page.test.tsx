/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen } from '@testing-library/react';
import React from 'react';
import { HostWindowsOtelPage } from '../windows_otel_page';
import { buildFetchError, renderWithHostPageProviders } from './test_helpers';

jest.mock('../../../quickstart_flows/otel_logs/steps', () => ({
  OtelLogsInstallStep: ({ os, ingestionMode }: { os: string; ingestionMode: string }) => (
    <div data-test-subj="otelInstallStep" data-os={os} data-ingestion-mode={ingestionMode} />
  ),
  OtelLogsStartStep: () => <div data-test-subj="otelStartStep" />,
  OtelLogsVisualizeStep: () => <div data-test-subj="otelVisualizeStep" />,
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

jest.mock('../../../../hooks/use_fetcher', () => ({
  useFetcher: jest.fn().mockReturnValue({
    data: undefined,
    status: 'loading',
    refetch: jest.fn(),
  }),
  FETCH_STATUS: {
    LOADING: 'loading',
    SUCCESS: 'success',
    FAILURE: 'failure',
    NOT_INITIATED: 'not_initiated',
  },
}));

const { useFetcher: useFetcherMock } = jest.requireMock('../../../../hooks/use_fetcher');

jest.mock('../../../quickstart_flows/shared/use_pre_existing_data_check', () => ({
  usePreExistingDataCheck: jest.fn().mockReturnValue(false),
}));
jest.mock('../../../quickstart_flows/shared/use_window_blur_data_monitoring_trigger', () => ({
  useWindowBlurDataMonitoringTrigger: jest.fn().mockReturnValue(false),
}));
jest.mock('../../../quickstart_flows/shared/use_time_window_data_detection', () => ({
  useTimeWindowDataDetection: jest.fn().mockReturnValue({
    hasData: false,
    hasPreExistingData: false,
    isTroubleshootingVisible: false,
  }),
}));

const { usePreExistingDataCheck: usePreExistingDataCheckMock } = jest.requireMock(
  '../../../quickstart_flows/shared/use_pre_existing_data_check'
);
const { useWindowBlurDataMonitoringTrigger: useWindowBlurDataMonitoringTriggerMock } =
  jest.requireMock('../../../quickstart_flows/shared/use_window_blur_data_monitoring_trigger');
const { useTimeWindowDataDetection: useTimeWindowDataDetectionMock } = jest.requireMock(
  '../../../quickstart_flows/shared/use_time_window_data_detection'
);

jest.mock('../../../shared/use_flow_breadcrumbs', () => ({
  useFlowBreadcrumb: jest.fn(),
}));

jest.mock('../../../shared/use_managed_otlp_service_availability', () => ({
  useManagedOtlpServiceAvailability: () => false,
}));

jest.mock('../../../../hooks/use_wired_streams_status', () => ({
  useWiredStreamsStatus: () => ({
    isEnabled: false,
    isLoading: false,
    isEnabling: false,
    error: null,
    enableWiredStreams: jest.fn(),
    refetch: jest.fn(),
  }),
}));

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

  it('uses wired ingestion mode when the URL says so', () => {
    renderWindowsOtelPage(['/host/windows?ingestion=wired']);
    expect(screen.getByTestId('otelInstallStep').getAttribute('data-ingestion-mode')).toBe('wired');
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

  it('drops the osType pin under wired streams since the streams pipeline does not project host.os.type onto docs', () => {
    useTimeWindowDataDetectionMock.mockClear();
    renderWindowsOtelPage(['/host/windows?ingestion=wired']);
    expect(useTimeWindowDataDetectionMock).toHaveBeenCalledWith(
      expect.objectContaining({ extraQueryParams: undefined })
    );
  });

  it('renders an inline EmptyPrompt and drops the start + visualize steps when setup errors', () => {
    const previous = useFetcherMock.getMockImplementation();
    useFetcherMock.mockReturnValue({
      data: undefined,
      status: 'failure',
      error: buildFetchError(),
      refetch: jest.fn(),
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
          refetch: jest.fn(),
        });
      }
    }
  });

  it('does not render the collection method step title', () => {
    renderWindowsOtelPage();
    expect(screen.queryByText('Choose how to collect host telemetry')).toBeNull();
  });
});
