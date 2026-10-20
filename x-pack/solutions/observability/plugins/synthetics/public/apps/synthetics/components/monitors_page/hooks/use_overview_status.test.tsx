/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook } from '@testing-library/react';
import * as redux from 'react-redux-v7';
import { mockState } from '../../../utils/testing/__mocks__/synthetics_store.mock';
import { WrappedHelper } from '../../../utils/testing';
import {
  fetchOverviewStatusAction,
  quietFetchOverviewStatusAction,
} from '../../../state/overview_status';
import type { OverviewStatusMetaData } from '../../../../../../common/runtime_types';
import { OVERVIEW_STATUS_MAX_PER_PAGE } from '../../../../../../common/constants/monitor_management';
import { useOverviewStatus } from './use_overview_status';

const refreshState = { lastRefresh: 1 };

jest.mock('../../../contexts/synthetics_refresh_context', () => {
  const actual = jest.requireActual('../../../contexts/synthetics_refresh_context');
  return {
    ...actual,
    useSyntheticsRefreshContext: () => ({
      lastRefresh: refreshState.lastRefresh,
      refreshApp: jest.fn(),
      refreshInterval: 60,
      refreshPaused: false,
      setRefreshInterval: jest.fn(),
      setRefreshPaused: jest.fn(),
    }),
  };
});

