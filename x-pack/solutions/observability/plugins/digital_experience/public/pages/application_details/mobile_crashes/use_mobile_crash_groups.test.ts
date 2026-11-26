/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useApiClient } from '../../../hooks/use_api_client';
import { useEnvironment } from '../../../hooks/use_environment';
import { useQueryParam } from '../../../hooks/use_query_param';
import { useTimeRange } from '../../../hooks/use_time_range';
import { useMobileCrashGroup } from './use_mobile_crash_group';
import { useMobileCrashGroups } from './use_mobile_crash_groups';

jest.mock('../../../hooks/use_api_client');
jest.mock('../../../hooks/use_environment');
jest.mock('../../../hooks/use_query_param');
jest.mock('../../../hooks/use_time_range');

const fetch = jest.fn();
const LIST = { crashGroups: [{ fingerprint: 'npe' }], releases: [], isPartial: false };
const DETAIL = { latestCrash: null, isPartial: false };

let release: string | undefined;

beforeEach(() => {
  release = undefined;
  fetch
    .mockReset()
    .mockImplementation(async (endpoint: string) =>
      endpoint.endsWith('{fingerprint}') ? DETAIL : LIST
    );
  jest
    .mocked(useApiClient)
    .mockReturnValue({ fetch } as unknown as ReturnType<typeof useApiClient>);
  jest.mocked(useTimeRange).mockReturnValue({
    timeRange: { rangeFrom: '2021-01-18T12:00:00.000Z', rangeTo: '2021-01-18T13:00:00.000Z' },
    isTimeRangeInUrl: true,
    setTimeRange: jest.fn(),
  });
  jest
    .mocked(useEnvironment)
    .mockReturnValue({ environment: undefined, setEnvironment: jest.fn() });
  jest.mocked(useQueryParam).mockImplementation((name) => ({
    value: name === 'release' ? release : undefined,
    setValue: jest.fn(),
  }));
});

describe('useMobileCrashGroups', () => {
  it("shows no rows of the last filters from the render the filters change in, but keeps them for the flyout's header", async () => {
    const { result, rerender } = renderHook(() => useMobileCrashGroups('trailmap-android'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    release = '4.2.0';
    rerender();

    expect(result.current.isLoading).toBe(true);
    expect(result.current.response).toBeUndefined();
    expect(result.current.lastResponse).toBe(LIST);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });
});

describe('useMobileCrashGroup', () => {
  it('shows no detail of the last group from the render the group changes in', async () => {
    const { result, rerender } = renderHook(
      ({ fingerprint }) => useMobileCrashGroup('trailmap-android', fingerprint),
      { initialProps: { fingerprint: 'npe' } }
    );
    await waitFor(() => expect(result.current.detail).toBe(DETAIL));

    rerender({ fingerprint: 'oom' });

    // Back or Forward with the flyout open: never a frame with the other group's detail.
    expect(result.current.isLoading).toBe(true);
    expect(result.current.detail).toBeUndefined();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(fetch).toHaveBeenLastCalledWith(
      expect.stringContaining('{fingerprint}'),
      expect.objectContaining({
        params: expect.objectContaining({
          path: { serviceName: 'trailmap-android', fingerprint: 'oom' },
        }),
      })
    );
  });
});
