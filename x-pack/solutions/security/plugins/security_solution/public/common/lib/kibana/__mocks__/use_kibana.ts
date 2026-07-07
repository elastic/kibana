/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTGridMocks } from '@kbn/timelines-plugin/public/mock';

import { createStartServicesMock } from '../kibana_react.mock';
import { mockApm } from '../../apm/service.mock';
import { mockCasesContract } from '@kbn/cases-plugin/public/mocks';
import { notificationServiceMock } from '@kbn/core/public/mocks';

const mockStartServicesMock = createStartServicesMock();

export const useKibana = jest.fn().mockReturnValue({
  services: {
    ...mockStartServicesMock,
    apm: mockApm(),
    uiSettings: {
      get: jest.fn(),
      set: jest.fn(),
    },
    cases: mockCasesContract(),
    data: {
      ...mockStartServicesMock.data,
      search: {
        ...mockStartServicesMock.data.search,
        search: jest.fn().mockImplementation(() => ({
          subscribe: jest.fn().mockImplementation(() => ({
            error: jest.fn(),
            next: jest.fn(),
            unsubscribe: jest.fn(),
          })),
        })),
      },
      query: {
        ...mockStartServicesMock.data.query,
        filterManager: {
          addFilters: jest.fn(),
          getFilters: jest.fn(),
          getUpdates$: jest.fn().mockReturnValue({ subscribe: jest.fn() }),
          setAppFilters: jest.fn(),
        },
      },
    },
    osquery: {
      OsqueryResults: jest.fn().mockReturnValue(null),
      fetchAllLiveQueries: jest.fn().mockReturnValue({ data: { data: { items: [] } } }),
    },
    timelines: createTGridMocks(),
    savedObjectsTagging: {
      ui: {
        getTableColumnDefinition: jest.fn(),
      },
    },
    notifications: notificationServiceMock.createStartContract(),
  },
});
