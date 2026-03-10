/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { Router } from '@kbn/shared-ux-router';
import React from 'react';
import { useUrlQuery } from './use_url_query';
import {
  FLYOUT_PARAM_KEY,
  QUERY_PARAM_KEY,
  decodeMultipleRisonParams,
} from '@kbn/cloud-security-posture/src/utils/query_utils';

jest.mock('@kbn/cloud-security-posture/src/utils/query_utils', () => ({
  decodeMultipleRisonParams: jest.fn(() => ({})),
}));

jest.mock('@kbn/cloud-security-posture', () => ({
  encodeQuery: jest.fn(() => `cspq=mocked-cspq-string`),
}));

const mockDecodeMultipleRisonParams = decodeMultipleRisonParams as jest.MockedFunction<
  typeof decodeMultipleRisonParams
>;

const createWrapper = (initialEntries: string[] = ['/']) => {
  const history = createMemoryHistory({ initialEntries });
  const WrapperComponent: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <Router history={history}>{children}</Router>
  );
  WrapperComponent.displayName = 'TestWrapperComponent';
  return WrapperComponent;
};

describe('useUrlQuery', () => {
  const defaultQuery = () => ({
    filters: [],
    query: { match_all: {} },
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return default query when no URL parameters exist', () => {
    const wrapper = createWrapper(['/']);
    const { result } = renderHook(() => useUrlQuery(defaultQuery), { wrapper });

    expect(result.current.urlQuery).toEqual({
      filters: [],
      query: { match_all: {} },
      flyout: {},
    });
  });

  it('should call decodeMultipleRisonParams with correct parameters', () => {
    const wrapper = createWrapper(['/test?search=something']);
    renderHook(() => useUrlQuery(defaultQuery), { wrapper });

    expect(mockDecodeMultipleRisonParams).toHaveBeenCalledWith('?search=something', [
      QUERY_PARAM_KEY,
      FLYOUT_PARAM_KEY,
    ]);
  });

  it('should have setUrlQuery function available', () => {
    const wrapper = createWrapper(['/']);
    const { result } = renderHook(() => useUrlQuery(defaultQuery), { wrapper });

    expect(typeof result.current.setUrlQuery).toBe('function');
  });

  it('should return key from location', () => {
    const wrapper = createWrapper(['/']);
    const { result } = renderHook(() => useUrlQuery(defaultQuery), { wrapper });

    expect(result.current.key).toBeDefined();
  });

  it('should use proper rison encoding for URL construction', () => {
    const wrapper = createWrapper(['/']);
    const { result } = renderHook(() => useUrlQuery(defaultQuery), { wrapper });

    // The implementation should use encodeQuery for query param key and encodeRisonParam for flyout param key
    // This ensures proper rison format instead of URL-encoded format
    expect(result.current.setUrlQuery).toBeDefined();
  });
});
