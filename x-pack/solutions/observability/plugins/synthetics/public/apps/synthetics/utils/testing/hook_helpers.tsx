/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PropsWithChildren } from 'react';
import React, { useMemo } from 'react';
import { Route, Router } from '@kbn/shared-ux-router';
import type { History } from 'history';
import { createMemoryHistory } from 'history';
import { mergeWith } from 'lodash';
import { mockState } from './__mocks__/synthetics_store.mock';
import { MountWithReduxProvider } from './helper_with_redux';
import type { AppState } from '../../state';
import { stringifyUrlParams } from '../url_params';

/*
 * Lightweight counterparts of the helpers in `rtl_helpers`. They only provide a router and a mock
 * Redux store, and deliberately avoid importing the Kibana, data, charts and triggers-actions-ui
 * mocks, so a suite that imports from this file does not pay for them. Use them for hooks and
 * components that don't read from the Kibana context, the query client or the EUI theme.
 */

export type DeepPartial<T> = {
  [P in keyof T]?: DeepPartial<T[P]>;
};

export type Url =
  | string
  | {
      path: string;
      queryParams: Record<string, string | number>;
    };

export interface HookWrapperProps {
  history?: History;
  path?: string;
  state?: Partial<AppState> | DeepPartial<AppState>;
  url?: Url;
}

export const getHistoryFromUrl = (url: Url) => {
  if (typeof url === 'string') {
    return createMemoryHistory({
      initialEntries: [url],
    });
  }

  return createMemoryHistory({
    initialEntries: [url.path + stringifyUrlParams(url.queryParams)],
  });
};

export const mergeTestState = (state?: Partial<AppState> | DeepPartial<AppState>): AppState =>
  state
    ? mergeWith({}, mockState, state, (objValue, srcValue) => {
        if (Array.isArray(objValue)) {
          return srcValue;
        }
      })
    : mockState;

/** Router + mock Redux store only. Usable directly as a `renderHook` `wrapper`. */
export const HookWrapper = ({
  children,
  history,
  path,
  state,
  url,
}: PropsWithChildren<HookWrapperProps>) => {
  const testState = useMemo(() => mergeTestState(state), [state]);
  const routerHistory = useMemo(
    () => (url ? getHistoryFromUrl(url) : history ?? createMemoryHistory()),
    [url, history]
  );

  return (
    <MountWithReduxProvider state={testState}>
      <Router history={routerHistory}>
        <Route path={path}>{children}</Route>
      </Router>
    </MountWithReduxProvider>
  );
};
