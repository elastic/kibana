/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { renderHook } from '@testing-library/react';
import { useFilters } from './use_filters';
import { useDispatch } from 'react-redux';
import { WrappedHelper } from '../../../../utils/testing';
import { fetchMonitorFiltersAction } from '../../../../state';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: jest.fn().mockReturnValue(jest.fn()),
}));

describe('useMonitorListFilters', () => {
  jest.useFakeTimers();

  it('returns expected results', () => {
    const { result } = renderHook(() => useFilters(), {
      wrapper: ({ children }: React.PropsWithChildren) => (
        <WrappedHelper>{React.createElement(React.Fragment, {}, children)}</WrappedHelper>
      ),
    });

    expect(result.current).toStrictEqual({
      locations: [],
      tags: [],
      monitorTypes: [],
      projects: [],
      schedules: [],
    });
  });

  it('dispatches action when filters are null', () => {
    const Wrapper = ({ children }: React.PropsWithChildren) => {
      return (
        <WrappedHelper
          state={{
            monitorList: {
              monitorFilterOptions: null,
            },
          }}
        >
          {React.createElement(React.Fragment, null, children)}
        </WrappedHelper>
      );
    };
    const spy = jest.fn();
    // @ts-ignore
    useDispatch.mockReturnValue(spy);
    const { result } = renderHook(() => useFilters(), { wrapper: Wrapper });

    expect(result.current).toStrictEqual(null);
    expect(spy).toBeCalledWith(fetchMonitorFiltersAction.get({}));
  });

  it('picks up results from filters selector', () => {
    const filters = {
      locations: [
        {
          label: 'North America',
          count: 1,
        },
      ],
      tags: [],
      monitorTypes: [{ label: 'http', count: 1 }],
      projects: [],
      schedules: [],
    };
    const Wrapper = ({ children }: React.PropsWithChildren) => {
      return (
        <WrappedHelper
          state={{
            monitorList: {
              monitorFilterOptions: filters,
            },
          }}
        >
          {React.createElement(React.Fragment, null, children)}
        </WrappedHelper>
      );
    };
    const spy = jest.fn();
    // @ts-ignore
    useDispatch.mockReturnValue(spy);
    const { result } = renderHook(() => useFilters(), { wrapper: Wrapper });

    expect(result.current).toStrictEqual(filters);
    expect(spy).toBeCalledWith(fetchMonitorFiltersAction.get({}));
  });
});
