/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppHeaderMenu } from '@kbn/app-header';
import { render, renderHook } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { INFRA_EBT_ACTIONS, INFRA_EBT_DETAILS } from '../../../common/ebt_constants';
import { useMetricsAppHeaderMenu } from './use_metrics_app_header_menu';

interface MenuNode {
  id: string;
  ebt?: { action: string; detail?: string };
  items?: MenuNode[];
}

function collectEbt(
  items: AppHeaderMenu['items'] | MenuNode[] | undefined
): Array<{ id: string; action: string; detail?: string }> {
  const collected: Array<{ id: string; action: string; detail?: string }> = [];

  for (const item of items ?? []) {
    if (item.ebt) {
      collected.push({
        id: item.id,
        action: item.ebt.action,
        ...(item.ebt.detail !== undefined ? { detail: item.ebt.detail } : {}),
      });
    }

    if ('items' in item && item.items) {
      collected.push(...collectEbt(item.items));
    }
  }

  return collected;
}

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

jest.mock('@kbn/observability-shared-plugin/public', () => ({
  useLinkProps: () => ({ href: '/app/metrics/settings' }),
  useInspectorContext: () => ({ inspectorAdapters: { requests: {} } }),
}));

const mockAnomalyFlyoutCapture: {
  hideJobType?: boolean;
  hideSelectGroup?: boolean;
} = {};

