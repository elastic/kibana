/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { EuiProvider } from '@elastic/eui';
import { PerformanceContext } from '@kbn/ebt-tools';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { StartServices } from '../../../utils/kibana_react';
import {
  NIGHTSHIFT_SIGNIFICANT_EVENTS_QUERY_KEY,
  type NightshiftSignificantEventsQueryData,
} from '../hooks/use_fetch_significant_events';
import {
  checkoutFeature,
  checkoutLifecycle,
  dismissedShippingEvent,
  nightshiftEvents,
  inventoryEvent,
  checkoutEvent,
  resolvedPaymentEvent,
} from './nightshift_fixtures';

export type NightshiftStorybookScenario =
  | 'loading'
  | 'loadingThenPopulated'
  | 'empty'
  | 'populated'
  | 'allClear'
  | 'openOnly'
  | 'dismissed'
  | 'cachedError'
  | 'error';

export type NightshiftLifecycleScenario = 'populated' | 'loading' | 'empty' | 'error';
export type NightshiftStreamFeaturesScenario = 'populated' | 'loading' | 'empty' | 'error';

const performanceApi = {
  onPageReady: () => undefined,
  onPageRefreshStart: () => undefined,
};

export interface NightshiftStorybookProviderProps {
  children: React.ReactNode;
  initialEntry?: string;
  lifecycleScenario?: NightshiftLifecycleScenario;
  scenario?: NightshiftStorybookScenario;
  streamFeaturesScenario?: NightshiftStreamFeaturesScenario;
}

const neverResolve = (): Promise<never> => new Promise(() => undefined);
const waitForPopulatedData = (): Promise<void> =>
  new Promise((resolve) => window.setTimeout(resolve, 1_500));

const getEventsResponse = (
  scenario: NightshiftStorybookScenario
): NightshiftSignificantEventsQueryData => {
  const hits =
    scenario === 'empty'
      ? []
      : scenario === 'allClear'
      ? [resolvedPaymentEvent]
      : scenario === 'openOnly'
      ? [checkoutEvent, inventoryEvent]
      : scenario === 'dismissed'
      ? [...nightshiftEvents, dismissedShippingEvent]
      : nightshiftEvents;

  return {
    hits,
    page: 1,
    perPage: hits.length,
    total: hits.length,
  };
};

const createServices = ({
  lifecycleScenario,
  scenario,
  streamFeaturesScenario,
}: {
  lifecycleScenario: NightshiftLifecycleScenario;
  scenario: NightshiftStorybookScenario;
  streamFeaturesScenario: NightshiftStreamFeaturesScenario;
}) => {
  const closedEventUuids = new Set<string>();
  const http = {
    basePath: {
      prepend: (path: string) => path,
    },
    get: async (path: string) => {
      if (path === '/internal/significant_events/events') {
        if (scenario === 'loading') {
          return neverResolve();
        }
        if (scenario === 'loadingThenPopulated') {
          await waitForPopulatedData();
        }
        if (scenario === 'error' || scenario === 'cachedError') {
          throw new Error('The significant events request failed');
        }
        const response = getEventsResponse(scenario);
        return {
          ...response,
          hits: response.hits.map((event) =>
            closedEventUuids.has(event.event_uuid) ? { ...event, status: 'closed' as const } : event
          ),
        };
      }

      if (path.includes('/lifecycle')) {
        if (lifecycleScenario === 'loading') {
          return neverResolve();
        }
        if (lifecycleScenario === 'error') {
          throw new Error('The event lifecycle request failed');
        }
        if (lifecycleScenario === 'empty') {
          return { detections: [], events: [checkoutEvent] };
        }
        return checkoutLifecycle;
      }

      return {};
    },
  };

  return {
    agentBuilder: {
      openChat: () => undefined,
    },
    application: {
      getUrlForApp: (appId: string, options?: { deepLinkId?: string; path?: string }): string =>
        `/app/${appId}${options?.path ?? ''}`,
    },
    charts: {
      theme: {
        useChartsBaseTheme: () => ({}),
        useSparklineOverrides: () => ({}),
      },
    },
    http,
    notifications: {
      toasts: {
        addError: () => undefined,
        addSuccess: () => undefined,
      },
    },
    share: {
      url: {
        locators: {
          get: () => ({
            getRedirectUrl: () => '/app/discover#/?_a=(index:logs.checkout-api)',
          }),
        },
      },
    },
    settings: {
      client: {
        get: (setting: string) =>
          setting === 'dateFormat' ? 'MMM D, YYYY @ HH:mm:ss.SSS' : undefined,
      },
    },
    streams: {
      streamsRepositoryClient: {
        fetch: async (route: string, options?: { params?: { path?: { id?: string } } }) => {
          const eventUuid = options?.params?.path?.id;
          if (route === 'POST /internal/significant_events/events/{id}/update' && eventUuid) {
            closedEventUuids.add(eventUuid);
            return {
              event_uuid: eventUuid,
              updated: 1,
              ignored: 0,
              status: 'closed',
            };
          }
          if (route === 'GET /internal/streams/{name}/features') {
            if (streamFeaturesScenario === 'loading') {
              return neverResolve();
            }
            if (streamFeaturesScenario === 'error') {
              throw new Error('The stream features request failed');
            }
            if (streamFeaturesScenario === 'empty') {
              return { features: [] };
            }
          }
          return { features: [checkoutFeature] };
        },
      },
    },
  };
};

export function NightshiftStorybookProvider({
  children,
  initialEntry = '/',
  lifecycleScenario = 'populated',
  scenario = 'populated',
  streamFeaturesScenario = 'populated',
}: NightshiftStorybookProviderProps): React.ReactElement {
  const services = useMemo(
    () => createServices({ lifecycleScenario, scenario, streamFeaturesScenario }),
    [lifecycleScenario, scenario, streamFeaturesScenario]
  );
  const [queryClient] = useState(() => {
    const client = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    if (scenario === 'cachedError') {
      client.setQueryData(NIGHTSHIFT_SIGNIFICANT_EVENTS_QUERY_KEY, getEventsResponse('populated'));
    }
    return client;
  });

  return (
    <I18nProvider>
      <EuiProvider>
        <KibanaContextProvider services={services as unknown as StartServices}>
          <QueryClientProvider client={queryClient}>
            <MemoryRouter initialEntries={[initialEntry]}>
              <PerformanceContext.Provider value={performanceApi}>
                {children}
              </PerformanceContext.Provider>
            </MemoryRouter>
          </QueryClientProvider>
        </KibanaContextProvider>
      </EuiProvider>
    </I18nProvider>
  );
}
