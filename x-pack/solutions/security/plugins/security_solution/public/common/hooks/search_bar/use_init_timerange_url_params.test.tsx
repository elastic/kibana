/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useInitTimerangeFromUrlParam } from './use_init_timerange_url_params';
import * as redux from 'react-redux';
import * as experimentalFeatures from '../use_experimental_features';
import * as globalQueryString from '../../utils/global_query_string';
import { TestProviders } from '../../mock';
import { useKibana } from '../../lib/kibana';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: jest.fn(),
}));
jest.mock('../../lib/kibana');
jest.mock('../use_experimental_features', () => ({ useIsExperimentalFeatureEnabled: jest.fn() }));
jest.mock('../../utils/global_query_string', () => ({ useInitializeUrlParam: jest.fn() }));

describe('useInitTimerangeFromUrlParam', () => {
  const dispatch = jest.fn();
  beforeEach(() => {
    jest.clearAllMocks();
    (redux.useDispatch as jest.Mock).mockReturnValue(dispatch);
    (experimentalFeatures.useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(false);
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        serverless: {},
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
  });

  it('should call useInitializeUrlParam with correct params', () => {
    renderHook(() => useInitTimerangeFromUrlParam(), {
      wrapper: TestProviders,
    });
    expect(globalQueryString.useInitializeUrlParam).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Function)
    );
  });

  it('should call dispatch 2 times on init url params when not serverless', () => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {},
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    renderHook(() => useInitTimerangeFromUrlParam(), {
      wrapper: TestProviders,
    });
    const callback = (globalQueryString.useInitializeUrlParam as jest.Mock).mock.calls[0][1];
    callback({ valueReport: { timerange: { kind: 'absolute' } } });
    expect(dispatch).toHaveBeenCalledTimes(2);
  });

  it('should call dispatch 3 times on init url params when serverless and valueReport exists', () => {
    renderHook(() => useInitTimerangeFromUrlParam(), {
      wrapper: TestProviders,
    });
    const callback = (globalQueryString.useInitializeUrlParam as jest.Mock).mock.calls[0][1];
    callback({ valueReport: { timerange: { kind: 'absolute' } } });
    expect(dispatch).toHaveBeenCalledTimes(3);
  });

  it('should call dispatch 6 times on init url params when serverless, valueReport exists, and isSocTrendsEnabled=true', () => {
    (experimentalFeatures.useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(true);
    renderHook(() => useInitTimerangeFromUrlParam(), {
      wrapper: TestProviders,
    });
    // Extract the callback passed to useInitializeUrlParam
    const callback = (globalQueryString.useInitializeUrlParam as jest.Mock).mock.calls[0][1];
    // Call the callback with a mock state
    callback({
      valueReport: { timerange: { kind: 'absolute' } },
      socTrends: { timerange: { kind: 'absolute' } },
    });
    // No assertion here, but you could spy on internal helpers if exported
    expect(experimentalFeatures.useIsExperimentalFeatureEnabled).toHaveBeenCalledWith(
      'socTrendsEnabled'
    );
    expect(dispatch).toHaveBeenCalledTimes(6);
  });

  it('should not throw if initialState is null', () => {
    renderHook(() => useInitTimerangeFromUrlParam(), {
      wrapper: TestProviders,
    });
    const callback = (globalQueryString.useInitializeUrlParam as jest.Mock).mock.calls[0][1];
    expect(() => callback(null)).not.toThrow();
  });

  it('should dispatch setAbsoluteRangeDatePicker for valueReportType absolute', () => {
    const initialState = {
      valueReport: {
        timerange: {
          kind: 'absolute',
          from: 1,
          to: 2,
          fromStr: 'now-1d',
          toStr: 'now',
        },
      },
    };
    (globalQueryString.useInitializeUrlParam as jest.Mock).mockImplementation((_, cb) =>
      cb(initialState)
    );
    renderHook(() => useInitTimerangeFromUrlParam(), {
      wrapper: TestProviders,
    });
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: expect.stringContaining(
          'x-pack/security_solution/local/inputs/SET_ABSOLUTE_RANGE_DATE_PICKER'
        ),
        payload: expect.objectContaining({ id: 'valueReport' }),
      })
    );
  });

  it('should dispatch setRelativeRangeDatePicker for valueReportType relative', () => {
    const initialState = {
      valueReport: {
        timerange: {
          kind: 'relative',
          from: 1,
          to: 2,
          fromStr: 'now-7d',
          toStr: 'now',
        },
      },
    };
    (globalQueryString.useInitializeUrlParam as jest.Mock).mockImplementation((_, cb) =>
      cb(initialState)
    );
    renderHook(() => useInitTimerangeFromUrlParam(), {
      wrapper: TestProviders,
    });
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: expect.stringContaining(
          'x-pack/security_solution/local/inputs/SET_RELATIVE_RANGE_DATE_PICKER'
        ),
        payload: expect.objectContaining({ id: 'valueReport' }),
      })
    );
  });
});
