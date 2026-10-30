/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import DateMath from '@kbn/datemath';
import { Router } from '@kbn/shared-ux-router';
import { act, renderHook } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import React from 'react';
import { useUrlParams } from './use_url_params';

const renderUseUrlParams = () => {
  const history = createMemoryHistory();

  const { result } = renderHook(
    () => {
      const [getUrlParams, updateUrlParams] = useUrlParams();
      return { urlParams: getUrlParams(), updateUrlParams };
    },
    {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <Router history={history}>{children}</Router>
      ),
    }
  );

  return { history, result };
};

describe('useUrlParams', () => {
  let dateMathSpy: any;
  const MOCK_DATE_VALUE = 20;

  beforeEach(() => {
    dateMathSpy = jest.spyOn(DateMath, 'parse');
    dateMathSpy.mockReturnValue(MOCK_DATE_VALUE);
  });

  it('accepts router props, updates URL params, and returns the current params', () => {
    const { history, result } = renderUseUrlParams();

    const pushSpy = jest.spyOn(history, 'push');

    act(() => {
      result.current.updateUrlParams({ dateRangeStart: 'now-12d', dateRangeEnd: 'now' });
    });

    expect(pushSpy).toHaveBeenCalledWith({
      pathname: '/',
      search: 'dateRangeEnd=now&dateRangeStart=now-12d',
    });
  });

  it('clears search when null is passed to params', () => {
    const { history, result } = renderUseUrlParams();

    const pushSpy = jest.spyOn(history, 'push');

    act(() => {
      result.current.updateUrlParams(null);
    });

    expect(pushSpy).toHaveBeenCalledWith({
      pathname: '/',
      search: undefined,
    });
  });
});
