/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import DateMath from '@kbn/datemath';
import userEvent from '@testing-library/user-event';
import { render as rtlRender } from '@testing-library/react';
import { Router } from '@kbn/shared-ux-router';
import { createMemoryHistory } from 'history';
import React, { useState, Fragment, type ReactElement } from 'react';
import type { SyntheticsUrlParamsHook } from './use_url_params';
import { useUrlParams } from './use_url_params';

// The hook only needs a router, so a bare Router avoids mounting the full Synthetics app shell the shared `render` helper sets up per test.
const render = (ui: ReactElement) => {
  const history = createMemoryHistory();
  return { ...rtlRender(<Router history={history}>{ui}</Router>), history };
};

interface MockUrlParamsComponentProps {
  hook: SyntheticsUrlParamsHook;
  updateParams?: { [key: string]: any } | null;
}

const UseUrlParamsTestComponent = ({
  hook,
  updateParams = { dateRangeStart: 'now-12d', dateRangeEnd: 'now' },
}: MockUrlParamsComponentProps) => {
  const [params, setParams] = useState({});
  const [getUrlParams, updateUrlParams] = hook();
  const queryParams = getUrlParams();
  return (
    <Fragment>
      {Object.keys(params).length > 0 ? <div>{JSON.stringify(params)}</div> : null}
      <button
        id="setUrlParams"
        onClick={() => {
          updateUrlParams(updateParams as any);
        }}
      >
        Set url params
      </button>
      <button id="getUrlParams" onClick={() => setParams(queryParams)}>
        Get url params
      </button>
    </Fragment>
  );
};

describe('useUrlParams', () => {
  let dateMathSpy: any;
  const MOCK_DATE_VALUE = 20;

  beforeEach(() => {
    dateMathSpy = jest.spyOn(DateMath, 'parse');
    dateMathSpy.mockReturnValue(MOCK_DATE_VALUE);
  });

  it('accepts router props, updates URL params, and returns the current params', async () => {
    const { findByText, history } = render(<UseUrlParamsTestComponent hook={useUrlParams} />);

    const pushSpy = jest.spyOn(history, 'push');

    const setUrlParamsButton = await findByText('Set url params');
    await userEvent.click(setUrlParamsButton);
    expect(pushSpy).toHaveBeenCalledWith({
      pathname: '/',
      search: 'dateRangeEnd=now&dateRangeStart=now-12d',
    });
    pushSpy.mockClear();
  });

  it('clears search when null is passed to params', async () => {
    const { findByText, history } = render(
      <UseUrlParamsTestComponent hook={useUrlParams} updateParams={null} />
    );

    const pushSpy = jest.spyOn(history, 'push');

    const setUrlParamsButton = await findByText('Set url params');
    await userEvent.click(setUrlParamsButton);
    expect(pushSpy).toHaveBeenCalledWith({
      pathname: '/',
      search: undefined,
    });
    pushSpy.mockClear();
  });
});
