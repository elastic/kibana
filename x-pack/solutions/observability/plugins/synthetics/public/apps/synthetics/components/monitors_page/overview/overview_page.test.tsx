/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { Provider } from 'react-redux-v7';
import { Router } from '@kbn/shared-ux-router';
import { createMemoryHistory } from 'history';
import { applyMiddleware, createStore } from 'redux-v4';
import createSagaMiddleware from 'redux-saga';

import { rootReducer } from '../../../state/root_reducer';
import { rootEffect } from '../../../state/root_effect';

const mockUseOverviewStatus = jest.fn((_opts?: { scopeStatusByLocation: boolean }) => ({
  status: undefined,
  error: undefined,
  loading: false,
  loaded: false,
  settled: false,
  allConfigs: [] as unknown[],
}));

jest.mock('../hooks/use_overview_status', () => ({
  useOverviewStatus: (opts: { scopeStatusByLocation: boolean }) => mockUseOverviewStatus(opts),
  useOverviewStatusState: jest.fn(() => ({
    status: undefined,
    error: undefined,
    loading: false,
    loaded: false,
    settled: false,
    allConfigs: [],
  })),
}));

const mockUseMonitorList = jest.fn(() => ({
  loading: false,
  loaded: false,
  handleFilterChange: jest.fn(),
  absoluteTotal: 0,
  syntheticsMonitors: [],
}));

jest.mock('../hooks/use_monitor_list', () => ({
  useMonitorList: () => mockUseMonitorList(),
}));

jest.mock('../../../hooks', () => ({
  useEnablement: jest.fn(() => ({
    isEnabled: true,
    loading: false,
    error: undefined,
  })),
  useLocations: jest.fn(() => ({
    loading: false,
    locationsLoaded: true,
    locations: [],
  })),
  // `useSyncOverviewDateRange` (mounted by `OverviewPage`) reads the URL params
  // via this hook, so it must be stubbed here or the render throws.
  useUrlParams: jest.fn(() => [jest.fn(() => ({})), jest.fn()]),
}));

jest.mock('../../../hooks/use_synthetics_page_ready', () => ({
  useSyntheticsPageReady: jest.fn(),
}));

jest.mock('@kbn/observability-shared-plugin/public', () => ({
  useTrackPageview: jest.fn(),
}));

jest.mock('./use_breadcrumbs', () => ({
  useOverviewBreadcrumbs: jest.fn(),
}));

jest.mock('../management/disabled_callout', () => ({
  DisabledCallout: () => null,
}));

jest.mock('../../common/alerting_callout/alerting_callout', () => ({
  AlertingCallout: () => null,
}));

jest.mock('../common/monitor_filters/filter_group', () => ({
  FilterGroup: () => null,
}));

jest.mock('../common/search_field', () => ({
  SearchField: () => null,
}));

jest.mock('./overview/quick_filters', () => ({
  QuickFilters: () => null,
}));

jest.mock('./overview/overview_grid', () => ({
  OverviewGrid: () => null,
}));

jest.mock('./overview/overview_status', () => ({
  OverviewStatus: () => null,
}));

jest.mock('./overview/overview_errors/overview_errors', () => ({
  OverviewErrors: () => null,
}));

jest.mock('./overview/overview_alerts', () => ({
  OverviewAlerts: () => null,
}));

jest.mock('../common/no_monitors_found', () => ({
  NoMonitorsFound: () => null,
}));

import { OverviewPage } from './overview_page';

const buildStore = () => {
  const sagaMiddleware = createSagaMiddleware();
  const store = createStore(rootReducer, applyMiddleware(sagaMiddleware));
  sagaMiddleware.run(rootEffect);
  return store;
};

const renderPage = () => {
  const store = buildStore();
  const history = createMemoryHistory({ initialEntries: ['/overview'] });

  render(
    <Provider store={store}>
      <Router history={history}>
        <OverviewPage />
      </Router>
    </Provider>
  );

  return history;
};

