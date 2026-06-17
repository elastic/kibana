/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { pricingServiceMock } from '@kbn/core-pricing-browser-mocks';
import { noop } from 'lodash';
import type { ReactNode } from 'react';
import React from 'react';
import { Observable } from 'rxjs';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';

import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import { themeServiceMock } from '@kbn/core/public/mocks';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import type { ConfigSchema, ObservabilityPublicPluginsStart } from '../plugin';
import { createObservabilityRuleTypeRegistryMock } from '../rules/observability_rule_type_registry_mock';
import { renderApp } from './application';
import { mockService } from '@kbn/observability-ai-assistant-plugin/public/mock';
import { createTelemetryClientMock } from '../services/telemetry/telemetry_client.mock';
import { createMemoryHistory } from 'history';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { useAppRoutes } from '../routes/routes';

describe('renderApp', () => {
  const originalConsole = global.console;

  beforeAll(() => {
    // mocks console to avoid polluting the test output
    global.console = { error: jest.fn() } as unknown as typeof console;
  });

  afterAll(() => {
    global.console = originalConsole;
  });

  let pricingStart: ReturnType<typeof pricingServiceMock.createStartContract>;

  const mockSearchSessionClear = jest.fn();

  const plugins = {
    data: {
      query: {
        timefilter: {
          timefilter: {
            setTime: jest.fn(),
            getTime: jest.fn().mockReturnValue({}),
            getTimeDefaults: jest.fn().mockReturnValue({}),
            getRefreshInterval: jest.fn().mockReturnValue({}),
            getRefreshIntervalDefaults: jest.fn().mockReturnValue({}),
          },
        },
      },
      search: {
        session: {
          clear: mockSearchSessionClear,
        },
      },
    },
    usageCollection: { reportUiCounter: noop },
    observabilityAIAssistant: { service: mockService },
  } as unknown as ObservabilityPublicPluginsStart;

  const core = {
    application: { currentAppId$: new Observable(), navigateToUrl: noop },
    chrome: {
      docTitle: { change: noop },
      setBreadcrumbs: noop,
    },
    i18n: { Context: ({ children }: { children: React.ReactNode }) => children },
    uiSettings: { get: () => false },
    http: { basePath: { prepend: (path: string) => path } },
    theme: themeServiceMock.createStartContract(),
  } as unknown as CoreStart;

  const params = {
    element: window.document.createElement('div'),
    history: createMemoryHistory(),
    setHeaderActionMenu: noop,
    theme$: themeServiceMock.createTheme$(),
  } as unknown as AppMountParameters;

  const config: ConfigSchema = {
    unsafe: {
      alertDetails: {
        uptime: { enabled: false },
      },
    },
    managedOtlpServiceUrl: '',
  };

  beforeEach(() => {
    pricingStart = pricingServiceMock.createStartContract();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders', async () => {
    expect(() => {
      const unmount = renderApp({
        core,
        config,
        plugins,
        appMountParameters: params,
        observabilityRuleTypeRegistry: createObservabilityRuleTypeRegistryMock(),
        ObservabilityPageTemplate: KibanaPageTemplate,
        usageCollection: {
          components: {
            ApplicationUsageTrackingProvider: (props) => null,
          },
          reportUiCounter: jest.fn(),
        },
        kibanaVersion: '8.8.0',
        telemetryClient: createTelemetryClientMock(),
      });
      unmount();
    }).not.toThrowError();
  });

  it('should clear search sessions when unmounting', () => {
    const unmount = renderApp({
      core,
      config,
      plugins,
      appMountParameters: params,
      observabilityRuleTypeRegistry: createObservabilityRuleTypeRegistryMock(),
      ObservabilityPageTemplate: KibanaPageTemplate,
      usageCollection: {
        components: {
          ApplicationUsageTrackingProvider: (props) => null,
        },
        reportUiCounter: jest.fn(),
      },
      kibanaVersion: '8.8.0',
      telemetryClient: createTelemetryClientMock(),
    });
    unmount();

    expect(mockSearchSessionClear).toBeCalled();
  });

  function AppWrapper({ children }: { children?: ReactNode }) {
    return (
      <KibanaRenderContextProvider {...core}>
        <KibanaContextProvider services={{ pricing: pricingStart }}>
          {children}
        </KibanaContextProvider>
      </KibanaRenderContextProvider>
    );
  }

  it('should adjust routes for complete', () => {
    // Mock feature availability
    pricingStart.isFeatureAvailable.mockImplementation((featureId) => {
      if (featureId === 'observability:complete_overview') {
        return true;
      }
      return true;
    });

    const { result } = renderHook(() => useAppRoutes(), { wrapper: AppWrapper });
    expect(result.current).not.toBeNull();
    // Optionally, check for expected keys:
    expect(Object.keys(result.current)).toContain('/overview');
    expect(Object.keys(result.current)).toContain('/cases');
  });

  it('should adjust routes for essentials', () => {
    // Mock feature availability
    pricingStart.isFeatureAvailable.mockImplementation((featureId) => {
      if (featureId === 'observability:complete_overview') {
        return false;
      }
      return true;
    });

    const { result } = renderHook(useAppRoutes, { wrapper: AppWrapper });
    expect(result.current).not.toBeNull();
    expect(Object.keys(result.current)).toContain('/landing');
    expect(Object.keys(result.current)).not.toContain('/cases');
  });
});