describe('useOverviewStatus', () => {
  const dispatchMockFn = jest.fn();

  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(redux, 'useDispatch').mockReturnValue(dispatchMockFn);
  });

  describe('initial mount fetch', () => {
    it('dispatches `fetchOverviewStatusAction.get` on initial mount when not yet loaded', () => {
      renderHook(() => useOverviewStatus({ scopeStatusByLocation: true }), {
        wrapper: ({ children }) => React.createElement(WrappedHelper, null, children),
      });

      expect(dispatchMockFn).toHaveBeenCalledWith(
        expect.objectContaining({
          type: fetchOverviewStatusAction.get.type,
          payload: {
            pageState: mockState.overview.pageState,
            scopeStatusByLocation: true,
          },
        })
      );
    });

    it('dispatches `quietFetchOverviewStatusAction.get` on initial mount when already loaded', () => {
      renderHook(() => useOverviewStatus({ scopeStatusByLocation: false }), {
        wrapper: ({ children }) =>
          React.createElement(
            WrappedHelper,
            { state: { overviewStatus: { ...mockState.overviewStatus, loaded: true } } },
            children
          ),
      });

      expect(dispatchMockFn).toHaveBeenCalledWith(
        expect.objectContaining({
          type: quietFetchOverviewStatusAction.get.type,
          payload: {
            pageState: mockState.overview.pageState,
            scopeStatusByLocation: false,
          },
        })
      );
      expect(dispatchMockFn).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: fetchOverviewStatusAction.get.type })
      );
    });

    it('dispatches the initial fetch exactly once on mount', () => {
      renderHook(() => useOverviewStatus({ scopeStatusByLocation: true }), {
        wrapper: ({ children }) => React.createElement(WrappedHelper, null, children),
      });

      const initialFetchCalls = dispatchMockFn.mock.calls.filter(
        ([action]) =>
          action?.type === fetchOverviewStatusAction.get.type ||
          action?.type === quietFetchOverviewStatusAction.get.type
      );
      expect(initialFetchCalls).toHaveLength(1);
    });

    it('re-fetches when pageState changes before initial load completes (URL sync)', () => {
      const stateRef: { current: any } = { current: undefined };

      const wrapper = ({ children }: React.PropsWithChildren<{}>) =>
        React.createElement(WrappedHelper, { state: stateRef.current }, children);

      const { rerender } = renderHook(() => useOverviewStatus({ scopeStatusByLocation: true }), {
        wrapper,
      });

      expect(dispatchMockFn).toHaveBeenCalledWith(
        expect.objectContaining({ type: fetchOverviewStatusAction.get.type })
      );
      dispatchMockFn.mockClear();

      stateRef.current = {
        overview: {
          pageState: {
            ...mockState.overview.pageState,
            query: '"Observability UI"',
          },
        },
      };
      rerender();

      expect(dispatchMockFn).toHaveBeenCalledWith(
        expect.objectContaining({
          type: fetchOverviewStatusAction.get.type,
          payload: expect.objectContaining({
            pageState: expect.objectContaining({ query: '"Observability UI"' }),
          }),
        })
      );
    });
  });

  describe('auto-refresh vs infinite-scroll append', () => {
    const stubConfig = (configId: string): OverviewStatusMetaData => ({
      configId,
      monitorQueryId: configId,
      name: configId,
      schedule: '3',
      tags: [],
      isEnabled: true,
      type: 'http',
      isStatusAlertEnabled: false,
      overallStatus: 'up',
      locations: [{ id: 'us_east', label: 'US East', status: 'up' }],
    });
    const fortyConfigs = Array.from({ length: 40 }, (_, i) => stubConfig(`m${i}`));

    const tickRefresh = (rerender: () => void) => {
      dispatchMockFn.mockClear();
      refreshState.lastRefresh += 1;
      rerender();
    };

    beforeEach(() => {
      refreshState.lastRefresh = 1;
    });

    it('does not start a page-1 refresh while an append is in flight', () => {
      const { rerender } = renderHook(() => useOverviewStatus({ scopeStatusByLocation: true }), {
        wrapper: ({ children }) =>
          React.createElement(
            WrappedHelper,
            {
              state: {
                overview: {
                  ...mockState.overview,
                  view: 'cardView',
                  pageState: { ...mockState.overview.pageState, page: 1, perPage: 20 },
                },
                overviewStatus: {
                  ...mockState.overviewStatus,
                  loaded: true,
                  loading: true,
                  allConfigs: fortyConfigs.slice(0, 20),
                  total: 40,
                },
              },
            },
            children
          ),
      });

      tickRefresh(rerender);

      // Timer refreshes are `silent`. A non-silent quiet fetch can still come from
      // the pageState effect if the test wrapper rebuilds the store on rerender.
      expect(dispatchMockFn).not.toHaveBeenCalledWith(
        expect.objectContaining({
          type: quietFetchOverviewStatusAction.get.type,
          payload: expect.objectContaining({ silent: true }),
        })
      );
    });

    it('refreshes the whole accumulated card-view window when more than one page is loaded', () => {
      const { rerender } = renderHook(() => useOverviewStatus({ scopeStatusByLocation: true }), {
        wrapper: ({ children }) =>
          React.createElement(
            WrappedHelper,
            {
              state: {
                overview: {
                  ...mockState.overview,
                  view: 'cardView',
                  pageState: { ...mockState.overview.pageState, page: 1, perPage: 20 },
                },
                overviewStatus: {
                  ...mockState.overviewStatus,
                  loaded: true,
                  loading: false,
                  allConfigs: fortyConfigs,
                  total: 40,
                },
              },
            },
            children
          ),
      });

      tickRefresh(rerender);

      expect(dispatchMockFn).toHaveBeenCalledWith(
        expect.objectContaining({
          type: quietFetchOverviewStatusAction.get.type,
          payload: expect.objectContaining({
            silent: true,
            pageState: expect.objectContaining({ page: 1, perPage: 40 }),
          }),
        })
      );
    });

    it('clamps whole-window refresh perPage to the route max', () => {
      const loadedCount = OVERVIEW_STATUS_MAX_PER_PAGE + 40;
      const loadedConfigs = Array.from({ length: loadedCount }, (_, i) => stubConfig(`m${i}`));

      const { rerender } = renderHook(() => useOverviewStatus({ scopeStatusByLocation: true }), {
        wrapper: ({ children }) =>
          React.createElement(
            WrappedHelper,
            {
              state: {
                overview: {
                  ...mockState.overview,
                  view: 'cardView',
                  pageState: { ...mockState.overview.pageState, page: 1, perPage: 20 },
                },
                overviewStatus: {
                  ...mockState.overviewStatus,
                  loaded: true,
                  loading: false,
                  allConfigs: loadedConfigs,
                  total: loadedCount,
                },
              },
            },
            children
          ),
      });

      tickRefresh(rerender);

      expect(dispatchMockFn).toHaveBeenCalledWith(
        expect.objectContaining({
          type: quietFetchOverviewStatusAction.get.type,
          payload: expect.objectContaining({
            silent: true,
            refreshThrough: loadedCount,
            pageState: expect.objectContaining({
              page: 1,
              perPage: OVERVIEW_STATUS_MAX_PER_PAGE,
            }),
          }),
        })
      );
    });

    it('does not start a timer refresh while a clamped window remainder is in flight', () => {
      const { rerender } = renderHook(() => useOverviewStatus({ scopeStatusByLocation: true }), {
        wrapper: ({ children }) =>
          React.createElement(
            WrappedHelper,
            {
              state: {
                overview: {
                  ...mockState.overview,
                  view: 'cardView',
                  pageState: { ...mockState.overview.pageState, page: 1, perPage: 20 },
                },
                overviewStatus: {
                  ...mockState.overviewStatus,
                  loaded: true,
                  loading: false,
                  refreshThrough: 540,
                  allConfigs: fortyConfigs,
                  total: 540,
                },
              },
            },
            children
          ),
      });

      tickRefresh(rerender);

      expect(dispatchMockFn).not.toHaveBeenCalledWith(
        expect.objectContaining({
          type: quietFetchOverviewStatusAction.get.type,
          payload: expect.objectContaining({ silent: true }),
        })
      );
    });

    it('requests a max-page fill when group-by is active', () => {
      renderHook(() => useOverviewStatus({ scopeStatusByLocation: true }), {
        wrapper: ({ children }) =>
          React.createElement(
            WrappedHelper,
            {
              state: {
                overview: {
                  ...mockState.overview,
                  groupBy: { field: 'locationId', order: 'asc' },
                },
              },
            },
            children
          ),
      });

      expect(dispatchMockFn).toHaveBeenCalledWith(
        expect.objectContaining({
          type: fetchOverviewStatusAction.get.type,
          payload: expect.objectContaining({
            fillAll: true,
            pageState: expect.objectContaining({
              page: 1,
              perPage: OVERVIEW_STATUS_MAX_PER_PAGE,
            }),
          }),
        })
      );
    });
  });
});