describe('OverviewPage wiring', () => {
  beforeEach(() => {
    mockUseOverviewStatus.mockClear();
    mockUseMonitorList.mockReset();
    mockUseMonitorList.mockReturnValue({
      loading: false,
      loaded: false,
      handleFilterChange: jest.fn(),
      absoluteTotal: 0,
      syntheticsMonitors: [],
    });
  });

  it('calls useOverviewStatus with scopeStatusByLocation: true on mount', () => {
    const history = renderPage();

    expect(mockUseOverviewStatus).toHaveBeenCalledWith({ scopeStatusByLocation: true });
    expect(history.location.pathname).toBe('/overview');
  });

  it('redirects to Getting Started when there are no saved-object and no overview monitors', () => {
    mockUseMonitorList.mockReturnValue({
      loading: false,
      loaded: true,
      handleFilterChange: jest.fn(),
      absoluteTotal: 0,
      syntheticsMonitors: [],
    });
    mockUseOverviewStatus.mockReturnValue({
      status: undefined,
      error: undefined,
      loading: false,
      loaded: true,
      settled: true,
      allConfigs: [],
    });

    const history = renderPage();

    expect(history.location.pathname).toBe('/monitors/getting-started');
  });

  it('does not redirect when only ping-only overview monitors exist (no saved objects)', () => {
    mockUseMonitorList.mockReturnValue({
      loading: false,
      loaded: true,
      handleFilterChange: jest.fn(),
      absoluteTotal: 0,
      syntheticsMonitors: [],
    });
    mockUseOverviewStatus.mockReturnValue({
      status: undefined,
      error: undefined,
      loading: false,
      loaded: true,
      settled: true,
      allConfigs: [{ configId: 'hb-1', origin: 'heartbeat' }],
    });

    const history = renderPage();

    expect(history.location.pathname).toBe('/overview');
  });

  it('redirects when the only overview entry is a stale saved-object monitor (e.g. just deleted)', () => {
    // A just-deleted saved-object monitor lingers in the overview status until the
    // next refetch, but it has no `origin: 'heartbeat'` / `remote`, so it must not
    // block the Getting Started redirect once `absoluteTotal` has dropped to 0.
    mockUseMonitorList.mockReturnValue({
      loading: false,
      loaded: true,
      handleFilterChange: jest.fn(),
      absoluteTotal: 0,
      syntheticsMonitors: [],
    });
    mockUseOverviewStatus.mockReturnValue({
      status: undefined,
      error: undefined,
      loading: false,
      loaded: true,
      settled: true,
      allConfigs: [{ configId: 'deleted-1' }],
    });

    const history = renderPage();

    expect(history.location.pathname).toBe('/monitors/getting-started');
  });

  it('does not redirect before the overview status has loaded (avoids the empty-state flash)', () => {
    mockUseMonitorList.mockReturnValue({
      loading: false,
      loaded: true,
      handleFilterChange: jest.fn(),
      absoluteTotal: 0,
      syntheticsMonitors: [],
    });
    mockUseOverviewStatus.mockReturnValue({
      status: undefined,
      error: undefined,
      loading: false,
      loaded: false,
      settled: false,
      allConfigs: [],
    });

    const history = renderPage();

    expect(history.location.pathname).toBe('/overview');
  });

  it('redirects to Getting Started when the overview status request failed (settled, not loaded)', () => {
    // A failed overview-status request never flips `loaded`, and its `error` is
    // cleared almost immediately by the OverviewStatus toast effect. The persistent
    // `settled` flag is what lets a truly empty deployment whose status request
    // fails still reach Getting Started instead of hanging on an empty overview.
    mockUseMonitorList.mockReturnValue({
      loading: false,
      loaded: true,
      handleFilterChange: jest.fn(),
      absoluteTotal: 0,
      syntheticsMonitors: [],
    });
    mockUseOverviewStatus.mockReturnValue({
      status: undefined,
      error: undefined, // already cleared by the toast effect by the time we render
      loading: false,
      loaded: false,
      settled: true,
      allConfigs: [],
    });

    const history = renderPage();

    expect(history.location.pathname).toBe('/monitors/getting-started');
  });
});
