/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { screen } from '@testing-library/react';
import React from 'react';
import { HostMacosAutoDetectPage } from '../macos_auto_detect_page';
import { HostMacosOtelPage } from '../macos_otel_page';
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

vi.mock('../../../quickstart_flows/auto_detect/steps', () => {
  const mocked = {
    AutoDetectInstallStep: () => <div data-test-subj="autoDetectInstallStep" />,
    AutoDetectVisualizeStep: () => <div data-test-subj="autoDetectVisualizeStep" />,
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../quickstart_flows/auto_detect/use_onboarding_flow', () => {
  const mocked = {
    useOnboardingFlow: () => ({
      status: 'notStarted',
      data: undefined,
      error: undefined,
      refetch: vi.fn(),
      installedIntegrations: [],
    }),
    DASHBOARDS: {},
  };
  return { ...mocked, default: mocked };
});

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

  it('keeps the darwin osType pin even for a stale wired ingestion URL, since the param is no longer read', () => {
    useTimeWindowDataDetectionMock.mockClear();
    renderMacosOtelPage(['/host/macos?ingestion=wired']);
    expect(useTimeWindowDataDetectionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        extraQueryParams: { osType: 'darwin' },
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
          refetch: vi.fn(),
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
