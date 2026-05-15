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
import { IS_ADD_DATA_PAGE_V2_ENABLED } from '../../../../../common/feature_flags';
import { ObservabilityOnboardingFlow } from '../../../observability_onboarding_flow';

jest.mock('../../landing', () => ({
  LandingPage: () => <div data-test-subj="landingPageStub" />,
}));

jest.mock('../linux_otel_page', () => ({
  HostLinuxOtelPage: () => <div data-test-subj="hostLinuxOtelPageStub" />,
}));

jest.mock('../linux_auto_detect_page', () => ({
  HostLinuxAutoDetectPage: () => <div data-test-subj="hostLinuxAutoDetectPageStub" />,
}));

jest.mock('../macos_otel_page', () => ({
  HostMacosOtelPage: () => <div data-test-subj="hostMacosOtelPageStub" />,
}));

jest.mock('../macos_auto_detect_page', () => ({
  HostMacosAutoDetectPage: () => <div data-test-subj="hostMacosAutoDetectPageStub" />,
}));

jest.mock('../windows_otel_page', () => ({
  HostWindowsOtelPage: () => <div data-test-subj="hostWindowsOtelPageStub" />,
}));

jest.mock('../../auto_detect', () => ({
  AutoDetectPage: () => null,
}));

jest.mock('../../kubernetes', () => ({
  KubernetesPage: () => null,
}));

jest.mock('../../otel_kubernetes', () => ({
  OtelKubernetesPage: () => null,
}));

jest.mock('../../otel_logs', () => ({
  OtelLogsPage: () => null,
}));

jest.mock('../../firehose', () => ({
  FirehosePage: () => null,
}));

jest.mock('../../otel_apm', () => ({
  OtelApmPage: () => null,
}));

jest.mock('../../cloudforwarder', () => ({
  CloudForwarderPage: () => null,
}));

jest.mock('../../../shared/use_flow_breadcrumbs', () => ({
  useFlowBreadcrumb: jest.fn(),
}));

jest.mock('../../../shared/use_managed_otlp_service_availability', () => ({
  useManagedOtlpServiceAvailability: () => false,
}));

beforeAll(() => {
  window.scrollTo = jest.fn();
});

const renderFlow = (flagEnabled: boolean, path: string) => {
  const coreStart = coreMock.createStart();
  coreStart.featureFlags.getBooleanValue.mockImplementation((id, fallback) =>
    id === IS_ADD_DATA_PAGE_V2_ENABLED ? flagEnabled : fallback
  );
  const services: ObservabilityOnboardingAppServices = {
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
  return render(
    <I18nProvider>
      <KibanaContextProvider services={services}>
        <MemoryRouter initialEntries={[path]}>
          <CompatRouter>
            <ObservabilityOnboardingFlow />
          </CompatRouter>
        </MemoryRouter>
      </KibanaContextProvider>
    </I18nProvider>
  );
};

const HOST_ROUTES: ReadonlyArray<readonly [string, string]> = [
  ['/host/linux', 'hostLinuxOtelPageStub'],
  ['/host/linux/auto-detect', 'hostLinuxAutoDetectPageStub'],
  ['/host/macos', 'hostMacosOtelPageStub'],
  ['/host/macos/auto-detect', 'hostMacosAutoDetectPageStub'],
  ['/host/windows', 'hostWindowsOtelPageStub'],
] as const;

describe('Feature-flag gate on /host/* routes', () => {
  describe.each(HOST_ROUTES)('%s', (path, pageStubTestId) => {
    it('renders the host page when the flag is on', () => {
      renderFlow(true, path);
      expect(screen.getByTestId(pageStubTestId)).toBeInTheDocument();
      expect(screen.queryByTestId('landingPageStub')).toBeNull();
    });

    it('falls back to the V1 landing page when the flag is off', () => {
      renderFlow(false, path);
      expect(screen.getByTestId('landingPageStub')).toBeInTheDocument();
      expect(screen.queryByTestId(pageStubTestId)).toBeNull();
    });
  });

  it('falls back to the V1 landing page for unmatched paths even when the flag is on', () => {
    renderFlow(true, '/some/other/unmatched/path');
    expect(screen.getByTestId('landingPageStub')).toBeInTheDocument();
    expect(screen.queryByTestId('hostLinuxOtelPageStub')).toBeNull();
  });
});
