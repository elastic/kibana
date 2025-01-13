/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assign, createMachine } from 'xstate';
import { isEmpty, isError, omitBy } from 'lodash';
import { createComparatorByField } from '../../../utils/comparator_by_field';
import { Dataset, Integration } from '../../../../common/datasets';
import { IDatasetsClient } from '../../../services/datasets';
import { createDefaultContext } from './defaults';
import {
  DefaultIntegrationsContext,
  IntegrationsContext,
  IntegrationsEvent,
  IntegrationsSearchParams,
  IntegrationTypestate,
} from './types';

export const createPureIntegrationsStateMachine = (
  initialContext: DefaultIntegrationsContext = createDefaultContext()
) =>
  createMachine<IntegrationsContext, IntegrationsEvent, IntegrationTypestate>(
    {
      /** @xstate-layout N4IgpgJg5mDOIC5QEkB2AXMUBOBDdAlgPaqwB0ArqgdYbgDYEBekAxANoAMAuoqAA5FYBQiT4gAHogBMnAMxkAHAEZpAVmnSALIoCcc5Vt3SANCACeiYwDYy1rWoDsjxdcXPH1gL5ezaTDj4xKRk9ES4EDRQrBAkYGQ0AG5EANbx-lh4oiFhEVEISUQAxkEkXNzl4oLC2eJSCBpmlgjKnLpaSrpOatacnNbWhlo+fhiZpTnhkajRYNjYRNhk-PT4AGaLALZkGYHZ5LnTUAWoySXZ5ZVIINUiwXWIytbSimSc0oPy+optjnJNVnsZC0nE8anaoMc8mGvhAuyywQOUyirAAygBRACCACUAMIACQA+sgAHIAFXRAHFsZiycgAPIk1FXARCO5ia71Vo9MhQtRGFxqTjKZS6XQAlrC3S85zSRy6RxaOSKIXSEZwsZ7RGhZEzNH07Fk4nkqk0umM5k8Kps2qcx5qZSOOyqMVaIzuXTWNQS+WcOzWXTKORORRutyKdXwiZIiKQBIQehgVgAGXpmIAIoSALIG9HGinU2kMpksm42+52hBKhRyuRKzR6XSccFaCVu6RkAzadT2dQaRWRzUIkgxiBxggJpMYnEE-OmosW0u3W2gerVsi1+svMXN9oSgMduRdRyqwx-ZQR2FR-Y62MQeOJ-WGueF80lq3XZcV1ePPtvAwqk2Oi9IoEpqE4nZaIMhjSEeiihsog4BMOkx3g+U5YniRKkgWZrFqihKomS2JYlmlq8J+5Ycj+VZyDWfxbo2u6thYMhusCahyKC7iDJ4XGOEh4w3oc46Tk+Ro4fOb4EURJGYmRS5UagDwIAAtCeG5yloTxuG4CpqKBrENH0bzuOCIqDIGfQwqMyHRreY73ocURZosSaxKg8SFGkOxDvZIlObqUCudgYAnGcEyXB+rI1N+kiIF6yhkAq1iONoWjSJ6UGmEZmUdF0XF6AZvwioJWojg5cbOTMIVJnMCxLCs6xbL5dnCVMVVBbV4XFJFPCKbF1HxS02gKGKmhGHRLhQf8RlKn6R4GeBsiipoAlXn57VoWOABGRBUEUYComAuDYEUAAWUTXoiaKYbOkmvvhA3ssplZAW82geOovrWD6dZ2A4zhnpwrjtGVKGjnGu37agh3HadF1XZtN0SLA6D4PEuBrJg2AABRcZwACUrDXRVAVkNDB1HSdZ2XTMpOkM9K7DaoSrJcY2j6HI03WLNzQqB09hOO0nHzV04P+R196U7D1MI3TUAM7AqLoKFuCbLAt0zthJqPRahHEaR5HWoNr00WZSgnv0PYaB6EpPK8DgGG6ijKroPzqBLW2ORTYB7VT8O00jbWIirasa6wqPo5gZBYzj+N9MTSuVdLfsw3DNOI-TyMjmHJ0a0zcX1M8ahvFB7QKievPNvbDpvH0fRem6QYGd4G0h2TQUAGK4AQiYQKwJGphmL54Yu0VlqbKlPC8H2fEeyq-HzVhBsloL2Cq8FGBoPiwqgRBjvA1xKybL0qapjpJWt2kDK4egnoZzSqbB7NimlAyKqG7he9qVA0HcDBmCQFPszYuOVmjGFLkLP4lcXDvBshqDuqEjggKLo8I8SUfh-DrNzHQrsJTvTkKNOsrtlpKh-p3O8qChr1Avi-a+Ok776UfglBQQo+hPG+EQ-kYN25CW1OTCciZqFm2GrIBQypUqcCgkGWCmV9zOF5JfRUHNlBODbrZfhlCfbVWCm5ERKk9CvDkKlbQDpVCyJYs0EEpciryjlHKRul5NHlWQVDNOAdM4KxPpRKelYPRkAMnRH4LsQZGB9E2MghgQyaCbJCBBydyYywzvLYOWjSB53VkfGKZ9-GDCifYVoHwvT8lBBKTQY1OLNgdJ6RQshnAUOQVEHufdgG+NyTRC8bhAkfDCYGVQdSrGIBVElJsnhHSV0DGoXeXggA */
      context: initialContext,
      preserveActionOrder: true,
      predictableActionArguments: true,
      id: 'Integrations',
      initial: 'uninitialized',
      states: {
        uninitialized: {
          always: 'loading',
        },
        loading: {
          id: 'loading',

          invoke: {
            src: 'loadIntegrations',
            onDone: {
              target: 'loaded',
              actions: ['storeInCache', 'storeIntegrationsResponse', 'storeSearch'],
            },
            onError: 'loadingFailed',
          },
          on: {
            SEARCH_INTEGRATIONS: 'loaded.debounceSearchingIntegrations',
            SORT_INTEGRATIONS: {
              target: '#loading',
              actions: 'storeSearch',
            },
          },
        },
        loaded: {
          id: 'loaded',
          initial: 'idle',
          states: {
            idle: {
              on: {
                LOAD_MORE_INTEGRATIONS: {
                  cond: 'hasMoreIntegrations',
                  target: 'loadingMore',
                },
                SEARCH_INTEGRATIONS: 'debounceSearchingIntegrations',
                SORT_INTEGRATIONS: {
                  target: '#loading',
                  actions: 'storeSearch',
                },
                SEARCH_INTEGRATIONS_STREAMS: 'debounceSearchingIntegrationsStreams',
                SORT_INTEGRATIONS_STREAMS: {
                  target: 'idle',
                  actions: ['storeSearch', 'searchIntegrationsStreams'],
                },
              },
            },
            loadingMore: {
              invoke: {
                src: 'loadIntegrations',
                onDone: {
                  target: 'idle',
                  actions: ['storeInCache', 'appendIntegrations', 'storeSearch'],
                },
                onError: '#loadingFailed',
              },
            },
            debounceSearchingIntegrations: {
              entry: 'storeSearch',
              on: {
                SEARCH_INTEGRATIONS: 'debounceSearchingIntegrations',
              },
              after: {
                300: '#loading',
              },
            },
            debounceSearchingIntegrationsStreams: {
              entry: 'storeSearch',
              on: {
                SEARCH_INTEGRATIONS_STREAMS: 'debounceSearchingIntegrationsStreams',
              },
              after: {
                300: {
                  target: 'idle',
                  actions: 'searchIntegrationsStreams',
                },
              },
            },
          },
        },
        loadingFailed: {
          id: 'loadingFailed',
          entry: ['clearCache', 'clearData', 'storeError'],
          exit: 'clearError',
          on: {
            RELOAD_INTEGRATIONS: '#loading',
          },
        },
      },
    },
    {
      actions: {
        storeSearch: assign((context, event) => ({
          // Store search from search event
          ...('search' in event && { search: event.search }),
          // Store search from response
          ...('data' in event &&
            !isError(event.data) && {
              search: {
                ...context.search,
                searchAfter: event.data.searchAfter,
              },
            }),
        })),
        storeIntegrationsResponse: assign((_context, event) =>
          'data' in event && !isError(event.data)
            ? {
                integrationsSource: event.data.items,
                integrations: event.data.items,
                total: event.data.total,
              }
            : {}
        ),
        searchIntegrationsStreams: assign((context) => {
          if (context.integrationsSource !== null) {
            return {
              integrations: searchIntegrationStreams(context.integrationsSource, context.search),
            };
          }
          return {};
        }),
        storeInCache: (context, event) => {
          if ('data' in event && !isError(event.data)) {
            context.cache.set(context.search, event.data);
          }
        },
        appendIntegrations: assign((context, event) =>
          'data' in event && !isError(event.data)
            ? {
                integrationsSource: context.integrations?.concat(event.data.items) ?? [],
                integrations: context.integrations?.concat(event.data.items) ?? [],
                total: event.data.total,
              }
            : {}
        ),
        storeError: assign((_context, event) =>
          'data' in event && isError(event.data) ? { error: event.data } : {}
        ),
        clearCache: (context) => {
          context.cache.reset();
        },
        clearData: assign((_context) => ({ integrationsSource: null, integrations: null })),
        clearError: assign((_context) => ({ error: null })),
      },
      guards: {
        hasMoreIntegrations: (context) => Boolean(context.search.searchAfter),
      },
    }
  );

export interface IntegrationsStateMachineDependencies {
  initialContext?: DefaultIntegrationsContext;
  datasetsClient: IDatasetsClient;
}

export const createIntegrationStateMachine = ({
  initialContext,
  datasetsClient,
}: IntegrationsStateMachineDependencies) =>
  createPureIntegrationsStateMachine(initialContext).withConfig({
    services: {
      loadIntegrations: (context) => {
        const searchParams = context.search;

        return context.cache.has(searchParams)
          ? Promise.resolve(context.cache.get(searchParams))
          : datasetsClient.findIntegrations(omitBy(searchParams, isEmpty));
      },
    },
  });

const searchIntegrationStreams = (
  integrations: Integration[],
  search: IntegrationsSearchParams
) => {
  const { nameQuery, sortOrder, integrationId } = search;

  return integrations.map((integration) => {
    if (integration.id !== integrationId) {
      return integration;
    }

    return Integration.create({
      ...integration,
      // Filter and sort the datasets by the search criteria
      dataStreams: integration.datasets
        .filter((stream) => Boolean(stream.title?.includes(nameQuery ?? '')))
        .sort(createComparatorByField<Dataset>('name', sortOrder)),
    });
  });
};
