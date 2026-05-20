/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { ObservabilityPublicStart } from '@kbn/observability-plugin/public';
import { sharePluginMock } from '@kbn/share-plugin/public/mocks';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { CompatRouter } from 'react-router-dom-v5-compat';
import type { ObservabilityOnboardingAppServices } from '../../../..';
import { HostMacosAutoDetectPage } from '../macos_auto_detect_page';
import { HostMacosOtelPage } from '../macos_otel_page';
import { buildFetchError } from './test_fixtures';

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

const buildServices = (): ObservabilityOnboardingAppServices => {
  const coreStart = coreMock.createStart();
  return {
    ...coreStart,
    share: sharePluginMock.createStartContract(),
    context: {
      isDev: false,
      isCloud: false,
      isServerless: false,
      stackVersion: '9.0.0',
    },
    config: {
      ui: { enabled: true },
      serverless: { enabled: false },
    },
    observability: {
      config: {
        unsafe: {
          alertDetails: {
            uptime: { enabled: false },
          },
        },
        managedOtlpServiceUrl: '',
      },
      observabilityRuleTypeRegistry: {
        register: jest.fn(),
        getFormatter: jest.fn(() => undefined),
        list: jest.fn(() => []),
      },
      useRulesLink: jest.fn(() => ({ href: '/' })),
    } as ObservabilityPublicStart,
  };
};

const renderMacosOtelPage = (initialEntries: string[] = ['/host/macos']) => {
  const services = buildServices();
  return render(
    <I18nProvider>
      <KibanaContextProvider services={services}>
        <MemoryRouter initialEntries={initialEntries}>
          <CompatRouter>
            <HostMacosOtelPage />
          </CompatRouter>
        </MemoryRouter>
      </KibanaContextProvider>
    </I18nProvider>
  );
};

const renderMacosAutoDetectPage = (initialEntries: string[] = ['/host/macos/auto-detect']) => {
  const services = buildServices();
  return render(
    <I18nProvider>
      <KibanaContextProvider services={services}>
        <MemoryRouter initialEntries={initialEntries}>
          <CompatRouter>
            <HostMacosAutoDetectPage />
          </CompatRouter>
        </MemoryRouter>
      </KibanaContextProvider>
    </I18nProvider>
  );
};

describe('HostMacosOtelPage', () => {
  it('renders the macOS layout chrome', () => {
    renderMacosOtelPage();
    expect(screen.getByTestId('observabilityOnboardingHostV2Layout-mac')).toBeInTheDocument();
  });

  it('renders the approach selector with OTel selected', () => {
    renderMacosOtelPage();
    expect(screen.getByTestId('approachSelectorCard-otel').getAttribute('data-selected')).toBe(
      'true'
    );
    expect(
      screen.getByTestId('approachSelectorCard-auto-detect').getAttribute('data-selected')
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

  it('passes the darwin osType filter to the has-data probe so cross-OS ingest cannot complete the wrong session', () => {
    useTimeWindowDataDetectionMock.mockClear();
    renderMacosOtelPage();
    expect(useTimeWindowDataDetectionMock).toHaveBeenCalledWith(
      expect.objectContaining({ extraQueryParams: { osType: 'darwin' } })
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
    expect(screen.getByTestId('observabilityOnboardingHostV2Layout-mac')).toBeInTheDocument();
  });

  it('marks Elastic Agent as the selected approach', () => {
    renderMacosAutoDetectPage();
    expect(
      screen.getByTestId('approachSelectorCard-auto-detect').getAttribute('data-selected')
    ).toBe('true');
    expect(screen.getByTestId('approachSelectorCard-otel').getAttribute('data-selected')).toBe(
      'false'
    );
  });

  it('renders the auto-detect install step', () => {
    renderMacosAutoDetectPage();
    expect(screen.getByTestId('autoDetectInstallStep')).toBeInTheDocument();
  });
});
