/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { renderHook, act } from '@testing-library/react';
import { TestProviders } from '../../../mock';
import { useHostRelatedUsers } from '.';
import { useSearchStrategy } from '../../use_search_strategy';

vi.mock('../../use_search_strategy', () => {
      const mocked = {
      useSearchStrategy: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

const mockUseSearchStrategy = useSearchStrategy as Mock;
const mockSearch = vi.fn();

const defaultProps = {
  hostName: 'host1',
  indexNames: ['index-*'],
  from: '2020-07-07T08:20:18.966Z',
  skip: false,
};

const mockResult = {
  inspect: {},
  totalCount: 1,
  relatedUsers: [{ user: 'test user', ip: '100.000.XX' }],
  refetch: vi.fn(),
  loading: false,
};

describe('useHostRelatedUsers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSearchStrategy.mockReturnValue({
      loading: false,
      result: {
        totalCount: mockResult.totalCount,
        relatedUsers: mockResult.relatedUsers,
      },
      search: mockSearch,
      refetch: vi.fn(),
      inspect: {},
    });
  });

  it('runs search', () => {
    const { result } = renderHook(() => useHostRelatedUsers(defaultProps), {
      wrapper: TestProviders,
    });

    expect(mockSearch).toHaveBeenCalled();
    expect(JSON.stringify(result.current)).toEqual(JSON.stringify(mockResult)); // serialize result for array comparison
  });

  it('does not run search when skip = true', () => {
    const props = {
      ...defaultProps,
      skip: true,
    };
    renderHook(() => useHostRelatedUsers(props), {
      wrapper: TestProviders,
    });

    expect(mockSearch).not.toHaveBeenCalled();
  });

  it('does not run search when hostName is missing', () => {
    const { indexNames, from, skip } = defaultProps;
    renderHook(() => useHostRelatedUsers({ indexNames, from, skip }), {
      wrapper: TestProviders,
    });

    expect(mockSearch).not.toHaveBeenCalled();
  });
  it('skip = true will cancel any running request', () => {
    const props = {
      ...defaultProps,
    };
    const { rerender } = renderHook(() => useHostRelatedUsers(props), {
      wrapper: TestProviders,
    });
    props.skip = true;
    act(() => rerender());
    expect(mockUseSearchStrategy).toHaveBeenCalledTimes(2);
    expect(mockUseSearchStrategy.mock.calls[1][0].abort).toEqual(true);
  });
});
