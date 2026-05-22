/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook } from '@testing-library/react';
import * as redux from 'react-redux';
import { MONITOR_ROUTE } from '../../../../../../common/constants';
import { mockState } from '../../../utils/testing/__mocks__/synthetics_store.mock';
import { WrappedHelper } from '../../../utils/testing';
import type { SyntheticsAppState } from '../../../state/root_reducer';
import type { MonitorFilterState } from '../../../state';
import {
  fetchMonitorListAction,
  quietFetchMonitorListAction,
  selectEncryptedSyntheticsSavedMonitors,
  updateManagementPageStateAction,
} from '../../../state';

import { useMonitorList } from './use_monitor_list';

describe('useMonitorList', () => {
  let state: SyntheticsAppState;
  let initialState: Omit<ReturnType<typeof useMonitorList>, 'loadPage' | 'reloadPage'>;
  let filterState: MonitorFilterState;
  let filterStateWithQuery: MonitorFilterState & { query?: string | undefined };
  const dispatchMockFn = jest.fn();

  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(redux, 'useDispatch').mockReturnValue(dispatchMockFn);

    state = mockState;
    initialState = {
      loading: false,
      loaded: false,
      total: state.monitorList.data.total ?? 0,
      error: state.monitorList.error,
      absoluteTotal: state.monitorList.data.absoluteTotal ?? 0,
      pageState: state.monitorList.pageState,
      syntheticsMonitors: selectEncryptedSyntheticsSavedMonitors.resultFunc(state.monitorList),
      handleFilterChange: jest.fn(),
    };

    filterState = {
      locations: [],
      monitorTypes: [],
      projects: [],
      schedules: [],
      tags: [],
      useLogicalAndFor: [],
    };
    filterStateWithQuery = { ...filterState, query: 'xyz' };
  });

  it('returns expected initial state', () => {
    const {
      result: { current: hookResult },
    } = renderHook(() => useMonitorList(), {
      wrapper: ({ children }) => React.createElement(WrappedHelper, null, children),
    });

    expect(hookResult).toMatchObject({ ...initialState, handleFilterChange: expect.any(Function) });
  });

  it('dispatches correct action for query url param', () => {
    const query = 'xyz';
    const url = `/monitor/1?query=${query}`;

    const WrapperWithState = ({ children }: React.PropsWithChildren) => {
      return (
        <WrappedHelper url={url} path={MONITOR_ROUTE}>
          {React.createElement(React.Fragment, {}, children)}
        </WrappedHelper>
      );
    };

    renderHook(() => useMonitorList(), { wrapper: WrapperWithState });

    expect(dispatchMockFn).toHaveBeenCalledWith(
      updateManagementPageStateAction(filterStateWithQuery)
    );
  });

  it('dispatches correct action for filter url param', () => {
    const exp = {
      ...filterStateWithQuery,
      tags: ['abc', 'xyz'],
      locations: ['loc1', 'loc1'],
      monitorTypes: ['browser'],
      schedules: ['browser'],
      projects: ['proj-1'],
      query: '',
    };

    const url = `/monitor/1?tags=${JSON.stringify(exp.tags)}&locations=${JSON.stringify(
      exp.locations
    )}&monitorTypes=${JSON.stringify(exp.monitorTypes)}&schedules=${JSON.stringify(
      exp.schedules
    )}&projects=${JSON.stringify(exp.projects)}`;

    const WrapperWithState = ({ children }: React.PropsWithChildren) => {
      return (
        <WrappedHelper url={url} path={MONITOR_ROUTE}>
          {React.createElement(React.Fragment, {}, children)}
        </WrappedHelper>
      );
    };

    renderHook(() => useMonitorList(), { wrapper: WrapperWithState });

    expect(dispatchMockFn).toHaveBeenCalledWith(updateManagementPageStateAction(exp));
  });

  describe('initial mount fetch', () => {
    it('dispatches `fetchMonitorListAction.get` on initial mount when not yet loaded', () => {
      renderHook(() => useMonitorList(), {
        wrapper: ({ children }) => React.createElement(WrappedHelper, null, children),
      });

      expect(dispatchMockFn).toHaveBeenCalledWith(
        expect.objectContaining({
          type: fetchMonitorListAction.get.type,
          payload: state.monitorList.pageState,
        })
      );
    });

    it('dispatches `quietFetchMonitorListAction` on initial mount when already loaded', () => {
      renderHook(() => useMonitorList(), {
        wrapper: ({ children }) =>
          React.createElement(
            WrappedHelper,
            { state: { monitorList: { ...state.monitorList, loaded: true } } },
            children
          ),
      });

      expect(dispatchMockFn).toHaveBeenCalledWith(
        quietFetchMonitorListAction(state.monitorList.pageState)
      );
      expect(dispatchMockFn).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: fetchMonitorListAction.get.type })
      );
    });

    it('dispatches the initial fetch exactly once on mount', () => {
      renderHook(() => useMonitorList(), {
        wrapper: ({ children }) => React.createElement(WrappedHelper, null, children),
      });

      const initialFetchCalls = dispatchMockFn.mock.calls.filter(
        ([action]) =>
          action?.type === fetchMonitorListAction.get.type ||
          action?.type === quietFetchMonitorListAction.type
      );
      expect(initialFetchCalls).toHaveLength(1);
    });
  });
});
