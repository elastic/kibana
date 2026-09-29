/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import type { AppHeaderMenu } from '@kbn/app-header';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import {
  useSyntheticsAppHeaderMenu,
  type SyntheticsAppHeaderMenuOptions,
} from './use_synthetics_app_header_menu';

const mockInspectorOpen = vi.fn();
const mockUiSettingsGet = vi.fn(() => true);
const mockDispatch = vi.fn();
const mockMonitorList = {
  loaded: true,
  data: { absoluteTotal: 2 },
};

const mockOverviewStatus = {
  allConfigs: [{ origin: 'ui' }],
};

vi.mock('@kbn/kibana-react-plugin/public', () => {
      const mocked = {
      useKibana: () => ({
        services: {
          inspector: { open: mockInspectorOpen },
          uiSettings: { get: mockUiSettingsGet },
          observability: {
            useRulesLink: () => ({ href: '/app/observability/alerts/rules' }),
          },
          application: {
            capabilities: { uptime: { save: true } },
            getUrlForApp: () => '/app/synthetics',
          },
        },
      }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('@kbn/observability-shared-plugin/public', () => {
      const mocked = {
      useInspectorContext: () => ({ inspectorAdapters: { requests: {} } }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('@kbn/exploratory-view-plugin/public', () => {
      const mocked = {
      createExploratoryViewUrl: () => '/app/exploratory-view',
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../contexts', () => {
      const mocked = {
      useSyntheticsSettingsContext: () => ({ basePath: '', isDev: false }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../hooks', () => {
      const mocked = {
      useEnablement: () => ({ isEnabled: true, isServiceAllowed: true }),
      useGetUrlParams: () => ({ dateRangeStart: 'now-24h', dateRangeEnd: 'now' }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../../../hooks/use_capabilities', () => {
      const mocked = {
      useCanEditSynthetics: () => true,
    };
      return { ...mocked, default: mocked };
    });

vi.mock('react-redux-v7', () => {
      const mocked = {
      useDispatch: () => mockDispatch,
      useSelector: (selector: (state: unknown) => unknown) => selector({}),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../state', () => {
      const mocked = {
      selectMonitorListState: () => mockMonitorList,
      selectAlertFlyoutVisibility: () => null,
      setAlertFlyoutVisible: (payload: unknown) => payload,
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../state/overview_status', () => {
      const mocked = {
      selectOverviewStatus: () => mockOverviewStatus,
      isExternalOverviewMonitor: () => false,
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../alerts/hooks/use_synthetics_rules', () => {
      const mocked = {
      useSyntheticsRules: () => ({
        loading: false,
        defaultRules: { statusRule: { id: 's' }, tlsRule: { id: 't' } },
        EditAlertFlyout: null,
        NewRuleFlyout: null,
      }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../settings/synthetics_diagnostics_flyout', () => {
      const mocked = {
      SyntheticsDiagnosticsFlyoutLauncher: () => null,
    };
      return { ...mocked, default: mocked };
    });

function renderMenuHook(options?: SyntheticsAppHeaderMenuOptions) {
  return renderHook(() => useSyntheticsAppHeaderMenu(options), {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <MemoryRouter>{children}</MemoryRouter>
    ),
  });
}

function findItem(items: AppHeaderMenu['items'], id: string) {
  return items?.find((item) => item.id === id);
}

describe('useSyntheticsAppHeaderMenu', () => {
  beforeEach(() => {
    mockMonitorList.loaded = true;
    mockMonitorList.data.absoluteTotal = 2;
    mockOverviewStatus.allConfigs = [{ origin: 'ui' }];
    mockUiSettingsGet.mockReturnValue(true);
  });

  it('puts Alerts first and forces Inspect, Explore data, and Settings into overflow by default', () => {
    const { result } = renderMenuHook();
    const { menu } = result.current;

    expect(findItem(menu.items, 'alerts')).toEqual(
      expect.objectContaining({
        id: 'alerts',
        testId: 'syntheticsAlertsRulesButton',
        order: 0,
      })
    );
    expect(findItem(menu.items, 'inspect')).toEqual(expect.objectContaining({ overflow: true }));
    expect(findItem(menu.items, 'exploreData')).toEqual(
      expect.objectContaining({
        overflow: true,
        testId: 'syntheticsExploreDataButton',
      })
    );
    expect(findItem(menu.items, 'settings')).toEqual(
      expect.objectContaining({
        overflow: true,
        testId: 'settings-page-link',
      })
    );
    expect(findItem(menu.items, 'diagnostics')).toBeUndefined();
    expect(menu.primaryActionItem).toBeUndefined();
  });

  it('shows Settings and Create monitor when the page asks for it and monitors exist', () => {
    const { result } = renderMenuHook({ showCreateMonitor: true });
    const { menu } = result.current;

    expect(findItem(menu.items, 'settings')).toBeDefined();
    expect(findItem(menu.items, 'alerts')).toBeDefined();
    expect(menu.primaryActionItem).toEqual(
      expect.objectContaining({
        id: 'createMonitor',
        testId: 'syntheticsAddMonitorBtn',
      })
    );
  });

  it('omits Create monitor when the listing is empty', () => {
    mockMonitorList.data.absoluteTotal = 0;
    mockOverviewStatus.allConfigs = [];

    const { result } = renderMenuHook({ showCreateMonitor: true });
    expect(result.current.menu.primaryActionItem).toBeUndefined();
  });

  it('surfaces Diagnostics alongside Settings when the page asks for it', () => {
    const { result } = renderMenuHook({ showDiagnostics: true });
    const { menu } = result.current;

    expect(findItem(menu.items, 'settings')).toBeDefined();
    expect(findItem(menu.items, 'diagnostics')).toEqual(
      expect.objectContaining({
        overflow: true,
        testId: 'syntheticsDiagnosticsOpenButton',
      })
    );
    expect(menu.primaryActionItem).toBeUndefined();
  });

  it('uses a page-provided primary action instead of Create monitor', () => {
    const primaryActionItem = {
      id: 'inspectConfiguration',
      label: 'Inspect configuration',
      iconType: 'inspect',
      run: vi.fn(),
    };
    const { result } = renderMenuHook({
      showCreateMonitor: true,
      primaryActionItem,
    });
    expect(result.current.menu.primaryActionItem).toEqual(primaryActionItem);
  });
});
