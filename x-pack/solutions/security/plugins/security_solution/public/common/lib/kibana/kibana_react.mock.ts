/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { RecursivePartial } from '@elastic/eui/src/components/common';
import { unifiedSearchPluginMock } from '@kbn/unified-search-plugin/public/mocks';
import { navigationPluginMock } from '@kbn/navigation-plugin/public/mocks';
import { discoverPluginMock } from '@kbn/discover-plugin/public/mocks';
import { coreMock, themeServiceMock } from '@kbn/core/public/mocks';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { securityMock } from '@kbn/security-plugin/public/mocks';

import {
  DEFAULT_APP_REFRESH_INTERVAL,
  DEFAULT_APP_TIME_RANGE,
  DEFAULT_BYTES_FORMAT,
  DEFAULT_DATE_FORMAT,
  DEFAULT_DATE_FORMAT_TZ,
  DEFAULT_FROM,
  DEFAULT_INDEX_KEY,
  DEFAULT_INDEX_PATTERN,
  DEFAULT_INTERVAL_PAUSE,
  DEFAULT_INTERVAL_VALUE,
  DEFAULT_REFRESH_RATE_INTERVAL,
  DEFAULT_TIME_RANGE,
  DEFAULT_TO,
  DEFAULT_RULES_TABLE_REFRESH_SETTING,
  DEFAULT_RULE_REFRESH_INTERVAL_ON,
  DEFAULT_RULE_REFRESH_INTERVAL_VALUE,
  SECURITY_FEATURE_ID,
} from '../../../../common/constants';
import type { StartServices } from '../../../types';
import { createSecuritySolutionStorageMock } from '../../mock/mock_local_storage';
import { MlLocatorDefinition } from '@kbn/ml-plugin/public';
import type { EuiTheme } from '@kbn/kibana-react-plugin/common';
import { MockUrlService } from '@kbn/share-plugin/common/mocks';
import { fleetMock } from '@kbn/fleet-plugin/public/mocks';
import { mockCasesContract } from '@kbn/cases-plugin/public/mocks';
import { noCasesPermissions } from '../../../cases_test_utils';
import { triggersActionsUiMock } from '@kbn/triggers-actions-ui-plugin/public/mocks';
import { mockApm } from '../apm/service.mock';
import { guidedOnboardingMock } from '@kbn/guided-onboarding-plugin/public/mocks';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { cloudMock } from '@kbn/cloud-plugin/public/mocks';
import { NavigationProvider } from '@kbn/security-solution-navigation';
import { uiActionsPluginMock } from '@kbn/ui-actions-plugin/public/mocks';
import { savedSearchPluginMock } from '@kbn/saved-search-plugin/public/mocks';
import { contractStartServicesMock } from '../../../mocks';
import { getDefaultConfigSettings } from '../../../../common/config_settings';
import { fieldFormatsMock } from '@kbn/field-formats-plugin/common/mocks';
import { indexPatternFieldEditorPluginMock } from '@kbn/data-view-field-editor-plugin/public/mocks';
import { UpsellingService } from '@kbn/security-solution-upselling/service';
import { calculateBounds } from '@kbn/data-plugin/common';
import { alertingPluginMock } from '@kbn/alerting-plugin/public/mocks';
import { createTelemetryServiceMock } from '../telemetry/telemetry_service.mock';

const mockUiSettings: Record<string, unknown> = {
  [DEFAULT_TIME_RANGE]: { from: 'now-15m', to: 'now', mode: 'quick' },
  [DEFAULT_REFRESH_RATE_INTERVAL]: { pause: true, value: 5000 },
  [DEFAULT_APP_TIME_RANGE]: {
    from: DEFAULT_FROM,
    to: DEFAULT_TO,
  },
  [DEFAULT_APP_REFRESH_INTERVAL]: {
    pause: DEFAULT_INTERVAL_PAUSE,
    value: DEFAULT_INTERVAL_VALUE,
  },
  [DEFAULT_INDEX_KEY]: DEFAULT_INDEX_PATTERN,
  [DEFAULT_BYTES_FORMAT]: '0,0.[0]b',
  [DEFAULT_DATE_FORMAT_TZ]: 'UTC',
  [DEFAULT_DATE_FORMAT]: 'MMM D, YYYY @ HH:mm:ss.SSS',
  [DEFAULT_RULES_TABLE_REFRESH_SETTING]: {
    on: DEFAULT_RULE_REFRESH_INTERVAL_ON,
    value: DEFAULT_RULE_REFRESH_INTERVAL_VALUE,
  },
};

export const createUseUiSettingMock =
  () =>
  (key: string, defaultValue?: unknown): unknown => {
    const result = mockUiSettings[key];

    if (typeof result != null) return result;

    if (defaultValue != null) {
      return defaultValue;
    }

    throw new TypeError(`Unexpected config key: ${key}`);
  };

export const createUseUiSetting$Mock = () => {
  const useUiSettingMock = createUseUiSettingMock();

  return (key: string, defaultValue?: unknown): [unknown, () => void] | undefined => [
    useUiSettingMock(key, defaultValue),
    jest.fn(),
  ];
};

