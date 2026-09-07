/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen } from '@testing-library/react';
import React from 'react';
import { HostLinuxOtelPage } from '../linux_otel_page';
import { buildFetchError, renderWithHostPageProviders } from './test_helpers';

jest.mock('../../../quickstart_flows/otel_logs/steps', () => ({
  OtelLogsInstallStep: ({ os }: { os: string }) => (
    <div data-test-subj="otelInstallStep" data-os={os} />
  ),
  OtelLogsStartStep: () => <div data-test-subj="otelStartStep" />,
  OtelLogsVisualizeStep: ({
    isMonitoringStepActive,
    hasData,
    hasPreExistingData,
  }: {
    isMonitoringStepActive: boolean;
    hasData: boolean;
    hasPreExistingData: boolean;
  }) => (
    <div
      data-test-subj="otelVisualizeStep"
      data-monitoring-active={isMonitoringStepActive ? 'true' : 'false'}
      data-has-data={hasData ? 'true' : 'false'}
      data-has-pre-existing-data={hasPreExistingData ? 'true' : 'false'}
    />
  ),
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

jest.mock('../../../shared/use_flow_breadcrumbs', () => ({
  useFlowBreadcrumb: jest.fn(),
}));

jest.mock('../../../shared/use_managed_otlp_service_availability', () => ({
  useManagedOtlpServiceAvailability: () => false,
}));

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

const renderPage = (initialEntries: string[] = ['/host/linux']) =>
  renderWithHostPageProviders(<HostLinuxOtelPage />, { initialEntries });

describe('HostLinuxOtelPage', () => {
  it('renders the Linux layout chrome', () => {
    renderPage();
    expect(screen.getByTestId('observabilityOnboardingHostLayout-linux')).toBeInTheDocument();
  });

  it('renders the collection method selector with OTel selected', () => {
    renderPage();
    expect(
      screen.getByTestId('collectionMethodSelectorCard-otel').getAttribute('data-selected')
    ).toBe('true');
    expect(
      screen.getByTestId('collectionMethodSelectorCard-auto-detect').getAttribute('data-selected')
    ).toBe('false');
  });

  it('renders the OTel install step', () => {
    renderPage();
    expect(screen.getByTestId('otelInstallStep')).toBeInTheDocument();
  });

  it('preserves arbitrary search params in the Return link href', () => {
    renderPage(['/host/linux?foo=bar']);
    const returnLink = screen.getByTestId('observabilityOnboardingHostReturn') as HTMLAnchorElement;
    expect(returnLink.getAttribute('href')).toContain('foo=bar');
  });

  it('wires the pre-existing-data probe with the otel_host flow id', () => {
    usePreExistingDataCheckMock.mockClear();
    renderPage();
    expect(usePreExistingDataCheckMock).toHaveBeenCalledWith({ flow: 'otel_host' });
  });

  it('reports onboardingFlowType=otel_logs to the window-blur and time-window detection hooks', () => {
    useWindowBlurDataMonitoringTriggerMock.mockClear();
    useTimeWindowDataDetectionMock.mockClear();
    renderPage();
    expect(useWindowBlurDataMonitoringTriggerMock).toHaveBeenCalledWith(
      expect.objectContaining({ onboardingFlowType: 'otel_logs' })
    );
    expect(useTimeWindowDataDetectionMock).toHaveBeenCalledWith(
      expect.objectContaining({ flowType: 'otel_logs' })
    );
  });

  it('pins the linux osType filter to the has-data probe so cross-OS ingest cannot complete the wrong session', () => {
    useTimeWindowDataDetectionMock.mockClear();
    renderPage();
    expect(useTimeWindowDataDetectionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        extraQueryParams: { osType: 'linux' },
        keepExtraParamsOnFallback: true,
      })
    );
  });

  it('keeps the linux osType pin even for a stale wired ingestion URL, since the param is no longer read', () => {
    useTimeWindowDataDetectionMock.mockClear();
    renderPage(['/host/linux?ingestion=wired']);
    expect(useTimeWindowDataDetectionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        extraQueryParams: { osType: 'linux' },
        keepExtraParamsOnFallback: true,
      })
    );
  });

  it('activates monitoring on pre-existing data alone, while keeping install/start steps rendered', () => {
    usePreExistingDataCheckMock.mockReturnValue(true);
    useWindowBlurDataMonitoringTriggerMock.mockReturnValue(false);
    try {
      renderPage();
      const visualizeStep = screen.getByTestId('otelVisualizeStep');
      expect(visualizeStep.getAttribute('data-monitoring-active')).toBe('true');
      expect(screen.getByTestId('otelInstallStep')).toBeInTheDocument();
      expect(screen.getByTestId('otelStartStep')).toBeInTheDocument();
    } finally {
      usePreExistingDataCheckMock.mockReturnValue(false);
      useWindowBlurDataMonitoringTriggerMock.mockReturnValue(false);
    }
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
      renderPage();
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
});
