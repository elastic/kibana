/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook } from '@testing-library/react';
import * as redux from 'react-redux';
import { mockState } from '../../../utils/testing/__mocks__/synthetics_store.mock';
import { WrappedHelper } from '../../../utils/testing';
import {
  fetchOverviewStatusAction,
  quietFetchOverviewStatusAction,
} from '../../../state/overview_status';
import { useOverviewStatus } from './use_overview_status';

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
  });
});
