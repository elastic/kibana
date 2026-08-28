/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppHeaderMenu } from '@kbn/app-header';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { useMetricsAppHeaderMenu } from './use_metrics_app_header_menu';

const mockGetRedirectUrl = jest.fn(() => '/app/observabilityOnboarding');
const mockInspectorOpen = jest.fn();
const mockUiSettingsGet = jest.fn(() => false);

const mockFeatureFlags = {
  customThresholdAlertsEnabled: true,
  metricsExplorerEnabled: true,
  osqueryEnabled: false,
  inventoryThresholdAlertRuleEnabled: true,
  metricThresholdAlertRuleEnabled: true,
  logThresholdAlertRuleEnabled: true,
  alertsAndRulesDropdownEnabled: true,
  profilingEnabled: false,
  ruleFormV2Enabled: false,
};

const mockCapabilities = {
  infrastructure: { save: true },
};

const mockMlVisibility = {
  isTopbarMenuVisible: true,
};

const mockMetricsViewState: { metricsView: { indices?: string } | undefined } = {
  metricsView: { indices: 'metrics-*' },
};

const mockActiveSpace: { space: { id: string } | undefined } = {
  space: { id: 'default' },
};

jest.mock('../../../containers/plugin_config_context', () => ({
  usePluginConfig: () => ({
    featureFlags: mockFeatureFlags,
  }),
}));

jest.mock('../../../containers/ml/infra_ml_capabilities', () => ({
  useInfraMLCapabilitiesContext: () => mockMlVisibility,
}));

jest.mock('../../../hooks/use_kibana', () => ({
  useKibanaContextForPlugin: () => ({
    services: {
      inspector: { open: mockInspectorOpen },
      observability: {
        useRulesLink: () => ({ href: '/app/observability/alerts/rules' }),
      },
      share: {
        url: {
          locators: {
            get: () => ({ getRedirectUrl: mockGetRedirectUrl }),
          },
        },
      },
      uiSettings: { get: mockUiSettingsGet },
      application: { capabilities: mockCapabilities },
    },
  }),
}));

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: () => ({
    services: {
      uiSettings: { get: mockUiSettingsGet },
    },
  }),
}));

jest.mock('@kbn/observability-shared-plugin/public', () => ({
  useLinkProps: () => ({ href: '/app/metrics/settings' }),
  useInspectorContext: () => ({ inspectorAdapters: { requests: {} } }),
}));

jest.mock('../../../containers/metrics_source', () => ({
  useMetricsDataViewContext: () => mockMetricsViewState,
}));

jest.mock('../../../hooks/use_kibana_space', () => ({
  useActiveKibanaSpace: () => mockActiveSpace,
}));

jest.mock('../../../components/ml/anomaly_detection/anomaly_detection_flyout', () => ({
  AnomalyDetectionFlyout: () => null,
}));

jest.mock('../../../alerting/common/components/metrics_alert_dropdown', () => ({
  MetricsAlertFlyout: () => null,
}));

function renderMenuHook(pathname: string) {
  return renderHook(() => useMetricsAppHeaderMenu(), {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <MemoryRouter initialEntries={[pathname]}>{children}</MemoryRouter>
    ),
  });
}

function findItem(
  items: AppHeaderMenu['items'],
  id: string
): NonNullable<AppHeaderMenu['items']>[number] | undefined {
  return items?.find((item) => item.id === id);
}

