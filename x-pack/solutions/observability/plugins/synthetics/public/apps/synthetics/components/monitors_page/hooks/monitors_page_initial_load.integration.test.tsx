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
import { setOverviewPageStateAction, updateManagementPageStateAction } from '../../../state';
import { SyntheticsRefreshContextProvider } from '../../../contexts/synthetics_refresh_context';
import { useOverviewStatus } from './use_overview_status';
import { useMonitorList } from './use_monitor_list';
import { useFilters, useMonitorFiltersState } from '../common/monitor_filters/use_filters';

// Why this test exists:
//
// The /monitors (management) route initially fired duplicate
// `/internal/synthetics/overview_status` and `/api/synthetics/monitors`
// requests when entered via direct URL. Sequence of events on `main`:
//
//   1. <MonitorManagementPage> mounts. `useOverviewStatus` and
//      `useMonitorList` synchronously dispatch the initial fetch actions
//      (this is the perf optimisation introduced by PR #265674 — previously
//      a 100ms client-side debounce hid the bug).
//   2. The saga fires the first request after its own 300ms debounce.
//   3. <Loader> resolves once enablement + locations finish. Inside it,
//      <ShowAllSpaces> mounts; its first effect dispatches
//      `setOverviewPageStateAction({ showFromAllSpaces: false })` (the
//      localStorage default) — even when Redux already holds the same
//      value.
//   4. With the previous reducer behaviour, that dispatch produced a fresh
//      `pageState` reference (via `{ ...state.pageState, ...action.payload }`),
//      which re-fired the trailing `useDebounce` in `useOverviewStatus` /
//      `useMonitorList`. That trailing fetch hit the server *after* the
//      initial response had already returned (so `loaded === true`), causing
//      the duplicate request the user observed in DevTools.
//
// The fix lives in two places, both pinned by this test:
//
//   - `setOverviewPageStateAction` / `updateManagementPageStateAction`
//     reducers assign property-by-property so Immer can preserve
//     `pageState` identity when no slot actually changes.
//   - The initial `pageState` carries `showFromAllSpaces: false` so the
//     very first <ShowAllSpaces> dispatch matches and is a true no-op
//     (otherwise `undefined !== false` still produces a fresh reference).
//
// This is intentionally a real-store / real-saga integration test because
// the bug is fundamentally a saga + reducer + React-effect timing issue —
// individual unit tests can't reproduce it.

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

const mockMonitorListResponse = {
  page: 1,
  perPage: 10,
  total: 0,
  monitors: [],
  syncErrors: [],
  absoluteTotal: 0,
};

const flushTimers = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const buildStore = (): Store => {
  const sagaMiddleware = createSagaMiddleware();
  const store = createStore(rootReducer, applyMiddleware(sagaMiddleware));
  sagaMiddleware.run(rootEffect);
  return store;
};

const ManagementHooksProbe: React.FC = () => {
  // Mirrors the two hooks driving the management route:
  // <MonitorManagementPage> calls `useOverviewStatus({ scopeStatusByLocation: false })`
  // and <MonitorListContainer> consumes `useMonitorList()` via its parent.
  useOverviewStatus({ scopeStatusByLocation: false });
  useMonitorList();
  return null;
};

// Mirrors what <FilterGroup> renders inside <Loader> on the management route.
// `useFilters` runs the `/internal/synthetics/monitor/filters` fetch and
// `useMonitorFiltersState` runs the URL-derived `setOverviewPageStateAction` /
// `updateManagementPageStateAction` mount effects (configIds + useLogicalAndFor
// + the gated url-vs-redux hydrator).
const FiltersProbe: React.FC = () => {
  useFilters();
  useMonitorFiltersState();
  return null;
};

const renderWithRealStore = (store: Store, mountFiltersFromStart = false) => {
  const history = createMemoryHistory({ initialEntries: ['/monitors'] });
  return render(
    <Provider store={store}>
      <Router history={history}>
        <SyntheticsRefreshContextProvider>
          <ManagementHooksProbe />
          {mountFiltersFromStart ? <FiltersProbe /> : null}
        </SyntheticsRefreshContextProvider>
      </Router>
    </Provider>
  );
};

