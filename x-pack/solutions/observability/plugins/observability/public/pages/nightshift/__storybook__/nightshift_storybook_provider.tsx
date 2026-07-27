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
import type { NightshiftSignificantEventsQueryData } from '../hooks/use_fetch_significant_events';
import {
  checkoutFeature,
  checkoutLifecycle,
  nightshiftEvents,
  resolvedPaymentEvent,
} from './nightshift_fixtures';

export type NightshiftStorybookScenario =
  | 'loading'
  | 'loadingThenPopulated'
  | 'empty'
  | 'populated'
  | 'allClear'
  | 'error';

const performanceApi = {
  onPageReady: () => undefined,
  onPageRefreshStart: () => undefined,
};

interface NightshiftStorybookProviderProps {
  children: React.ReactNode;
  initialEntry?: string;
  scenario?: NightshiftStorybookScenario;
}

const neverResolve = (): Promise<never> => new Promise(() => undefined);
const waitForPopulatedData = (): Promise<void> =>
  new Promise((resolve) => window.setTimeout(resolve, 1_500));

const getEventsResponse = (
  scenario: NightshiftStorybookScenario
): NightshiftSignificantEventsQueryData => {
  const hits =
    scenario === 'empty' ? [] : scenario === 'allClear' ? [resolvedPaymentEvent] : nightshiftEvents;

  return {
    hits,
    page: 1,
    perPage: hits.length,
    total: hits.length,
  };
};

const createServices = (scenario: NightshiftStorybookScenario) => {
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
        if (scenario === 'error') {
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
          return { features: [checkoutFeature] };
        },
      },
    },
  };
};

export function NightshiftStorybookProvider({
  children,
  initialEntry = '/',
  scenario = 'populated',
}: NightshiftStorybookProviderProps): React.ReactElement {
  const services = useMemo(() => createServices(scenario), [scenario]);
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
          },
        },
      })
  );

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