jest.mock('../../../components/ml/anomaly_detection/anomaly_detection_flyout', () => ({
  AnomalyDetectionFlyout: (props: { hideJobType?: boolean; hideSelectGroup?: boolean }) => {
    mockAnomalyFlyoutCapture.hideJobType = props.hideJobType;
    mockAnomalyFlyoutCapture.hideSelectGroup = props.hideSelectGroup;
    return null;
  },
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
    delete mockAnomalyFlyoutCapture.hideJobType;
    delete mockAnomalyFlyoutCapture.hideSelectGroup;
  });

  it('builds Inventory actions with anomaly detection, alerts, overflow settings, and add data', () => {
    const { result } = renderMenuHook('/inventory');
    const { menu } = result.current;

    expect(findItem(menu.items, 'anomalyDetection')).toEqual(
      expect.objectContaining({
        id: 'anomalyDetection',
        testId: 'openAnomalyFlyoutButton',
        ebt: { action: INFRA_EBT_ACTIONS.VIEW_ANOMALY_DETECTION },
      })
    );
    expect(findItem(menu.items, 'alerts')).toEqual(
      expect.objectContaining({
        id: 'alerts',
        testId: 'infrastructure-alerts-and-rules',
        ebt: { action: INFRA_EBT_ACTIONS.OPEN_ALERTS_MENU },
      })
    );
    expect(findItem(menu.items, 'settings')).toEqual(
      expect.objectContaining({
        id: 'settings',
        href: '/app/metrics/settings',
        overflow: true,
        ebt: { action: INFRA_EBT_ACTIONS.VIEW_SETTINGS },
      })
    );
    expect(findItem(menu.items, 'inspect')).toBeUndefined();
    expect(menu.primaryActionItem).toEqual(
      expect.objectContaining({
        id: 'addData',
        href: '/app/observabilityOnboarding',
        ebt: {
          action: INFRA_EBT_ACTIONS.ADD_DATA,
          detail: INFRA_EBT_DETAILS.ADD_DATA_INFRA,
        },
      })
    );
    expect(mockGetRedirectUrl).toHaveBeenCalledWith({ category: undefined });
  });

  it('omits the Settings overflow item on the Settings page', () => {
    const settings = renderMenuHook('/settings');
    expect(findItem(settings.result.current.menu.items, 'settings')).toBeUndefined();
    expect(findItem(settings.result.current.menu.items, 'alerts')).toBeDefined();
  });

  it('omits anomaly detection on Explorer and uses host onboarding on Hosts', () => {
    const explorer = renderMenuHook('/explorer');
    expect(findItem(explorer.result.current.menu.items, 'anomalyDetection')).toBeUndefined();
    expect(findItem(explorer.result.current.menu.items, 'alerts')).toBeDefined();

    mockGetRedirectUrl.mockClear();
    renderMenuHook('/hosts');
    expect(mockGetRedirectUrl).toHaveBeenCalledWith({ category: 'host' });
  });

  it('omits anomaly detection when the ML topbar is hidden', () => {
    mockMlVisibility.isTopbarMenuVisible = false;
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
        ebt: { action: INFRA_EBT_ACTIONS.OPEN_INSPECTOR },
      })
    );
    expect(inspect && 'run' in inspect && typeof inspect.run === 'function').toBe(true);
    if (inspect && 'run' in inspect && inspect.run) {
      inspect.run();
    }
    expect(mockInspectorOpen).toHaveBeenCalled();
  });

  it('shows anomaly job type and group pickers only on Inventory', () => {
    render(renderMenuHook('/inventory').result.current.flyouts);
    expect(mockAnomalyFlyoutCapture).toEqual({
      hideJobType: false,
      hideSelectGroup: false,
    });

    render(renderMenuHook('/hosts').result.current.flyouts);
    expect(mockAnomalyFlyoutCapture).toEqual({
      hideJobType: true,
      hideSelectGroup: true,
    });

    render(renderMenuHook('/detail/host/web-01').result.current.flyouts);
    expect(mockAnomalyFlyoutCapture).toEqual({
      hideJobType: true,
      hideSelectGroup: true,
    });
  });

  it('sets ebt.action on every Inventory menu item and Add data detail', () => {
    mockUiSettingsGet.mockReturnValue(true);
    const { result } = renderMenuHook('/inventory');
    const { menu } = result.current;
    const collected = collectEbt(menu.items);

    if (menu.primaryActionItem?.ebt) {
      collected.push({
        id: menu.primaryActionItem.id,
        action: menu.primaryActionItem.ebt.action,
        ...(menu.primaryActionItem.ebt.detail !== undefined
          ? { detail: menu.primaryActionItem.ebt.detail }
          : {}),
      });
    }

    expect(collected).toEqual([
      { id: 'anomalyDetection', action: INFRA_EBT_ACTIONS.VIEW_ANOMALY_DETECTION },
      { id: 'alerts', action: INFRA_EBT_ACTIONS.OPEN_ALERTS_MENU },
      { id: 'infrastructureRules', action: INFRA_EBT_ACTIONS.OPEN_INFRASTRUCTURE_RULES_MENU },
      { id: 'createInventoryRule', action: INFRA_EBT_ACTIONS.CREATE_INVENTORY_RULE },
      { id: 'metricsRules', action: INFRA_EBT_ACTIONS.OPEN_METRICS_RULES_MENU },
      { id: 'createThresholdRule', action: INFRA_EBT_ACTIONS.CREATE_METRIC_THRESHOLD_RULE },
      { id: 'createCustomThresholdRule', action: INFRA_EBT_ACTIONS.CREATE_CUSTOM_THRESHOLD_RULE },
      { id: 'manageRules', action: INFRA_EBT_ACTIONS.MANAGE_RULES },
      { id: 'settings', action: INFRA_EBT_ACTIONS.VIEW_SETTINGS },
      { id: 'inspect', action: INFRA_EBT_ACTIONS.OPEN_INSPECTOR },
      {
        id: 'addData',
        action: INFRA_EBT_ACTIONS.ADD_DATA,
        detail: INFRA_EBT_DETAILS.ADD_DATA_INFRA,
      },
    ]);
  });

  it('sets Add data ebt.detail to host on Hosts', () => {
    const { result } = renderMenuHook('/hosts');

    expect(result.current.menu.primaryActionItem?.ebt).toEqual({
      action: INFRA_EBT_ACTIONS.ADD_DATA,
      detail: INFRA_EBT_DETAILS.ADD_DATA_HOST,
    });
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