// Replicates the real-app sequence: the page mounts with
// <ManagementHooksProbe>, <Loader> blocks <FiltersProbe> until enablement +
// locations resolve, *then* <FiltersProbe> mounts. We mirror that by
// rendering `MountControlledFilters` and flipping `showFilters` after the
// initial fetch settles.
const MountControlledFilters: React.FC<{ showFilters: boolean }> = ({ showFilters }) => {
  return showFilters ? <FiltersProbe /> : null;
};

const renderWithDelayedFilters = (store: Store) => {
  const history = createMemoryHistory({ initialEntries: ['/monitors'] });
  let setShowFilters: (v: boolean) => void = () => undefined;

  const App: React.FC = () => {
    const [showFilters, setter] = React.useState(false);
    setShowFilters = setter;
    return (
      <>
        <ManagementHooksProbe />
        <MountControlledFilters showFilters={showFilters} />
      </>
    );
  };

  const utils = render(
    <Provider store={store}>
      <Router history={history}>
        <SyntheticsRefreshContextProvider>
          <App />
        </SyntheticsRefreshContextProvider>
      </Router>
    </Provider>
  );

  return { ...utils, mountFilters: () => setShowFilters(true) };
};

describe('Monitor management page — initial load API call counts', () => {
  let recorded: RecordedCall[];
  let getSpy: jest.SpyInstance;

  beforeEach(() => {
    recorded = [];
    getSpy = jest
      .spyOn(apiService, 'get')
      .mockImplementation(async (url: string, params?: Record<string, unknown>) => {
        recorded.push({ url, query: params });

        switch (url) {
          case SYNTHETICS_API_URLS.OVERVIEW_STATUS:
            return mockOverviewStatusResponse as unknown as never;
          case SYNTHETICS_API_URLS.SYNTHETICS_MONITORS:
            return mockMonitorListResponse as unknown as never;
          default:
            return {} as unknown as never;
        }
      });
  });

  afterEach(() => {
    getSpy.mockRestore();
  });

  const callsTo = (url: string) => recorded.filter((c) => c.url === url);

  it('fires `/overview_status` and `/api/synthetics/monitors` exactly once after `<ShowAllSpaces>` re-emits its localStorage default', async () => {
    const store = buildStore();
    renderWithRealStore(store);

    // Wait for the saga's `takeLatest` to process the initial fetch and for
    // the mocked API response to resolve so `loaded` transitions to `true`.
    await act(async () => {
      await flushTimers(100);
    });

    const overviewBefore = callsTo(SYNTHETICS_API_URLS.OVERVIEW_STATUS).length;
    const monitorsBefore = callsTo(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS).length;

    // Sanity check: the initial fetches must have fired and resolved.
    expect(overviewBefore).toBe(1);
    expect(monitorsBefore).toBe(1);

    // Simulate <ShowAllSpaces> mounting after <Loader> resolves and
    // dispatching its localStorage default. This is the exact pair of
    // dispatches that <SelectablePopover>'s mount effect produces.
    act(() => {
      store.dispatch(setOverviewPageStateAction({ showFromAllSpaces: false }));
      store.dispatch(updateManagementPageStateAction({ showFromAllSpaces: false }));
    });

    // Drain enough time for any *would-be* duplicate fetches to land.
    await act(async () => {
      await flushTimers(100);
    });

    expect(callsTo(SYNTHETICS_API_URLS.OVERVIEW_STATUS)).toHaveLength(1);
    expect(callsTo(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS)).toHaveLength(1);
  });

  it('does not fire duplicate `/overview_status`, `/synthetics/monitors`, or `/monitor/filters` requests when <FilterGroup> mounts after <Loader> resolves', async () => {
    // This reproduces the real-app sequence the user reports:
    //
    //   1. <MonitorManagementPage> mounts → <ManagementHooksProbe> fires the
    //      initial /overview_status + /synthetics/monitors fetches.
    //   2. <Loader> resolves (enablement + locations finish).
    //   3. <FilterGroup> mounts inside <Loader>; <FiltersProbe> mirrors that.
    //      `useFilters` issues the first /monitor/filters fetch.
    //      `useMonitorFiltersState` dispatches:
    //         updateManagementPageStateAction({ configIds: [] })   (line 67–69)
    //         setOverviewPageStateAction({ useLogicalAndFor: [] }) (line 72–83)
    //         updateManagementPageStateAction({ useLogicalAndFor: [] })
    //
    // `parseFilters(undefined)` returns a *fresh* `[]` per call. With a naive
    // reducer that only checks `state.pageState[key] !== value`, the
    // `undefined !== []` and `[] !== []` (different refs) comparisons both
    // register as a real change — producing a new `pageState` reference and
    // re-firing the trailing `useDebounce` in `useOverviewStatus` /
    // `useMonitorList`. That's the second wave of duplicates the user
    // observes *after* the loader is gone and table rows are visible.
    const store = buildStore();
    const { mountFilters } = renderWithDelayedFilters(store);

    // Phase 1: initial fetches land before <Loader> resolves.
    await act(async () => {
      await flushTimers(100);
    });

    expect(callsTo(SYNTHETICS_API_URLS.OVERVIEW_STATUS)).toHaveLength(1);
    expect(callsTo(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS)).toHaveLength(1);
    expect(callsTo(SYNTHETICS_API_URLS.FILTERS)).toHaveLength(0);

    // Phase 2: <Loader> resolves, <FilterGroup> mounts.
    act(() => {
      mountFilters();
    });

    await act(async () => {
      await flushTimers(100);
    });

    // /monitor/filters fires once on FilterGroup mount.
    expect(callsTo(SYNTHETICS_API_URLS.FILTERS)).toHaveLength(1);

    // Critical assertions: the late mount-time dispatches in
    // `useMonitorFiltersState` (configIds: [], useLogicalAndFor: []) must NOT
    // trigger duplicate /overview_status or /synthetics/monitors fetches.
    expect(callsTo(SYNTHETICS_API_URLS.OVERVIEW_STATUS)).toHaveLength(1);
    expect(callsTo(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS)).toHaveLength(1);
  });

  it('fires `/overview_status` and `/synthetics/monitors` exactly once when URL contains a query filter', async () => {
    // When the URL already contains filter params (e.g. ?query="Observability UI"),
    // the URL-to-Redux sync must complete before the initial fetch fires, so only
    // ONE request per endpoint is made (with the query param included).
    const store = buildStore();
    const history = createMemoryHistory({
      initialEntries: ['/monitors?query=%22Observability%20UI%22'],
    });

    render(
      <Provider store={store}>
        <Router history={history}>
          <SyntheticsRefreshContextProvider>
            <ManagementHooksProbe />
            <FiltersProbe />
          </SyntheticsRefreshContextProvider>
        </Router>
      </Provider>
    );

    await act(async () => {
      await flushTimers(100);
    });

    const overviewCalls = callsTo(SYNTHETICS_API_URLS.OVERVIEW_STATUS);
    expect(overviewCalls).toHaveLength(1);
    expect(overviewCalls[0].query).toEqual(
      expect.objectContaining({ query: '"Observability UI"' })
    );

    const monitorCalls = callsTo(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS);
    expect(monitorCalls).toHaveLength(1);
    expect(monitorCalls[0].query).toEqual(expect.objectContaining({ query: '"Observability UI"' }));
  });

  it('produces a duplicate fetch when `showFromAllSpaces` actually toggles (control)', async () => {
    // Counterpart to the test above: a *real* change to `showFromAllSpaces`
    // SHOULD trigger one extra fetch per slice. This guards against the
    // reducer being made too aggressive (e.g. swallowing all updates) and
    // keeps the no-op test from passing for the wrong reason.
    const store = buildStore();
    renderWithRealStore(store);

    await act(async () => {
      await flushTimers(100);
    });

    expect(callsTo(SYNTHETICS_API_URLS.OVERVIEW_STATUS)).toHaveLength(1);
    expect(callsTo(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS)).toHaveLength(1);

    act(() => {
      store.dispatch(setOverviewPageStateAction({ showFromAllSpaces: true }));
      store.dispatch(updateManagementPageStateAction({ showFromAllSpaces: true }));
    });

    await act(async () => {
      await flushTimers(100);
    });

    expect(callsTo(SYNTHETICS_API_URLS.OVERVIEW_STATUS)).toHaveLength(2);
    expect(callsTo(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS)).toHaveLength(2);
  });
});
