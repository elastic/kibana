/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import type { MemoryHistory } from 'history';
import { Router } from '@kbn/shared-ux-router';
import { useResolverQueryParamCleaner } from './use_resolver_query_params_cleaner';
import { parameterName } from '../store/parameter_name';

jest.mock('react-redux-v7', () => ({
  ...jest.requireActual('react-redux-v7'),
  useDispatch: () => jest.fn(),
}));

describe('useResolverQueryParamCleaner', () => {
  const id = 'test-instance';
  const resolverKey = parameterName(id);

  const renderCleaner = (history: MemoryHistory) => {
    const wrapper: React.FC<{ children?: React.ReactNode }> = ({ children }) =>
      React.createElement(Router, { history }, children as React.ReactElement);
    return renderHook(() => useResolverQueryParamCleaner(id), { wrapper });
  };

  it('removes its own resolver key on unmount and preserves other params', () => {
    const history = createMemoryHistory({ initialEntries: [`/?${resolverKey}=foo&other=keep`] });
    const { unmount } = renderCleaner(history);

    unmount();

    const params = new URLSearchParams(history.location.search);
    expect(params.get(resolverKey)).toBeNull();
    expect(params.get('other')).toBe('keep');
  });

  it('reads the CURRENT url at cleanup — does not resurrect a param cleared after mount', () => {
    // Regression: the cleaner used to replay a search snapshot captured during render. If another
    // writer (e.g. the flyout_v2 URL sync clearing its param on close) changed the url after this
    // hook's last render, unmounting the resolver resurrected that param. It must instead read the
    // live url and only delete its own key.
    const history = createMemoryHistory({
      initialEntries: [`/?${resolverKey}=foo&flyoutV2=analyzer`],
    });
    const { unmount } = renderCleaner(history);

    // Simulate the flyout URL sync clearing flyoutV2 after this hook mounted.
    history.replace({ search: `${resolverKey}=foo` });

    unmount();

    const params = new URLSearchParams(history.location.search);
    expect(params.get(resolverKey)).toBeNull(); // own key removed
    expect(params.get('flyoutV2')).toBeNull(); // NOT resurrected from a stale snapshot
  });
});
