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
import { HostLinuxAutoDetectPage } from '../linux_auto_detect_page';

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

// useFlowBreadcrumb delegates to observability-shared useBreadcrumbs, which calls useUiSetting.
// coreMock does not provide UI settings, so stub the hook.
jest.mock('../../../shared/use_flow_breadcrumbs', () => ({
  useFlowBreadcrumb: jest.fn(),
}));

// Avoid async streams wiring and extra Kibana deps in jsdom; install step only forwards props.
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

// usePerformanceContext throws when PerformanceContext is absent (see @kbn/ebt-tools).
jest.mock('@kbn/ebt-tools', () => ({
  usePerformanceContext: () => ({
    onPageReady: jest.fn(),
    onPageRefreshStart: jest.fn(),
  }),
}));

const renderPage = () => {
  const coreStart = coreMock.createStart();
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
        <MemoryRouter initialEntries={['/host/linux/auto-detect']}>
          <CompatRouter>
            <HostLinuxAutoDetectPage />
          </CompatRouter>
        </MemoryRouter>
      </KibanaContextProvider>
    </I18nProvider>
  );
};

describe('HostLinuxAutoDetectPage', () => {
  it('renders the Linux layout chrome', () => {
    renderPage();
    expect(screen.getByTestId('observabilityOnboardingHostV2Layout-linux')).toBeInTheDocument();
  });

  it('marks Elastic Agent as the selected approach', () => {
    renderPage();
    expect(
      screen.getByTestId('approachSelectorCard-auto-detect').getAttribute('data-selected')
    ).toBe('true');
    expect(screen.getByTestId('approachSelectorCard-otel').getAttribute('data-selected')).toBe(
      'false'
    );
  });

  it('renders the auto-detect install step', () => {
    renderPage();
    expect(screen.getByTestId('autoDetectInstallStep')).toBeInTheDocument();
  });
});
