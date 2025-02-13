/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import {
  KibanaContextProvider,
  type KibanaReactContextValue,
} from '@kbn/kibana-react-plugin/public';
import type { Observable } from 'rxjs';
import { of } from 'rxjs';
import { action } from '@storybook/addon-actions';
import type { DecoratorFn } from '@storybook/react';
import { useParameter } from '@storybook/addons';
import type { DeepPartial } from 'utility-types';
import type { LocatorPublic } from '@kbn/share-plugin/public';
import type { IKibanaSearchRequest, ISearchOptions } from '@kbn/search-types';
import type { SearchSessionState } from '@kbn/data-plugin/public';
import type { Theme } from '@elastic/charts/dist/utils/themes/theme';
import { defaultLogViewAttributes } from '@kbn/logs-shared-plugin/common';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import { MemoryRouter } from 'react-router-dom';
import { AlertPrefillProvider } from '../../../alerting/use_alert_prefill';
import { PluginConfigProvider } from '../../../containers/plugin_config_context';
import type { PluginKibanaContextValue } from '../../../hooks/use_kibana';
import { MetricsDataViewProvider, SourceProvider } from '../../../containers/metrics_source';
import { getHttp } from './context/http';
import { assetDetailsProps, getLogEntries } from './context/fixtures';
import { ContextProviders } from '../context_providers';
import { DataViewsProvider } from '../hooks/use_data_views';
import type { InfraConfig } from '../../../../server';

const settings: Record<string, any> = {
  'dateFormat:scaled': [['', 'HH:mm:ss.SSS']],
  'timepicker:timeDefaults': ['now-15m', 'now'],
};
const getSettings = (key: string): any => settings[key];

const mockDataView = {
  id: 'default',
  getFieldByName: () => 'hostname' as unknown as DataViewField,
} as unknown as DataView;

export const DecorateWithKibanaContext: DecoratorFn = (story) => {
  const initialProcesses = useParameter<{ mock: string }>('apiResponse', {
    mock: 'default',
  })!;

  const mockServices: DeepPartial<KibanaReactContextValue<PluginKibanaContextValue>['services']> = {
    application: {
      currentAppId$: of('infra'),
      navigateToUrl: async (url: string) => {
        action(`Navigate to: ${url}`);
      },
      getUrlForApp: (url: string) => url,
    },
    chrome: {
      docTitle: {
        change(newTitle) {
          action('chrome.docTitle.change')(newTitle);
          return newTitle;
        },
      },
      setBreadcrumbs: () => {},
      setBreadcrumbsAppendExtension: () => () => {},
    },
    data: {
      search: {
        search: (request: IKibanaSearchRequest, options?: ISearchOptions) => {
          return getLogEntries(request, options) as any;
        },
        session: {
          start: () => 'started',
          state$: { closed: false } as unknown as Observable<SearchSessionState>,
        },
      },
      query: {
        filterManager: {
          addFilters: () => {},
          removeFilter: () => {},
        },
      },
    },
    dataViews: {
      create: () => Promise.resolve(mockDataView),
    },

    uiActions: {
      getTriggerCompatibleActions: () => {
        return Promise.resolve([]);
      },
    },
    uiSettings: {
      get: () => ({ key: 'mock', defaultOverride: undefined } as any),
    },
    triggersActionsUi: {
      getAlertSummaryWidget: () => <></>,
    },
    charts: {
      theme: {
        useChartsBaseTheme: () => ({} as Theme),
      },
    },
    settings: {
      client: {
        get$: (key: string) => of(getSettings(key)),
        get: getSettings,
      },
    },
    notifications: {
      toasts: {
        add: (params) => {
          action('notifications.toats.add')(params);
          return { id: 'id' };
        },
      },
    },
    http: getHttp(initialProcesses),
    share: {
      url: {
        locators: {
          get: (_id: string) =>
            ({
              navigate: async () => {
                return Promise.resolve();
              },
              getRedirectUrl: (args: any) => {
                action('share.url.locators.getRedirectUrl')(args);
              },
            } as unknown as LocatorPublic<any>),
        },
      },
    },
    logsShared: {
      logViews: {
        client: {
          getLogView: () =>
            Promise.resolve({
              id: 'log',
              attributes: defaultLogViewAttributes,
              origin: 'internal',
            }),
          getResolvedLogView: () =>
            Promise.resolve({
              dataViewReference: mockDataView,
            } as any),
        },
      },
    },
    lens: {
      navigateToPrefilledEditor: () => {},
      stateHelperApi: () => new Promise(() => {}),
    },
    telemetry: {
      reportAssetDetailsFlyoutViewed: () => {},
      reportAssetDetailsPageViewed: () => {},
      reportAssetDashboardLoaded: () => {},
    },
    observabilityShared: {
      navigation: { PageTemplate: ({ children }: { children?: any }) => <>{children}</> },
    },
  };

  const config: InfraConfig = {
    alerting: {
      inventory_threshold: {
        group_by_page_size: 11,
      },
      metric_threshold: {
        group_by_page_size: 11,
      },
    },
    enabled: true,
    inventory: {
      compositeSize: 11,
    },
    sources: {
      default: {
        fields: {
          message: ['default'],
        },
      },
    },
    featureFlags: {
      customThresholdAlertsEnabled: true,
      logsUIEnabled: false,
      metricsExplorerEnabled: false,
      osqueryEnabled: true,
      inventoryThresholdAlertRuleEnabled: true,
      metricThresholdAlertRuleEnabled: true,
      logThresholdAlertRuleEnabled: true,
      alertsAndRulesDropdownEnabled: true,
      profilingEnabled: false,
      ruleFormV2Enabled: false,
    },
  };

  return (
    <I18nProvider>
      <MemoryRouter initialEntries={['/infra/metrics/hosts']}>
        <PluginConfigProvider value={config}>
          <KibanaContextProvider services={mockServices}>
            <SourceProvider sourceId="default">
              <MetricsDataViewProvider>
                <AlertPrefillProvider>{story()} </AlertPrefillProvider>
              </MetricsDataViewProvider>
            </SourceProvider>
          </KibanaContextProvider>
        </PluginConfigProvider>
      </MemoryRouter>
    </I18nProvider>
  );
};

export const DecorateWithAssetDetailsStateContext: DecoratorFn = (story) => {
  return (
    <ContextProviders
      {...assetDetailsProps}
      dateRange={{
        from: '2023-04-09T11:07:49Z',
        to: '2023-04-09T11:23:49Z',
      }}
    >
      <DataViewsProvider>{story()}</DataViewsProvider>
    </ContextProviders>
  );
};
