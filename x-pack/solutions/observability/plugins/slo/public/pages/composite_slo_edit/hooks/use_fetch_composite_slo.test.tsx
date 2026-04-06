/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren } from 'react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { ALL_VALUE } from '@kbn/slo-schema';
import { useKibana } from '../../../hooks/use_kibana';
import { useFetchCompositeSlo } from './use_fetch_composite_slo';

jest.mock('../../../hooks/use_kibana');

const mockGet = jest.fn();
const useKibanaMock = useKibana as jest.Mock;

const compositeSloResponse = {
  id: 'composite-id',
  name: 'My Composite SLO',
  description: 'desc',
  members: [
    { sloId: 'slo-1', instanceId: 'FEMALE', weight: 2 },
    { sloId: 'slo-2', weight: 1 },
  ],
  timeWindow: { duration: '30d', type: 'rolling' },
  objective: { target: 0.99 },
  tags: ['team-a'],
  compositeMethod: 'weightedAverage',
  budgetingMethod: 'occurrences',
  enabled: true,
  version: 1,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  createdBy: 'elastic',
  updatedBy: 'elastic',
};

const slo1Definition = {
  id: 'slo-1',
  name: 'Availability SLO',
  groupBy: 'gender',
};

const slo2Definition = {
  id: 'slo-2',
  name: 'Latency SLO',
  groupBy: ALL_VALUE,
};

function createWrapper(): FC<PropsWithChildren<{}>> {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, cacheTime: 0 } },
  });
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  useKibanaMock.mockReturnValue({ services: { http: { get: mockGet } } });
});

describe('useFetchCompositeSlo', () => {
  it('is disabled when compositeSloId is undefined', () => {
    const { result } = renderHook(() => useFetchCompositeSlo(undefined), {
      wrapper: createWrapper(),
    });

    expect(result.current.data).toBeUndefined();
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('returns loading state while fetching', () => {
    mockGet.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useFetchCompositeSlo('composite-id'), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
  });

  it('maps composite SLO response to form values', async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes('slo_composites')) return Promise.resolve(compositeSloResponse);
      if (url.includes('/slos/slo-1')) return Promise.resolve(slo1Definition);
      if (url.includes('/slos/slo-2')) return Promise.resolve(slo2Definition);
    });

    const { result } = renderHook(() => useFetchCompositeSlo('composite-id'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toMatchObject({
      name: 'My Composite SLO',
      description: 'desc',
      timeWindow: { duration: '30d', type: 'rolling' },
      objective: { target: 99 },
      tags: ['team-a'],
    });
  });

  it('converts objective.target from fraction to percentage', async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes('slo_composites')) return Promise.resolve(compositeSloResponse);
      return Promise.resolve(slo1Definition);
    });

    const { result } = renderHook(() => useFetchCompositeSlo('composite-id'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data?.objective.target).toBe(99);
  });

  it('enriches members with sloName and groupBy from SLO definitions', async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes('slo_composites')) return Promise.resolve(compositeSloResponse);
      if (url.includes('/slos/slo-1')) return Promise.resolve(slo1Definition);
      if (url.includes('/slos/slo-2')) return Promise.resolve(slo2Definition);
    });

    const { result } = renderHook(() => useFetchCompositeSlo('composite-id'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const members = result.current.data?.members ?? [];
    expect(members[0]).toMatchObject({
      sloId: 'slo-1',
      sloName: 'Availability SLO',
      groupBy: 'gender',
      instanceId: 'FEMALE',
      weight: 2,
    });
    expect(members[1]).toMatchObject({
      sloId: 'slo-2',
      sloName: 'Latency SLO',
      groupBy: ALL_VALUE,
      instanceId: ALL_VALUE,
      weight: 1,
    });
  });

  it('falls back to sloId as name and ALL_VALUE as groupBy when member SLO fetch fails', async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes('slo_composites')) return Promise.resolve(compositeSloResponse);
      return Promise.reject(new Error('not found'));
    });

    const { result } = renderHook(() => useFetchCompositeSlo('composite-id'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const members = result.current.data?.members ?? [];
    expect(members[0].sloName).toBe('slo-1');
    expect(members[0].groupBy).toBe(ALL_VALUE);
    expect(members[1].sloName).toBe('slo-2');
    expect(members[1].groupBy).toBe(ALL_VALUE);
  });

  it('maps undefined instanceId to ALL_VALUE', async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes('slo_composites')) return Promise.resolve(compositeSloResponse);
      if (url.includes('/slos/slo-2')) return Promise.resolve(slo2Definition);
      return Promise.resolve(slo1Definition);
    });

    const { result } = renderHook(() => useFetchCompositeSlo('composite-id'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // slo-2 member has no instanceId in the response
    expect(result.current.data?.members[1].instanceId).toBe(ALL_VALUE);
  });

  it('fetches each unique sloId only once', async () => {
    const responseWithDuplicateSlo = {
      ...compositeSloResponse,
      members: [
        { sloId: 'slo-1', instanceId: 'FEMALE', weight: 1 },
        { sloId: 'slo-1', instanceId: 'MALE', weight: 1 },
      ],
    };

    mockGet.mockImplementation((url: string) => {
      if (url.includes('slo_composites')) return Promise.resolve(responseWithDuplicateSlo);
      return Promise.resolve(slo1Definition);
    });

    const { result } = renderHook(() => useFetchCompositeSlo('composite-id'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const sloDefinitionCalls = mockGet.mock.calls.filter((call) =>
      call[0].includes('/api/observability/slos/')
    );
    expect(sloDefinitionCalls).toHaveLength(1);
  });
});
