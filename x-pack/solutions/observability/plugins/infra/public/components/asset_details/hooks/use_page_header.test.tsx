/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RouteState } from '@kbn/metrics-data-access-plugin/public';
import { renderHook } from '@testing-library/react';
import { usePageHeader } from './use_page_header';
import { useTabSwitcherContext } from './use_tab_switcher';
import { useProfilingPluginSetting } from '../../../hooks/use_profiling_integration_setting';
import { useInfraMLCapabilitiesContext } from '../../../containers/ml/infra_ml_capabilities';
import { usePluginConfig } from '../../../containers/plugin_config_context';
import { useAssetDetailsRenderPropsContext } from './use_asset_details_render_props';
import { ContentTabIds, type Tab } from '../types';

interface MockHistory {
  goBack: jest.Mock;
  length: number;
}

interface MockLocation {
  state: RouteState | null;
}

const mockOriginRouteState: RouteState = {
  originAppId: 'metrics',
  originPathname: '/hosts',
  originSearch: '?kuery=host.name:%20foo',
};

const mockUseHistory = jest.fn<MockHistory, []>(() => ({
  goBack: jest.fn(),
  length: 0,
}));
const mockUseLocation = jest.fn<MockLocation, []>(() => ({
  state: null,
}));
const mockChromeNextIsEnabled = jest.fn<boolean, []>(() => false);
const mockChromeStyle = jest.fn<'classic' | 'project', []>(() => 'classic');

jest.mock('react-router-dom', () => ({
  useHistory: () => mockUseHistory(),
  useLocation: () => mockUseLocation(),
}));

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useUiSetting: () => true,
}));

jest.mock('../../../hooks/use_kibana', () => ({
  useKibanaContextForPlugin: () => ({
    services: {
      application: {
        navigateToApp: jest.fn(),
      },
      chrome: {
        getChromeStyle: () => mockChromeStyle(),
        next: {
          get isEnabled() {
            return mockChromeNextIsEnabled();
          },
        },
      },
    },
  }),
}));

jest.mock('./use_tab_switcher');
jest.mock('../../../hooks/use_profiling_integration_setting');
jest.mock('../../../containers/ml/infra_ml_capabilities');
jest.mock('../../../containers/plugin_config_context');
jest.mock('./use_asset_details_render_props');

const useTabSwitcherContextMock = useTabSwitcherContext as jest.MockedFunction<
  typeof useTabSwitcherContext
>;
const useProfilingPluginSettingMock = useProfilingPluginSetting as jest.MockedFunction<
  typeof useProfilingPluginSetting
>;
const useInfraMLCapabilitiesContextMock = useInfraMLCapabilitiesContext as jest.MockedFunction<
  typeof useInfraMLCapabilitiesContext
>;
const usePluginConfigMock = usePluginConfig as jest.MockedFunction<typeof usePluginConfig>;
const useAssetDetailsRenderPropsContextMock =
  useAssetDetailsRenderPropsContext as jest.MockedFunction<
    typeof useAssetDetailsRenderPropsContext
  >;

const mockProfilingTab: Tab = {
  id: ContentTabIds.PROFILING,
  name: 'Universal Profiling',
};

const mockOverviewTab: Tab = {
  id: ContentTabIds.OVERVIEW,
  name: 'Overview',
};

