/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { act, renderHook } from '@testing-library/react-hooks';
import { TestProviders } from '../../../mock';
import { useUserRelatedHosts } from '.';
import { useSearchStrategy } from '../../use_search_strategy';

jest.mock('../../use_search_strategy', () => ({
  useSearchStrategy: jest.fn(),
}));

const mockUseSearchStrategy = useSearchStrategy as jest.Mock;
const mockSearch = jest.fn();

const defaultProps = {
  userName: 'user1',
  indexNames: ['index-*'],
  from: '2020-07-07T08:20:18.966Z',
  skip: false,
};

const mockResult = {
  inspect: {},
  totalCount: 1,
  relatedHosts: [{ host: 'test host', ip: '100.000.XX' }],
  loading: false,
  refetch: jest.fn(),
};

describe('useUsersRelatedHosts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSearchStrategy.mockReturnValue({
      loading: false,
      result: {
        totalCount: mockResult.totalCount,
        relatedHosts: mockResult.relatedHosts,
      },
      search: mockSearch,
      refetch: jest.fn(),
      inspect: {},
    });
  });

  it('runs search', () => {
    const { result } = renderHook(() => useUserRelatedHosts(defaultProps), {
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
    renderHook(() => useUserRelatedHosts(props), {
      wrapper: TestProviders,
    });

    expect(mockSearch).not.toHaveBeenCalled();
  });
  it('skip = true will cancel any running request', () => {
    const props = {
      ...defaultProps,
    };
    const { rerender } = renderHook(() => useUserRelatedHosts(props), {
      wrapper: TestProviders,
    });
    props.skip = true;
    act(() => rerender());
    expect(mockUseSearchStrategy).toHaveBeenCalledTimes(2);
    expect(mockUseSearchStrategy.mock.calls[1][0].abort).toEqual(true);
  });
});
