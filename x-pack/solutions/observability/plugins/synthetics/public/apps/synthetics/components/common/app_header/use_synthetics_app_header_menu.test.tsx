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
import {
  useSyntheticsAppHeaderMenu,
  type SyntheticsAppHeaderMenuOptions,
} from './use_synthetics_app_header_menu';

const mockInspectorOpen = jest.fn();
const mockUiSettingsGet = jest.fn(() => true);
const mockDispatch = jest.fn();
const mockMonitorList = {
  loaded: true,
  data: { absoluteTotal: 2 },
};

const mockOverviewStatus = {
  allConfigs: [{ origin: 'ui' }],
};

jest.mock('@kbn/kibana-react-plugin/public', () => ({
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
}));

jest.mock('@kbn/observability-shared-plugin/public', () => ({
  useInspectorContext: () => ({ inspectorAdapters: { requests: {} } }),
}));

jest.mock('@kbn/exploratory-view-plugin/public', () => ({
  createExploratoryViewUrl: () => '/app/exploratory-view',
}));

jest.mock('../../../contexts', () => ({
  useSyntheticsSettingsContext: () => ({ basePath: '', isDev: false }),
}));

jest.mock('../../../hooks', () => ({
  useEnablement: () => ({ isEnabled: true, isServiceAllowed: true }),
  useGetUrlParams: () => ({ dateRangeStart: 'now-24h', dateRangeEnd: 'now' }),
}));

jest.mock('../../../../../hooks/use_capabilities', () => ({
  useCanEditSynthetics: () => true,
}));

jest.mock('react-redux-v7', () => ({
  useDispatch: () => mockDispatch,
  useSelector: (selector: (state: unknown) => unknown) => selector({}),
}));

jest.mock('../../../state', () => ({
  selectMonitorListState: () => mockMonitorList,
  selectAlertFlyoutVisibility: () => null,
  setAlertFlyoutVisible: (payload: unknown) => payload,
}));

jest.mock('../../../state/overview_status', () => ({
  selectOverviewStatus: () => mockOverviewStatus,
  isExternalOverviewMonitor: () => false,
}));

jest.mock('../../alerts/hooks/use_synthetics_rules', () => ({
  useSyntheticsRules: () => ({
    loading: false,
    defaultRules: { statusRule: { id: 's' }, tlsRule: { id: 't' } },
    EditAlertFlyout: null,
    NewRuleFlyout: null,
  }),
}));

jest.mock('../../settings/synthetics_diagnostics_flyout', () => ({
  SyntheticsDiagnosticsFlyoutLauncher: () => null,
}));

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

  it('omits Settings and shows Create monitor when the page asks for it and monitors exist', () => {
    const { result } = renderMenuHook({ showSettings: false, showCreateMonitor: true });
    const { menu } = result.current;

    expect(findItem(menu.items, 'settings')).toBeUndefined();
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

    const { result } = renderMenuHook({ showSettings: false, showCreateMonitor: true });
    expect(result.current.menu.primaryActionItem).toBeUndefined();
  });

  it('omits Settings and surfaces Diagnostics when the page asks for it', () => {
    const { result } = renderMenuHook({ showSettings: false, showDiagnostics: true });
    const { menu } = result.current;

    expect(findItem(menu.items, 'settings')).toBeUndefined();
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
      run: jest.fn(),
    };
    const { result } = renderMenuHook({
      showCreateMonitor: true,
      primaryActionItem,
    });
    expect(result.current.menu.primaryActionItem).toEqual(primaryActionItem);
  });
});
