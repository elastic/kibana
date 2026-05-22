/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useSyntheticsDataViewIndexPatterns } from './use_synthetics_data_view_index_patterns';
import { SYNTHETICS_INDEX_PATTERN } from '../../../../../../common/constants';

const mockUrlParams = jest.fn();
jest.mock('../../../hooks', () => ({
  useGetUrlParams: () => mockUrlParams(),
}));

describe('useSyntheticsDataViewIndexPatterns', () => {
  afterEach(() => jest.clearAllMocks());

  it('returns the local synthetics index pattern when remoteName is absent', () => {
    mockUrlParams.mockReturnValue({});

    const { result } = renderHook(() => useSyntheticsDataViewIndexPatterns());

    expect(result.current).toEqual({ synthetics: SYNTHETICS_INDEX_PATTERN });
  });

  it('returns a CCS-prefixed pattern when remoteName is present', () => {
    mockUrlParams.mockReturnValue({ remoteName: 'remote-a' });

    const { result } = renderHook(() => useSyntheticsDataViewIndexPatterns());

    expect(result.current).toEqual({ synthetics: `remote-a:${SYNTHETICS_INDEX_PATTERN}` });
  });

  it('returns a referentially stable object across renders for the same remoteName', () => {
    mockUrlParams.mockReturnValue({ remoteName: 'remote-a' });

    const { result, rerender } = renderHook(() => useSyntheticsDataViewIndexPatterns());
    const first = result.current;
    rerender();

    expect(result.current).toBe(first);
  });

  it('returns a new object when remoteName changes', () => {
    mockUrlParams.mockReturnValue({});

    const { result, rerender } = renderHook(() => useSyntheticsDataViewIndexPatterns());
    const first = result.current;

    mockUrlParams.mockReturnValue({ remoteName: 'remote-b' });
    rerender();

    expect(result.current).not.toBe(first);
    expect(result.current).toEqual({ synthetics: `remote-b:${SYNTHETICS_INDEX_PATTERN}` });
  });
});
