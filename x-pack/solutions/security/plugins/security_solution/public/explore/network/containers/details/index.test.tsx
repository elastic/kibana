/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { renderHook, act } from '@testing-library/react';
import { TestProviders } from '../../../../common/mock';
import { ID, useNetworkDetails } from '.';
import { useSearchStrategy } from '../../../../common/containers/use_search_strategy';

vi.mock('../../../../common/containers/use_search_strategy', () => {
      const mocked = {
      useSearchStrategy: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });
const mockUseSearchStrategy = useSearchStrategy as Mock;
const mockSearch = vi.fn();

const defaultProps = {
  id: ID,
  indexNames: ['fakebeat-*'],
  ip: '192.168.1.1',
  skip: false,
};

describe('useNetworkDetails', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSearchStrategy.mockReturnValue({
      loading: false,
      result: {
        networkDetails: {},
      },
      search: mockSearch,
      refetch: vi.fn(),
      inspect: {},
    });
  });

  it('runs search', () => {
    renderHook(() => useNetworkDetails(defaultProps), {
      wrapper: TestProviders,
    });

    expect(mockSearch).toHaveBeenCalled();
  });

  it('does not run search when skip = true', () => {
    const props = {
      ...defaultProps,
      skip: true,
    };
    renderHook(() => useNetworkDetails(props), {
      wrapper: TestProviders,
    });

    expect(mockSearch).not.toHaveBeenCalled();
  });
  it('skip = true will cancel any running request', () => {
    const props = {
      ...defaultProps,
    };
    const { rerender } = renderHook(() => useNetworkDetails(props), {
      wrapper: TestProviders,
    });
    props.skip = true;
    act(() => rerender());
    expect(mockUseSearchStrategy).toHaveBeenCalledTimes(2);
    expect(mockUseSearchStrategy.mock.calls[1][0].abort).toEqual(true);
  });
});
