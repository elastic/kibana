/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { MockedFunction } from 'vitest';

import { renderHook } from '@testing-library/react';
import { FETCH_STATUS, useFetcher } from '@kbn/observability-shared-plugin/public';
import { SYNTHETICS_API_URLS } from '../../../../../../common/constants';
import { apiService } from '../../../../../utils/api_service/api_service';
import { useUrlSpaceId } from '../../../hooks/use_url_space_id';
import { useOutdatedMwAgentLocationIds } from './use_outdated_mw_agent_locations';

vi.mock('@kbn/observability-shared-plugin/public', async () => {
  const mocked = {
    FETCH_STATUS: (await vi.importActual('@kbn/observability-shared-plugin/public')).FETCH_STATUS,
    useFetcher: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../hooks/use_url_space_id', () => {
  const mocked = {
    useUrlSpaceId: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../contexts', () => {
  const mocked = {
    useSyntheticsRefreshContext: () => ({ lastRefresh: 0 }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../../../utils/api_service/api_service', () => {
  const mocked = {
    apiService: { get: vi.fn() },
  };
  return { ...mocked, default: mocked };
});

const mockUseFetcher = useFetcher as MockedFunction<typeof useFetcher>;
const mockUseUrlSpaceId = useUrlSpaceId as MockedFunction<typeof useUrlSpaceId>;
const mockApiGet = apiService.get as MockedFunction<typeof apiService.get>;

const setData = (outdatedLocationIds: string[] | undefined) => {
  mockUseFetcher.mockReturnValue({
    data: outdatedLocationIds == null ? undefined : { outdatedLocationIds },
    loading: false,
    status: FETCH_STATUS.SUCCESS,
    refetch: vi.fn(),
  });
};

describe('useOutdatedMwAgentLocationIds', () => {
  beforeEach(() => {
    mockUseUrlSpaceId.mockReturnValue(undefined);
  });

  afterEach(() => vi.clearAllMocks());

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