export const createStartServicesMock = (
  core: ReturnType<typeof coreMock.createStart> = coreMock.createStart()
): StartServices => {
  core.uiSettings.get.mockImplementation(createUseUiSettingMock());
  core.settings.client.get.mockImplementation(createUseUiSettingMock());
  const { storage } = createSecuritySolutionStorageMock();
  const apm = mockApm();
  const data = dataPluginMock.createStartContract();
  const customDataService = dataPluginMock.createStartContract();
  const security = securityMock.createSetup();
  const urlService = new MockUrlService();
  const locator = urlService.locators.create(new MlLocatorDefinition());
  const fleet = fleetMock.createStartMock();
  const unifiedSearch = unifiedSearchPluginMock.createStartContract();
  const navigation = navigationPluginMock.createStartContract();
  const discover = discoverPluginMock.createStartContract();
  const cases = mockCasesContract();
  const dataViewServiceMock = dataViewPluginMocks.createStartContract();
  cases.helpers.canUseCases.mockReturnValue(noCasesPermissions());
  const triggersActionsUi = triggersActionsUiMock.createStart();
  const guidedOnboarding = guidedOnboardingMock.createStart();
  const cloud = cloudMock.createStart();
  const mockSetHeaderActionMenu = jest.fn();
  const timelineDataService = dataPluginMock.createStartContract();
  const alerting = alertingPluginMock.createStartContract();

  /*
   * Below mocks are needed by unified field list
   * when data service is passed through as a prop
   *
   * */
  timelineDataService.query.timefilter.timefilter.getAbsoluteTime = jest.fn(() => ({
    from: '2021-08-31T22:00:00.000Z',
    to: '2022-09-01T09:16:29.553Z',
  }));
  timelineDataService.query.timefilter.timefilter.getTime = jest.fn(() => {
    return { from: 'now-15m', to: 'now' };
  });
  timelineDataService.query.timefilter.timefilter.getRefreshInterval = jest.fn(() => {
    return { pause: true, value: 1000 };
  });
  timelineDataService.query.timefilter.timefilter.calculateBounds = jest.fn(calculateBounds);
  /** ************************************************* */

  return {
    ...core,
    ...contractStartServicesMock,
    configSettings: getDefaultConfigSettings(),
    apm,
    cases,
    unifiedSearch,
    navigation,
    discover,
    dataViews: dataViewServiceMock,
    data: {
      ...data,
      dataViews: dataViewServiceMock,
      query: {
        ...data.query,
        savedQueries: {
          ...data.query.savedQueries,
          findSavedQueries: jest.fn(() =>
            Promise.resolve({
              total: 123,
              queries: [
                {
                  id: '123',
                  attributes: {
                    total: 123,
                  },
                },
              ],
            })
          ),
        },
      },
      search: {
        ...data.search,
        search: jest.fn().mockImplementation(() => ({
          subscribe: jest.fn().mockImplementation(() => ({
            error: jest.fn(),
            next: jest.fn(),
            unsubscribe: jest.fn(),
          })),
          pipe: jest.fn().mockImplementation(() => ({
            subscribe: jest.fn().mockImplementation(() => ({
              error: jest.fn(),
              next: jest.fn(),
              unsubscribe: jest.fn(),
            })),
          })),
        })),
      },
    },
    application: {
      ...core.application,
      capabilities: {
        ...core.application.capabilities,
        [SECURITY_FEATURE_ID]: {
          crud: true,
          read: true,
        },
        securitySolutionTimeline: {
          crud: true,
          read: true,
        },
        savedQueryManagement: {
          showQueries: true,
          saveQuery: true,
        },
      },
    },
    security,
    storage,
    fleet,
    ml: {
      locator,
    },
    telemetry: createTelemetryServiceMock(),
    theme: themeServiceMock.createSetupContract(),
    timelines: {
      getLastUpdated: jest.fn(),
      getFieldBrowser: jest.fn(),
      getHoverActions: jest.fn().mockReturnValue({
        getAddToTimelineButton: jest.fn(),
      }),
      getUseAddToTimeline: jest.fn().mockReturnValue(
        jest.fn().mockReturnValue({
          startDragToTimeline: jest.fn(),
          beginDrag: jest.fn(),
          dragLocation: jest.fn(),
          endDrag: jest.fn(),
          cancelDrag: jest.fn(),
        })
      ),
    },
    osquery: {
      OsqueryResults: jest.fn().mockReturnValue(null),
      fetchAllLiveQueries: jest.fn().mockReturnValue({ data: { data: { items: [] } } }),
    },
    triggersActionsUi,
    guidedOnboarding,
    cloud: {
      ...cloud,
      isCloudEnabled: false,
    },
    customDataService,
    uiActions: uiActionsPluginMock.createStartContract(),
    savedSearch: savedSearchPluginMock.createStartContract(),
    setHeaderActionMenu: mockSetHeaderActionMenu,
    fieldFormats: fieldFormatsMock,
    dataViewFieldEditor: indexPatternFieldEditorPluginMock.createStartContract(),
    upselling: new UpsellingService(),
    timelineDataService,
    alerting,
  } as unknown as StartServices;
};

export const createWithKibanaMock = () => {
  const services = createStartServicesMock();

  // eslint-disable-next-line react/display-name
  return (Component: unknown) => (props: unknown) => {
    return React.createElement(Component as string, { ...(props as object), kibana: { services } });
  };
};

export const createKibanaContextProviderMock = () => {
  const services = createStartServicesMock();

  // eslint-disable-next-line react/display-name
  return ({
    children,
    startServices: startServicesMock,
  }: {
    children: React.ReactNode;
    startServices?: StartServices;
  }) =>
    React.createElement(
      KibanaContextProvider,
      { services: startServicesMock || services },
      React.createElement(NavigationProvider, { core: services }, children)
    );
};

export const getMockTheme = (partialTheme: RecursivePartial<EuiTheme>): EuiTheme =>
  partialTheme as EuiTheme;
