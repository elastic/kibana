/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { FETCH_STATUS, useFetcher } from '@kbn/observability-shared-plugin/public';
import { SYNTHETICS_API_URLS } from '../../../../../../common/constants';
import { apiService } from '../../../../../utils/api_service/api_service';
import { useUrlSpaceId } from '../../../hooks/use_url_space_id';
import { useOutdatedMwAgentLocationIds } from './use_outdated_mw_agent_locations';

jest.mock('@kbn/observability-shared-plugin/public', () => ({
  FETCH_STATUS: jest.requireActual('@kbn/observability-shared-plugin/public').FETCH_STATUS,
  useFetcher: jest.fn(),
}));

jest.mock('../../../hooks/use_url_space_id', () => ({
  useUrlSpaceId: jest.fn(),
}));

jest.mock('../../../contexts', () => ({
  useSyntheticsRefreshContext: () => ({ lastRefresh: 0 }),
}));

jest.mock('../../../../../utils/api_service/api_service', () => ({
  apiService: { get: jest.fn() },
}));

const mockUseFetcher = useFetcher as jest.MockedFunction<typeof useFetcher>;
const mockUseUrlSpaceId = useUrlSpaceId as jest.MockedFunction<typeof useUrlSpaceId>;
const mockApiGet = apiService.get as jest.MockedFunction<typeof apiService.get>;

const setData = (outdatedLocationIds: string[] | undefined) => {
  mockUseFetcher.mockReturnValue({
    data: outdatedLocationIds == null ? undefined : { outdatedLocationIds },
    loading: false,
    status: FETCH_STATUS.SUCCESS,
    refetch: jest.fn(),
  });
};

describe('useOutdatedMwAgentLocationIds', () => {
  beforeEach(() => {
    mockUseUrlSpaceId.mockReturnValue(undefined);
  });

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

  it('fetches in the viewed monitor space and refetches when that space or lastRefresh changes', async () => {
    mockUseUrlSpaceId.mockReturnValue('team-a');
    setData([]);
    mockApiGet.mockResolvedValue({ outdatedLocationIds: [] });

    renderHook(() => useOutdatedMwAgentLocationIds());

    const [fetch, deps] = mockUseFetcher.mock.calls[0];
    expect(deps).toEqual([fetch, 0]);
    await fetch({ signal: new AbortController().signal });
    expect(mockApiGet).toHaveBeenCalledWith(
      SYNTHETICS_API_URLS.PRIVATE_LOCATION_OUTDATED_MW_AGENTS,
      { spaceId: 'team-a' }
    );
  });
});
