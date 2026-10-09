/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { DEFAULT_UNIVERSAL_PROFILING_ADD_DATA_TAB, UniversalProfilingAddDataTabs } from './types';

let mockQuery: { selectedTab?: UniversalProfilingAddDataTabs };
const mockReplace = jest.fn();

jest.mock('../../../components/contexts/profiling_dependencies/use_profiling_dependencies', () => ({
  useProfilingDependencies: () => ({
    services: { setupDataCollectionInstructions: jest.fn() },
    start: {
      core: {
        docLinks: {
          ELASTIC_WEBSITE_URL: 'https://www.elastic.co/',
          DOC_LINK_VERSION: 'current',
          links: { management: { apiKeys: 'https://www.elastic.co/api-keys' } },
        },
        application: {
          getUrlForApp: (appId: string, { path }: { path: string }) => `/app/${appId}${path}`,
        },
      },
    },
  }),
}));
jest.mock('../../../hooks/use_async', () => {
  const { AsyncStatus } = jest.requireActual('../../../hooks/use_async');
  return {
    AsyncStatus,
    useAsync: () => ({
      status: AsyncStatus.Settled,
      data: {
        collector: { secretToken: 'secret', host: 'collector:443' },
        symbolizer: { host: 'symbolizer:443' },
        profilerAgent: { version: '9.2.0' },
        stackVersion: '9.2.0',
      },
      refresh: jest.fn(),
    }),
  };
});
jest.mock('../../../hooks/use_profiling_params', () => ({
  useProfilingParams: () => ({ path: {}, query: mockQuery }),
}));
jest.mock('../../../hooks/use_profiling_router', () => ({
  useProfilingRouter: () => ({ push: jest.fn(), replace: mockReplace }),
}));
jest.mock('../../../hooks/use_profiling_route_path', () => ({
  useProfilingRoutePath: () => '/add-data-instructions',
}));

import { UniversalProfilingAddDataInstructions } from './universal_profiling_add_data_instructions';

describe('UniversalProfilingAddDataInstructions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const expectSelectedTab = (selectedTab: UniversalProfilingAddDataTabs) => {
    Object.values(UniversalProfilingAddDataTabs).forEach((tab) => {
      expect(screen.getByTestId(`profilingAddDataViewTab-${tab}`)).toHaveAttribute(
        'aria-selected',
        String(tab === selectedTab)
      );
    });
  };

  const renderInstructions = () =>
    render(
      <I18nProvider>
        <UniversalProfilingAddDataInstructions />
      </I18nProvider>
    );

  it('selects the default tab and writes it to the URL when the URL has none', () => {
    mockQuery = {};

    renderInstructions();

    expectSelectedTab(DEFAULT_UNIVERSAL_PROFILING_ADD_DATA_TAB);
    expect(mockReplace).toHaveBeenCalledWith('/add-data-instructions', {
      path: {},
      query: { selectedTab: DEFAULT_UNIVERSAL_PROFILING_ADD_DATA_TAB },
    });
  });

  it('selects the tab from the URL', () => {
    mockQuery = { selectedTab: UniversalProfilingAddDataTabs.Docker };

    renderInstructions();

    expectSelectedTab(UniversalProfilingAddDataTabs.Docker);
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
