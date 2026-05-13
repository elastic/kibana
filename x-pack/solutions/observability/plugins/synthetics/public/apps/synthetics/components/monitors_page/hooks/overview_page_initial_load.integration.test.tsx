/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Provider } from 'react-redux';
import type { Store } from 'redux';
import { applyMiddleware, createStore } from 'redux';
import createSagaMiddleware from 'redux-saga';
import { Router } from '@kbn/shared-ux-router';
import { createMemoryHistory } from 'history';
import { act, render } from '@testing-library/react';

import { SYNTHETICS_API_URLS } from '../../../../../../common/constants';
import { apiService } from '../../../../../utils/api_service';
import { rootReducer } from '../../../state/root_reducer';
import { rootEffect } from '../../../state/root_effect';
import { SyntheticsRefreshContextProvider } from '../../../contexts/synthetics_refresh_context';
import { useOverviewStatus, useOverviewStatusState } from './use_overview_status';

// Why this test exists:
//
// The overview page previously had 8+ components each calling
// `useOverviewStatus`, and every instance independently dispatched a fetch
// on mount. With `takeLatest` in the saga, each dispatch starts a new HTTP
// request (the previous one's generator is cancelled, but the fetch()
// promise is already in flight). This produced 6+ `/overview_status`
// requests visible in DevTools on every page load.
//
// The fix splits the hook into:
//   - `useOverviewStatus` — fetches + reads; called ONCE in the page root.
//   - `useOverviewStatusState` — read-only; used by child components.
//
// This test pins that only ONE `/overview_status` request fires regardless
// of how many child components consume the data.

interface RecordedCall {
  url: string;
  query: Record<string, unknown> | undefined;
}

const mockOverviewStatusResponse = {
  allConfigs: {},
  allIds: [],
  allMonitorsCount: 0,
  disabledCount: 0,
  disabledMonitorsCount: 0,
  disabledMonitorQueryIds: [],
  enabledMonitorQueryIds: [],
  monitorsWithoutConfiguredLocations: [],
  projectMonitorsCount: 0,
};

const flushTimers = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const buildStore = (): Store => {
  const sagaMiddleware = createSagaMiddleware();
  const store = createStore(rootReducer, applyMiddleware(sagaMiddleware));
  sagaMiddleware.run(rootEffect);
  return store;
};

// Mirrors <OverviewPage>: the page root calls useOverviewStatus
// which triggers the fetch.
const PageRoot: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  useOverviewStatus({ scopeStatusByLocation: true });
  return <>{children}</>;
};

// Mirrors the child components (overview_grid, overview_status,
// monitors_table, quick_filters, etc.) that only read overview data.
const ChildReader: React.FC = () => {
  useOverviewStatusState();
  return null;
};

describe('Overview page — initial load API call counts', () => {
  let recorded: RecordedCall[];
  let getSpy: jest.SpyInstance;

  beforeEach(() => {
    recorded = [];
    getSpy = jest
      .spyOn(apiService, 'get')
      .mockImplementation(async (url: string, params?: Record<string, unknown>) => {
        recorded.push({ url, query: params });

        if (url === SYNTHETICS_API_URLS.OVERVIEW_STATUS) {
          return mockOverviewStatusResponse as unknown as never;
        }
        return {} as unknown as never;
      });
  });

  afterEach(() => {
    getSpy.mockRestore();
  });

  const callsTo = (url: string) => recorded.filter((c) => c.url === url);

  it('fires `/overview_status` exactly once even with multiple child consumers', async () => {
    const store = buildStore();
    const history = createMemoryHistory({ initialEntries: ['/'] });

    render(
      <Provider store={store}>
        <Router history={history}>
          <SyntheticsRefreshContextProvider>
            <PageRoot>
              <ChildReader />
              <ChildReader />
              <ChildReader />
              <ChildReader />
              <ChildReader />
            </PageRoot>
          </SyntheticsRefreshContextProvider>
        </Router>
      </Provider>
    );

    await act(async () => {
      await flushTimers(100);
    });

    expect(callsTo(SYNTHETICS_API_URLS.OVERVIEW_STATUS)).toHaveLength(1);
  });

  it('fires `/overview_status` exactly once when child consumers mount after the initial fetch', async () => {
    const store = buildStore();
    const history = createMemoryHistory({ initialEntries: ['/'] });
    let mountChildren: () => void = () => undefined;

    const App: React.FC = () => {
      const [showChildren, setShowChildren] = React.useState(false);
      mountChildren = () => setShowChildren(true);
      return (
        <PageRoot>
          {showChildren && (
            <>
              <ChildReader />
              <ChildReader />
              <ChildReader />
            </>
          )}
        </PageRoot>
      );
    };

    render(
      <Provider store={store}>
        <Router history={history}>
          <SyntheticsRefreshContextProvider>
            <App />
          </SyntheticsRefreshContextProvider>
        </Router>
      </Provider>
    );

    // Initial fetch fires and resolves.
    await act(async () => {
      await flushTimers(100);
    });

    expect(callsTo(SYNTHETICS_API_URLS.OVERVIEW_STATUS)).toHaveLength(1);

    // Child components mount (simulating <Loader> resolving).
    act(() => {
      mountChildren();
    });

    await act(async () => {
      await flushTimers(100);
    });

    // Still exactly one — children use useOverviewStatusState (read-only).
    expect(callsTo(SYNTHETICS_API_URLS.OVERVIEW_STATUS)).toHaveLength(1);
  });
});
