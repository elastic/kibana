/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren } from 'react';
import React from 'react';
import type { IStorage } from '@kbn/kibana-utils-plugin/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { unifiedSearchPluginMock } from '@kbn/unified-search-plugin/public/mocks';
import { RequestAdapter } from '@kbn/inspector-plugin/common';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { ISearchStart } from '@kbn/data-plugin/public';
import moment from 'moment';
import { IndicatorsFiltersContext } from '../modules/indicators/hooks/use_filters_context';
import { mockIndicatorsFiltersContext } from './mock_indicators_filters_context';
import { FieldTypesContext } from '../containers/field_types_provider';
import { generateFieldTypeMap } from './mock_field_type_map';
import { InspectorContext } from '../containers/inspector';
import { TestProviders } from '../../common/mock/test_providers';

export const localStorageMock = (): IStorage => {
  let store: Record<string, unknown> = {};

  return {
    getItem: (key: string) => {
      return store[key] || null;
    },
    setItem: (key: string, value: unknown) => {
      store[key] = value;
    },
    clear() {
      store = {};
    },
    removeItem(key: string) {
      delete store[key];
    },
  };
};

export const mockedSearchService = {
  search: jest.fn(),
  showError: jest.fn(),
} as unknown as ISearchStart;

const fixedMoment = moment(new Date('2025-05-16 00:00:00'));

export const mockedTimefilterService = {
  timefilter: {
    calculateBounds: jest.fn().mockReturnValue({ min: fixedMoment, max: fixedMoment }),
  },
};

export const mockedQueryService = {
  timefilter: mockedTimefilterService,
};

export const createTiStorageMock = () => {
  const localStorage = localStorageMock();
  return {
    localStorage,
    storage: new Storage(localStorage),
  };
};

export const mockedServices = {
  ...createTiStorageMock(),
};

export const unifiedSearch = unifiedSearchPluginMock.createStartContract();

export const EMPTY_PAGE_SECURITY_TEMPLATE = 'empty-page-security-template' as const;

export const TestProvidersComponent: FC<PropsWithChildren<{}>> = ({ children }) => (
  <TestProviders>
    <MemoryRouter>
      <InspectorContext.Provider value={{ requests: new RequestAdapter() }}>
        <QueryClientProvider client={new QueryClient()}>
          <FieldTypesContext.Provider value={generateFieldTypeMap()}>
            <IndicatorsFiltersContext.Provider value={mockIndicatorsFiltersContext}>
              {children}
            </IndicatorsFiltersContext.Provider>
          </FieldTypesContext.Provider>
        </QueryClientProvider>
      </InspectorContext.Provider>
    </MemoryRouter>
  </TestProviders>
);
