/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen } from '@testing-library/react';
import React from 'react';
import { HostMacosAutoDetectPage } from '../macos_auto_detect_page';
import { HostMacosOtelPage } from '../macos_otel_page';
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

jest.mock('../../../quickstart_flows/auto_detect/steps', () => ({
  AutoDetectInstallStep: () => <div data-test-subj="autoDetectInstallStep" />,
  AutoDetectVisualizeStep: () => <div data-test-subj="autoDetectVisualizeStep" />,
}));

jest.mock('../../../quickstart_flows/auto_detect/use_onboarding_flow', () => ({
  useOnboardingFlow: () => ({
    status: 'notStarted',
    data: undefined,
    error: undefined,
    refetch: jest.fn(),
    installedIntegrations: [],
  }),
  DASHBOARDS: {},
}));

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

const renderMacosOtelPage = (initialEntries: string[] = ['/host/macos']) =>
  renderWithHostPageProviders(<HostMacosOtelPage />, { initialEntries });

const renderMacosAutoDetectPage = (initialEntries: string[] = ['/host/macos/auto-detect']) =>
  renderWithHostPageProviders(<HostMacosAutoDetectPage />, { initialEntries });

describe('HostMacosOtelPage', () => {
  it('renders the macOS layout chrome', () => {
    renderMacosOtelPage();
    expect(screen.getByTestId('observabilityOnboardingHostLayout-mac')).toBeInTheDocument();
  });

  it('renders the collection method selector with OTel selected', () => {
    renderMacosOtelPage();
    expect(
      screen.getByTestId('collectionMethodSelectorCard-otel').getAttribute('data-selected')
    ).toBe('true');
    expect(
      screen.getByTestId('collectionMethodSelectorCard-auto-detect').getAttribute('data-selected')
    ).toBe('false');
  });

  it('renders the OTel install step', () => {
    renderMacosOtelPage();
    expect(screen.getByTestId('otelInstallStep')).toBeInTheDocument();
  });

  it('uses wired ingestion mode when the URL says so', () => {
    renderMacosOtelPage(['/host/macos?ingestion=wired']);
    expect(screen.getByTestId('otelInstallStep').getAttribute('data-ingestion-mode')).toBe('wired');
  });

  it('wires the pre-existing-data probe with the otel_host flow id', () => {
    usePreExistingDataCheckMock.mockClear();
    renderMacosOtelPage();
    expect(usePreExistingDataCheckMock).toHaveBeenCalledWith({ flow: 'otel_host' });
  });

  it('reports onboardingFlowType=otel_logs to the window-blur and time-window detection hooks', () => {
    useWindowBlurDataMonitoringTriggerMock.mockClear();
    useTimeWindowDataDetectionMock.mockClear();
    renderMacosOtelPage();
    expect(useWindowBlurDataMonitoringTriggerMock).toHaveBeenCalledWith(
      expect.objectContaining({ onboardingFlowType: 'otel_logs' })
    );
    expect(useTimeWindowDataDetectionMock).toHaveBeenCalledWith(
      expect.objectContaining({ flowType: 'otel_logs' })
    );
  });

  it('pins the darwin osType filter to the has-data probe so cross-OS ingest cannot complete the wrong session', () => {
    useTimeWindowDataDetectionMock.mockClear();
    renderMacosOtelPage();
    expect(useTimeWindowDataDetectionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        extraQueryParams: { osType: 'darwin' },
        keepExtraParamsOnFallback: true,
      })
    );
  });

  it('drops the osType pin under wired streams since the streams pipeline does not project host.os.type onto docs', () => {
    useTimeWindowDataDetectionMock.mockClear();
    renderMacosOtelPage(['/host/macos?ingestion=wired']);
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
      renderMacosOtelPage();
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

describe('HostMacosAutoDetectPage', () => {
  it('renders the macOS layout chrome', () => {
    renderMacosAutoDetectPage();
    expect(screen.getByTestId('observabilityOnboardingHostLayout-mac')).toBeInTheDocument();
  });

  it('marks Elastic Agent as the selected collection method', () => {
    renderMacosAutoDetectPage();
    expect(
      screen.getByTestId('collectionMethodSelectorCard-auto-detect').getAttribute('data-selected')
    ).toBe('true');
    expect(
      screen.getByTestId('collectionMethodSelectorCard-otel').getAttribute('data-selected')
    ).toBe('false');
  });

  it('renders the auto-detect install step', () => {
    renderMacosAutoDetectPage();
    expect(screen.getByTestId('autoDetectInstallStep')).toBeInTheDocument();
  });
});
