/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useSelector, useDispatch } from 'react-redux-v7';
import { useLocation } from 'react-router-dom';
import { useInitExploreDataView } from './use_init_explore_data_view';
import { createExploreDataView } from '../utils/create_explore_data_view';
import { getScopeFromPath } from '../../sourcerer/containers/sourcerer_paths';
import { sharedStateSelector } from '../redux/selectors';
import { sharedDataViewManagerSlice } from '../redux/slices';
import { selectDataViewAsync } from '../redux/actions';
import { PageScope } from '../constants';

jest.mock('react-redux-v7', () => ({
  ...jest.requireActual('react-redux-v7'),
  useSelector: jest.fn(),
  useDispatch: jest.fn(),
}));

jest.mock('react-router-dom', () => ({
  useLocation: jest.fn(),
}));

jest.mock('../../sourcerer/containers/sourcerer_paths', () => ({
  getScopeFromPath: jest.fn(),
}));

jest.mock('../utils/create_explore_data_view', () => ({
  createExploreDataView: jest.fn(),
}));

const mockAddDanger = jest.fn();

jest.mock('../../common/lib/kibana', () => ({
  useKibana: () => ({
    services: {
      dataViews: { create: jest.fn() },
      spaces: { getActiveSpace: async () => ({ id: 'default' }) },
      notifications: { toasts: { addDanger: mockAddDanger } },
    },
  }),
}));

const mockDispatch = jest.fn();
const mockExploreDataView = {
  id: 'explore-data-view-default',
  isPersisted: () => false,
  toSpec: () => ({ id: 'explore-data-view-default', title: 'logs-*' }),
};

// The default security data view title always includes the alerts (signal) index as its last
// pattern (appended server-side in `initialize_security_data_views`), and the alert data view's
// title is exactly that same signal index. This mirrors production so the alerts-exclusion filter
// in `createExploreDataView` is actually exercised.
const ALERTS_INDEX_PATTERN = '.alerts-security.alerts-default';
const readySharedState = {
  status: 'ready' as const,
  defaultDataViewId: 'default-dv-id',
  alertDataViewId: 'alert-dv-id',
  dataViews: [
    { id: 'default-dv-id', title: `apm-*,auditbeat-*,logs-*,${ALERTS_INDEX_PATTERN}` },
    { id: 'alert-dv-id', title: ALERTS_INDEX_PATTERN },
  ],
  adhocDataViews: [],
  signalIndex: null,
};

/**
 * Order-independent selector mock. The hook reads the explore scope via
 * `sourcererAdapterSelector(PageScope.explore)` (a freshly created selector on every render)
 * and the shared state via the stable `sharedStateSelector` reference, so we key off the
 * latter rather than relying on call order.
 */
const mockSelectors = ({
  exploreScope,
  shared,
}: {
  exploreScope: { dataViewId: string | null };
  shared: typeof readySharedState;
}) => {
  jest.mocked(useSelector).mockImplementation((selector: unknown) => {
    if (selector === sharedStateSelector) {
      return shared;
    }
    return exploreScope;
  });
};

describe('useInitExploreDataView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useDispatch).mockReturnValue(mockDispatch);
    jest.mocked(createExploreDataView).mockResolvedValue(mockExploreDataView as any);
    // Default to being on an explore page; individual tests override as needed.
    jest.mocked(useLocation).mockReturnValue({ pathname: '/hosts' } as ReturnType<
      typeof useLocation
    >);
    jest.mocked(getScopeFromPath).mockReturnValue(PageScope.explore);
  });

  it('does nothing when not on an explore path, even if explore scope is uninitialized', () => {
    jest.mocked(getScopeFromPath).mockReturnValue(PageScope.alerts);
    mockSelectors({ exploreScope: { dataViewId: null }, shared: readySharedState });

    renderHook(() => useInitExploreDataView());

    expect(createExploreDataView).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('creates and dispatches the explore data view when on an explore path and not yet initialized', async () => {
    mockSelectors({ exploreScope: { dataViewId: null }, shared: readySharedState });

    renderHook(() => useInitExploreDataView());

    // The hook forwards the full default patterns (including the alerts index) plus the alert
    // pattern; `createExploreDataView` is responsible for filtering the alerts index out.
    await waitFor(() =>
      expect(createExploreDataView).toHaveBeenCalledWith(
        expect.objectContaining({ dataViews: expect.anything(), spaces: expect.anything() }),
        ['apm-*', 'auditbeat-*', 'logs-*', ALERTS_INDEX_PATTERN],
        ALERTS_INDEX_PATTERN
      )
    );

    await waitFor(() =>
      expect(mockDispatch).toHaveBeenCalledWith(
        sharedDataViewManagerSlice.actions.addDataView(mockExploreDataView as any)
      )
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      selectDataViewAsync({ id: 'explore-data-view-default', scope: PageScope.explore })
    );
  });

  it('does nothing when explore scope is already initialized', () => {
    mockSelectors({
      exploreScope: { dataViewId: 'explore-data-view-default' },
      shared: readySharedState,
    });

    renderHook(() => useInitExploreDataView());

    expect(createExploreDataView).not.toHaveBeenCalled();
  });

  it('does nothing when shared state is not yet ready', () => {
    mockSelectors({
      exploreScope: { dataViewId: null },
      shared: { ...readySharedState, status: 'pristine' as any },
    });

    renderHook(() => useInitExploreDataView());

    expect(createExploreDataView).not.toHaveBeenCalled();
  });

  it('does nothing when default data view id is not available yet', () => {
    mockSelectors({
      exploreScope: { dataViewId: null },
      shared: { ...readySharedState, defaultDataViewId: null as any },
    });

    renderHook(() => useInitExploreDataView());

    expect(createExploreDataView).not.toHaveBeenCalled();
  });

  it('does nothing when the resolved data view titles are missing from the specs', () => {
    mockSelectors({
      exploreScope: { dataViewId: null },
      // ids are set on the shared state but there is no matching spec with a title
      shared: { ...readySharedState, dataViews: [] },
    });

    renderHook(() => useInitExploreDataView());

    expect(createExploreDataView).not.toHaveBeenCalled();
  });

  it('surfaces a danger toast and does not dispatch when creation fails', async () => {
    jest.mocked(createExploreDataView).mockRejectedValue(new Error('boom'));
    mockSelectors({ exploreScope: { dataViewId: null }, shared: readySharedState });

    renderHook(() => useInitExploreDataView());

    await waitFor(() =>
      expect(mockAddDanger).toHaveBeenCalledWith({
        title: 'Error initializing the explore data view',
        text: 'Error: boom',
      })
    );

    expect(mockDispatch).not.toHaveBeenCalledWith(
      sharedDataViewManagerSlice.actions.addDataView(mockExploreDataView as any)
    );
  });

  it('does not create a second explore data view when re-rendered before the scope selection resolves', async () => {
    mockSelectors({ exploreScope: { dataViewId: null }, shared: readySharedState });

    const { rerender } = renderHook(() => useInitExploreDataView());

    // The explore scope selection is applied asynchronously, so `exploreDataViewId` is still
    // null on re-renders triggered while creation is in flight / just resolved. The init guard
    // must prevent a duplicate creation.
    rerender();
    rerender();

    await waitFor(() => expect(createExploreDataView).toHaveBeenCalled());

    expect(createExploreDataView).toHaveBeenCalledTimes(1);
  });
});
