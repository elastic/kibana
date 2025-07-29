/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { makeDecorator } from '@storybook/preview-api';
import { AppMountParameters, CoreStart } from '@kbn/core/public';
import React, { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { UI_SETTINGS } from '@kbn/data-plugin/public';
import { createKibanaReactContext } from '@kbn/kibana-react-plugin/public';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { PluginContext } from '../../context/plugin_context/plugin_context';
import { HasDataContextProvider } from '../../context/has_data_context/has_data_context';
import {
  registerDataHandler,
  unregisterDataHandler,
} from '../../context/has_data_context/data_handler';
import { OverviewPage } from './overview';
import { alertsFetchData } from './mock/alerts.mock';
import { emptyResponse as emptyAPMResponse, fetchApmData } from './mock/apm.mock';
import { emptyResponse as emptyLogsResponse, fetchLogsData } from './mock/logs.mock';
import { emptyResponse as emptyMetricsResponse, fetchMetricsData } from './mock/metrics.mock';
import { newsFeedFetchData } from './mock/news_feed.mock';
import { createObservabilityRuleTypeRegistryMock } from '../../rules/observability_rule_type_registry_mock';
import { ApmIndicesConfig } from '../../../common/typings';
import { ConfigSchema } from '../../plugin';

function unregisterAll() {
  unregisterDataHandler({ appName: 'apm' });
  unregisterDataHandler({ appName: 'infra_logs' });
  unregisterDataHandler({ appName: 'infra_metrics' });
}

const sampleAPMIndices = { transaction: 'apm-*' } as ApmIndicesConfig;

const withCore = makeDecorator({
  name: 'withCore',
  parameterName: 'core',
  wrapper: (storyFn, context) => {
    unregisterAll();
    const KibanaReactContext = createKibanaReactContext({
      application: {
        getUrlForApp: () => '',
        capabilities: { navLinks: { integrations: true } },
        currentAppId$: {
          subscribe: () => {},
        },
      },
      data: {
        query: {
          timefilter: {
            timefilter: {
              setTime: () => {},
              getTime: () => ({}),
            },
          },
        },
      },
      http: {
        basePath: {
          prepend: (link: string) => `http://localhost:5601${link}`,
        },
      },
      chrome: {
        docTitle: {
          change: () => {},
        },
      },
      uiSettings: { get: () => [] },
      usageCollection: {
        reportUiCounter: () => {},
      },
    } as unknown as Partial<CoreStart>);

    const config: ConfigSchema = {
      unsafe: {
        alertDetails: {
          uptime: { enabled: false },
          observability: { enabled: false },
        },
      },
    };

    return (
      <MemoryRouter>
        <KibanaReactContext.Provider>
          <PluginContext.Provider
            value={{
              appMountParameters: {
                setHeaderActionMenu: () => {},
              } as unknown as AppMountParameters,
              config,
              observabilityRuleTypeRegistry: createObservabilityRuleTypeRegistryMock(),
              ObservabilityPageTemplate: KibanaPageTemplate,
            }}
          >
            <HasDataContextProvider>{storyFn(context) as ReactNode}</HasDataContextProvider>
          </PluginContext.Provider>
        </KibanaReactContext.Provider>
      </MemoryRouter>
    );
  },
});

const core = {
  http: {
    basePath: {
      prepend: (link: string) => `http://localhost:5601${link}`,
    },
    get: () => Promise.resolve({ data: [] }),
  },
  uiSettings: {
    get: (key: string) => {
      const euiSettings = {
        [UI_SETTINGS.TIMEPICKER_TIME_DEFAULTS]: {
          from: 'now-15m',
          to: 'now',
        },
        [UI_SETTINGS.TIMEPICKER_REFRESH_INTERVAL_DEFAULTS]: {
          pause: true,
          value: 1000,
        },
        [UI_SETTINGS.TIMEPICKER_QUICK_RANGES]: [
          {
            from: 'now/d',
            to: 'now/d',
            display: 'Today',
          },
          {
            from: 'now/w',
            to: 'now/w',
            display: 'This week',
          },
          {
            from: 'now-15m',
            to: 'now',
            display: 'Last 15 minutes',
          },
          {
            from: 'now-30m',
            to: 'now',
            display: 'Last 30 minutes',
          },
          {
            from: 'now-1h',
            to: 'now',
            display: 'Last 1 hour',
          },
          {
            from: 'now-24h',
            to: 'now',
            display: 'Last 24 hours',
          },
          {
            from: 'now-7d',
            to: 'now',
            display: 'Last 7 days',
          },
          {
            from: 'now-30d',
            to: 'now',
            display: 'Last 30 days',
          },
          {
            from: 'now-90d',
            to: 'now',
            display: 'Last 90 days',
          },
          {
            from: 'now-1y',
            to: 'now',
            display: 'Last 1 year',
          },
        ],
      };
      // @ts-expect-error
      return euiSettings[key];
    },
  },
  docLinks: {
    links: {
      observability: {
        guide: 'alink',
      },
    },
  },
} as unknown as CoreStart;

const coreWithAlerts = {
  ...core,
  http: {
    ...core.http,
    get: alertsFetchData,
  },
} as unknown as CoreStart;

const coreWithNewsFeed = {
  ...core,
  http: {
    ...core.http,
    get: newsFeedFetchData,
  },
} as unknown as CoreStart;

const coreAlertsThrowsError = {
  ...core,
  http: {
    ...core.http,
    get: async () => {
      throw new Error('Error fetching Alerts data');
    },
  },
} as unknown as CoreStart;

export default {
  title: 'app/Overview',
  decorators: [withCore(core)],
};

export const EmptyState = () => {
  registerDataHandler({
    appName: 'apm',
    fetchData: fetchApmData,
    hasData: async () => ({ hasData: false, indices: sampleAPMIndices }),
  });
  registerDataHandler({
    appName: 'infra_logs',
    fetchData: fetchLogsData,
    hasData: async () => ({ hasData: false, indices: 'test-index' }),
  });
  registerDataHandler({
    appName: 'infra_metrics',
    fetchData: fetchMetricsData,
    hasData: async () => ({ hasData: false, indices: 'metric-*' }),
  });

  return <OverviewPage />;
};

export const SinglePanel = () => {
  registerDataHandler({
    appName: 'infra_logs',
    fetchData: fetchLogsData,
    hasData: async () => ({ hasData: true, indices: 'test-index' }),
  });

  return <OverviewPage />;
};

export const LogsAndMetrics = {
  render: () => {
    registerDataHandler({
      appName: 'infra_logs',
      fetchData: fetchLogsData,
      hasData: async () => ({ hasData: true, indices: 'test-index' }),
    });
    registerDataHandler({
      appName: 'infra_metrics',
      fetchData: fetchMetricsData,
      hasData: async () => ({ hasData: true, indices: 'metric-*' }),
    });

    return <OverviewPage />;
  },

  name: 'Logs and Metrics',
};

export const LogsMetricsAndAlerts = {
  render: () => {
    registerDataHandler({
      appName: 'infra_logs',
      fetchData: fetchLogsData,
      hasData: async () => ({ hasData: true, indices: 'test-index' }),
    });
    registerDataHandler({
      appName: 'infra_metrics',
      fetchData: fetchMetricsData,
      hasData: async () => ({ hasData: true, indices: 'metric-*' }),
    });

    return <OverviewPage />;
  },

  name: 'Logs, Metrics, and Alerts',
  parameters: { core: coreWithAlerts },
};

export const LogsMetricsApmAndAlerts = {
  render: () => {
    registerDataHandler({
      appName: 'infra_logs',
      fetchData: fetchLogsData,
      hasData: async () => ({ hasData: true, indices: 'test-index' }),
    });
    registerDataHandler({
      appName: 'infra_metrics',
      fetchData: fetchMetricsData,
      hasData: async () => ({ hasData: true, indices: 'metric-*' }),
    });
    registerDataHandler({
      appName: 'apm',
      fetchData: fetchApmData,
      hasData: async () => ({ hasData: true, indices: sampleAPMIndices }),
    });

    return <OverviewPage />;
  },

  name: 'Logs, Metrics, APM, and Alerts',
  parameters: { core: coreWithAlerts },
};

export const LogsMetricsApm = {
  render: () => {
    registerDataHandler({
      appName: 'apm',
      fetchData: fetchApmData,
      hasData: async () => ({ hasData: true, indices: sampleAPMIndices }),
    });
    registerDataHandler({
      appName: 'infra_logs',
      fetchData: fetchLogsData,
      hasData: async () => ({ hasData: true, indices: 'test-index' }),
    });
    registerDataHandler({
      appName: 'infra_metrics',
      fetchData: fetchMetricsData,
      hasData: async () => ({ hasData: true, indices: 'metric-*' }),
    });

    return <OverviewPage />;
  },

  name: 'Logs, Metrics, APM.',
};

export const LogsMetricsApmAndNewsFeed = {
  render: () => {
    registerDataHandler({
      appName: 'apm',
      fetchData: fetchApmData,
      hasData: async () => ({ hasData: true, indices: sampleAPMIndices }),
    });
    registerDataHandler({
      appName: 'infra_logs',
      fetchData: fetchLogsData,
      hasData: async () => ({ hasData: true, indices: 'test-index' }),
    });
    registerDataHandler({
      appName: 'infra_metrics',
      fetchData: fetchMetricsData,
      hasData: async () => ({ hasData: true, indices: 'metric-*' }),
    });
    return <OverviewPage />;
  },

  name: 'Logs, Metrics, APM, and News Feed',
  parameters: { core: coreWithNewsFeed },
};

export const NoData = () => {
  registerDataHandler({
    appName: 'apm',
    fetchData: async () => emptyAPMResponse,
    hasData: async () => ({ hasData: true, indices: sampleAPMIndices }),
  });
  registerDataHandler({
    appName: 'infra_logs',
    fetchData: async () => emptyLogsResponse,
    hasData: async () => ({ hasData: true, indices: 'test-index' }),
  });
  registerDataHandler({
    appName: 'infra_metrics',
    fetchData: async () => emptyMetricsResponse,
    hasData: async () => ({ hasData: true, indices: 'metric-*' }),
  });

  return <OverviewPage />;
};

export const FetchDataWithError = {
  render: () => {
    registerDataHandler({
      appName: 'apm',
      fetchData: async () => {
        throw new Error('Error fetching APM data');
      },
      hasData: async () => ({ hasData: true, indices: sampleAPMIndices }),
    });
    registerDataHandler({
      appName: 'infra_logs',
      fetchData: async () => {
        throw new Error('Error fetching Logs data');
      },
      hasData: async () => ({ hasData: true, indices: 'test-index' }),
    });
    registerDataHandler({
      appName: 'infra_metrics',
      fetchData: async () => {
        throw new Error('Error fetching Metric data');
      },
      hasData: async () => ({ hasData: true, indices: 'metric-*' }),
    });
    return <OverviewPage />;
  },

  name: 'Fetch Data with Error',
  parameters: { core: coreAlertsThrowsError },
};

export const HasDataWithErrorAndAlerts = {
  render: () => {
    registerDataHandler({
      appName: 'apm',
      fetchData: fetchApmData,
      // @ts-ignore throws an error instead
      hasData: async () => {
        throw new Error('Error has data');
      },
    });
    registerDataHandler({
      appName: 'infra_logs',
      fetchData: fetchLogsData,
      // @ts-ignore throws an error instead
      hasData: async () => {
        throw new Error('Error has data');
      },
    });
    registerDataHandler({
      appName: 'infra_metrics',
      fetchData: fetchMetricsData,
      // @ts-ignore throws an error instead
      hasData: async () => {
        throw new Error('Error has data');
      },
    });

    return <OverviewPage />;
  },

  name: 'hasData with Error and Alerts',
  parameters: { core: coreWithAlerts },
};

export const HasDataWithError = {
  render: () => {
    registerDataHandler({
      appName: 'apm',
      fetchData: fetchApmData,
      // @ts-ignore throws an error instead
      hasData: async () => {
        throw new Error('Error has data');
      },
    });
    registerDataHandler({
      appName: 'infra_logs',
      fetchData: fetchLogsData,
      // @ts-ignore throws an error instead
      hasData: async () => {
        throw new Error('Error has data');
      },
    });
    registerDataHandler({
      appName: 'infra_metrics',
      fetchData: fetchMetricsData,
      // @ts-ignore throws an error instead
      hasData: async () => {
        throw new Error('Error has data');
      },
    });

    return <OverviewPage />;
  },

  name: 'hasData with Error',
};