describe('usePageHeader', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseHistory.mockReturnValue({
      goBack: jest.fn(),
      length: 0,
    });
    mockUseLocation.mockReturnValue({
      state: null,
    });
    mockChromeNextIsEnabled.mockReturnValue(false);
    mockChromeStyle.mockReturnValue('classic');

    useTabSwitcherContextMock.mockReturnValue({
      showTab: jest.fn(),
      activeTabId: ContentTabIds.OVERVIEW,
      renderedTabsSet: { current: new Set([ContentTabIds.OVERVIEW, ContentTabIds.PROFILING]) },
    } as unknown as ReturnType<typeof useTabSwitcherContext>);

    useProfilingPluginSettingMock.mockReturnValue(true);

    useInfraMLCapabilitiesContextMock.mockReturnValue({
      isTopbarMenuVisible: true,
    } as unknown as ReturnType<typeof useInfraMLCapabilitiesContext>);

    usePluginConfigMock.mockReturnValue({
      featureFlags: {
        osqueryEnabled: false,
      },
    } as unknown as ReturnType<typeof usePluginConfig>);

    useAssetDetailsRenderPropsContextMock.mockReturnValue({
      schema: 'semconv',
      entity: {
        id: 'test-host-1',
        name: 'test-host-1',
        type: 'host',
      },
    } as unknown as ReturnType<typeof useAssetDetailsRenderPropsContext>);
  });

  describe('profiling tab visibility', () => {
    it('should include profiling tab when profiling plugin is enabled', () => {
      useProfilingPluginSettingMock.mockReturnValue(true);

      const { result } = renderHook(() => usePageHeader([mockOverviewTab, mockProfilingTab], []));

      const profilingTabEntry = result.current.tabEntries.find(
        (tab) => tab.id === ContentTabIds.PROFILING
      );

      expect(profilingTabEntry).toBeDefined();
      expect(profilingTabEntry?.id).toBe(ContentTabIds.PROFILING);
      expect(profilingTabEntry?.['data-test-subj']).toBe('infraAssetDetailsProfilingTab');
      expect(profilingTabEntry?.label).toBe('Universal Profiling');
    });

    it('should exclude profiling tab when profiling plugin is disabled', () => {
      useProfilingPluginSettingMock.mockReturnValue(false);

      const { result } = renderHook(() => usePageHeader([mockOverviewTab, mockProfilingTab], []));

      const profilingTabEntry = result.current.tabEntries.find(
        (tab) => tab.id === ContentTabIds.PROFILING
      );

      expect(profilingTabEntry).toBeUndefined();
    });

    it('should set correct test subject for profiling tab', () => {
      useProfilingPluginSettingMock.mockReturnValue(true);

      const { result } = renderHook(() => usePageHeader([mockOverviewTab, mockProfilingTab], []));

      const profilingTabEntry = result.current.tabEntries.find(
        (tab) => tab.id === ContentTabIds.PROFILING
      );

      expect(profilingTabEntry?.['data-test-subj']).toBe('infraAssetDetailsProfilingTab');
    });

    it('should mark profiling tab as selected when activeTabId is profiling', () => {
      useProfilingPluginSettingMock.mockReturnValue(true);
      useTabSwitcherContextMock.mockReturnValue({
        showTab: jest.fn(),
        activeTabId: ContentTabIds.PROFILING,
        renderedTabsSet: { current: new Set([ContentTabIds.OVERVIEW, ContentTabIds.PROFILING]) },
      } as unknown as ReturnType<typeof useTabSwitcherContext>);

      const { result } = renderHook(() => usePageHeader([mockOverviewTab, mockProfilingTab], []));

      const profilingTabEntry = result.current.tabEntries.find(
        (tab) => tab.id === ContentTabIds.PROFILING
      );

      expect(profilingTabEntry?.isSelected).toBe(true);
    });

    it('should call showTab with profiling tab id when profiling tab is clicked', () => {
      const showTabMock = jest.fn();
      useProfilingPluginSettingMock.mockReturnValue(true);
      useTabSwitcherContextMock.mockReturnValue({
        showTab: showTabMock,
        activeTabId: ContentTabIds.OVERVIEW,
        renderedTabsSet: { current: new Set([ContentTabIds.OVERVIEW, ContentTabIds.PROFILING]) },
      } as unknown as ReturnType<typeof useTabSwitcherContext>);

      const { result } = renderHook(() => usePageHeader([mockOverviewTab, mockProfilingTab], []));

      const profilingTabEntry = result.current.tabEntries.find(
        (tab) => tab.id === ContentTabIds.PROFILING
      );

      expect(profilingTabEntry?.onClick).toBeDefined();
      if (profilingTabEntry?.onClick) {
        // The onClick implementation doesn't use the event parameter
        (profilingTabEntry.onClick as () => void)();
      }

      expect(showTabMock).toHaveBeenCalledWith(ContentTabIds.PROFILING);
    });
  });

  describe('return breadcrumb visibility', () => {
    it('should hide the Return breadcrumb when Chrome Next is enabled in the project layout', () => {
      mockChromeNextIsEnabled.mockReturnValue(true);
      mockChromeStyle.mockReturnValue('project');
      mockUseLocation.mockReturnValue({
        state: mockOriginRouteState,
      });

      const { result } = renderHook(() => usePageHeader([mockOverviewTab], []));

      expect(result.current.breadcrumbs).toEqual([]);
    });

    it('should show the Return breadcrumb in the classic layout when Chrome Next is enabled', () => {
      mockChromeNextIsEnabled.mockReturnValue(true);
      mockUseLocation.mockReturnValue({
        state: mockOriginRouteState,
      });

      const { result } = renderHook(() => usePageHeader([mockOverviewTab], []));

      expect(result.current.breadcrumbs).toHaveLength(1);
      expect(result.current.breadcrumbs[0]['data-test-subj']).toBe('infraAssetDetailsReturnButton');
    });

    it('should show the Return breadcrumb in the project layout when Chrome Next is disabled', () => {
      mockChromeStyle.mockReturnValue('project');
      mockUseLocation.mockReturnValue({
        state: mockOriginRouteState,
      });

      const { result } = renderHook(() => usePageHeader([mockOverviewTab], []));

      expect(result.current.breadcrumbs).toHaveLength(1);
      expect(result.current.breadcrumbs[0]['data-test-subj']).toBe('infraAssetDetailsReturnButton');
    });
  });
});