describe('useMetricsAppHeaderMenu', () => {
  beforeEach(() => {
    mockGetRedirectUrl.mockClear();
    mockInspectorOpen.mockClear();
    mockUiSettingsGet.mockReturnValue(false);
    mockFeatureFlags.alertsAndRulesDropdownEnabled = true;
    mockFeatureFlags.inventoryThresholdAlertRuleEnabled = true;
    mockFeatureFlags.metricThresholdAlertRuleEnabled = true;
    mockFeatureFlags.customThresholdAlertsEnabled = true;
    mockCapabilities.infrastructure.save = true;
    mockMlVisibility.isTopbarMenuVisible = true;
    mockMetricsViewState.metricsView = { indices: 'metrics-*' };
    mockActiveSpace.space = { id: 'default' };
  });

  it('builds Inventory actions with anomaly detection, alerts, overflow settings, and add data', () => {
    const { result } = renderMenuHook('/inventory');
    const { menu } = result.current;

    expect(findItem(menu.items, 'anomalyDetection')).toEqual(
      expect.objectContaining({
        id: 'anomalyDetection',
        testId: 'openAnomalyFlyoutButton',
      })
    );
    expect(findItem(menu.items, 'alerts')).toEqual(
      expect.objectContaining({
        id: 'alerts',
        testId: 'infrastructure-alerts-and-rules',
        popoverTestId: 'metrics-alert-menu',
      })
    );
    expect(findItem(menu.items, 'settings')).toEqual(
      expect.objectContaining({
        id: 'settings',
        href: '/app/metrics/settings',
        overflow: true,
      })
    );
    expect(findItem(menu.items, 'inspect')).toBeUndefined();
    expect(menu.primaryActionItem).toEqual(
      expect.objectContaining({
        id: 'addData',
        href: '/app/observabilityOnboarding',
      })
    );
    expect(mockGetRedirectUrl).toHaveBeenCalledWith({ category: undefined });
  });

  it('omits anomaly detection on Explorer and uses host onboarding on Hosts', () => {
    const explorer = renderMenuHook('/explorer');
    expect(findItem(explorer.result.current.menu.items, 'anomalyDetection')).toBeUndefined();
    expect(findItem(explorer.result.current.menu.items, 'alerts')).toBeDefined();

    mockGetRedirectUrl.mockClear();
    const hosts = renderMenuHook('/hosts');
    expect(findItem(hosts.result.current.menu.items, 'anomalyDetection')).toEqual(
      expect.objectContaining({
        id: 'anomalyDetection',
        testId: 'openAnomalyFlyoutButton',
      })
    );
    expect(mockGetRedirectUrl).toHaveBeenCalledWith({ category: 'host' });
  });

  it('omits anomaly detection when the ML topbar is hidden', () => {
    mockMlVisibility.isTopbarMenuVisible = false;
    const { result } = renderMenuHook('/inventory');
    expect(findItem(result.current.menu.items, 'anomalyDetection')).toBeUndefined();
  });

  it('omits anomaly detection when the flyout cannot render', () => {
    mockMetricsViewState.metricsView = undefined;
    mockActiveSpace.space = undefined;
    const { result } = renderMenuHook('/inventory');
    expect(findItem(result.current.menu.items, 'anomalyDetection')).toBeUndefined();
  });

  it('puts Inspect in overflow when inspect ES queries is enabled', () => {
    mockUiSettingsGet.mockReturnValue(true);
    const { result } = renderMenuHook('/inventory');
    const inspect = findItem(result.current.menu.items, 'inspect');

    expect(inspect).toEqual(
      expect.objectContaining({
        id: 'inspect',
        testId: 'infraInspectHeaderLink',
        overflow: true,
      })
    );
    expect(inspect && 'run' in inspect && typeof inspect.run === 'function').toBe(true);
    if (inspect && 'run' in inspect && inspect.run) {
      inspect.run();
    }
    expect(mockInspectorOpen).toHaveBeenCalled();
  });

  it('keeps manage-rules when the user cannot create alerts', () => {
    mockCapabilities.infrastructure.save = false;
    const { result } = renderMenuHook('/inventory');
    const alerts = findItem(result.current.menu.items, 'alerts');

    expect(alerts).toBeDefined();
    if (alerts && 'items' in alerts) {
      expect(alerts.items?.map((item) => item.id)).toEqual(['manageRules']);
    }
  });
});
