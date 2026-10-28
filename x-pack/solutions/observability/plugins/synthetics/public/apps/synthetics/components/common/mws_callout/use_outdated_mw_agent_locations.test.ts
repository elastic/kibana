/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { FETCH_STATUS, useFetcher } from '@kbn/observability-shared-plugin/public';
import { useOutdatedMwAgentLocationIds } from './use_outdated_mw_agent_locations';

jest.mock('@kbn/observability-shared-plugin/public', () => ({
  FETCH_STATUS: jest.requireActual('@kbn/observability-shared-plugin/public').FETCH_STATUS,
  useFetcher: jest.fn(),
}));

jest.mock('../../../contexts', () => ({
  useSyntheticsRefreshContext: () => ({ lastRefresh: 1 }),
}));

const mockUseFetcher = useFetcher as jest.MockedFunction<typeof useFetcher>;

const setData = (outdatedLocationIds: string[] | undefined) => {
  mockUseFetcher.mockReturnValue({
    data: outdatedLocationIds == null ? undefined : { outdatedLocationIds },
    loading: false,
    status: FETCH_STATUS.SUCCESS,
    refetch: jest.fn(),
  });
};

describe('useOutdatedMwAgentLocationIds', () => {
  afterEach(() => jest.clearAllMocks());

  it('returns an empty set while the request has not resolved', () => {
    setData(undefined);

    const { result } = renderHook(() => useOutdatedMwAgentLocationIds());

    expect(result.current.outdatedLocationIds.size).toBe(0);
  });

  it('maps response ids onto a set', () => {
    setData(['loc-outdated']);

    const { result } = renderHook(() => useOutdatedMwAgentLocationIds());

    expect(result.current.outdatedLocationIds.has('loc-outdated')).toBe(true);
    expect(result.current.outdatedLocationIds.has('loc-ok')).toBe(false);
  });
});
