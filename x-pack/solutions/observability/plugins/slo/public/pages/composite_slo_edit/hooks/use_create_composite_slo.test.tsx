/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren } from 'react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { renderHook, act, waitFor } from '@testing-library/react';
import { ALL_VALUE } from '@kbn/slo-schema';
import { useKibana } from '../../../hooks/use_kibana';
import { useCreateCompositeSlo } from './use_create_composite_slo';
import type { CreateCompositeSLOForm } from '../types';

jest.mock('../../../hooks/use_kibana');
jest.mock('@kbn/react-kibana-mount', () => ({ toMountPoint: (node: unknown) => node }));

const mockPost = jest.fn();
const mockAddSuccess = jest.fn();
const mockAddError = jest.fn();
const useKibanaMock = useKibana as jest.Mock;

function createWrapper(): FC<PropsWithChildren<{}>> {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, cacheTime: 0 } },
  });
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

const baseForm: CreateCompositeSLOForm = {
  name: 'My Composite',
  description: 'desc',
  members: [
    { sloId: 'slo-1', sloName: 'SLO One', groupBy: 'env', instanceId: 'production', weight: 2 },
    { sloId: 'slo-2', sloName: 'SLO Two', groupBy: ALL_VALUE, instanceId: ALL_VALUE, weight: 1 },
  ],
  timeWindow: { duration: '30d', type: 'rolling' },
  objective: { target: 99 },
  tags: ['team-a'],
};

beforeEach(() => {
  jest.clearAllMocks();
  useKibanaMock.mockReturnValue({
    services: {
      http: { post: mockPost },
      i18n: {},
      theme: {},
      notifications: { toasts: { addSuccess: mockAddSuccess, addError: mockAddError } },
    },
  });
});

describe('useCreateCompositeSlo', () => {
  it('posts to the correct endpoint', async () => {
    mockPost.mockResolvedValue({ id: 'new-id' });

    const { result } = renderHook(() => useCreateCompositeSlo(), { wrapper: createWrapper() });

    act(() => {
      result.current.mutate({ compositeSlo: baseForm });
    });

    await waitFor(() => expect(mockPost).toHaveBeenCalledTimes(1));
    expect(mockPost).toHaveBeenCalledWith('/api/observability/slo_composites', expect.any(Object));
  });

  it('strips UI-only fields sloName and groupBy from members', async () => {
    mockPost.mockResolvedValue({ id: 'new-id' });

    const { result } = renderHook(() => useCreateCompositeSlo(), { wrapper: createWrapper() });

    act(() => {
      result.current.mutate({ compositeSlo: baseForm });
    });

    await waitFor(() => expect(mockPost).toHaveBeenCalledTimes(1));

    const body = JSON.parse(mockPost.mock.calls[0][1].body);
    body.members.forEach((m: object) => {
      expect(m).not.toHaveProperty('sloName');
      expect(m).not.toHaveProperty('groupBy');
    });
  });

  it('converts objective.target from percentage to fraction', async () => {
    mockPost.mockResolvedValue({ id: 'new-id' });

    const { result } = renderHook(() => useCreateCompositeSlo(), { wrapper: createWrapper() });

    act(() => {
      result.current.mutate({ compositeSlo: baseForm });
    });

    await waitFor(() => expect(mockPost).toHaveBeenCalledTimes(1));

    const body = JSON.parse(mockPost.mock.calls[0][1].body);
    expect(body.objective.target).toBe(0.99);
  });

  it('includes instanceId when it is not ALL_VALUE', async () => {
    mockPost.mockResolvedValue({ id: 'new-id' });

    const { result } = renderHook(() => useCreateCompositeSlo(), { wrapper: createWrapper() });

    act(() => {
      result.current.mutate({ compositeSlo: baseForm });
    });

    await waitFor(() => expect(mockPost).toHaveBeenCalledTimes(1));

    const body = JSON.parse(mockPost.mock.calls[0][1].body);
    expect(body.members[0].instanceId).toBe('production');
  });

  it('omits instanceId when it is ALL_VALUE', async () => {
    mockPost.mockResolvedValue({ id: 'new-id' });

    const { result } = renderHook(() => useCreateCompositeSlo(), { wrapper: createWrapper() });

    act(() => {
      result.current.mutate({ compositeSlo: baseForm });
    });

    await waitFor(() => expect(mockPost).toHaveBeenCalledTimes(1));

    const body = JSON.parse(mockPost.mock.calls[0][1].body);
    expect(body.members[1]).not.toHaveProperty('instanceId');
  });

  it('shows success toast on successful creation', async () => {
    mockPost.mockResolvedValue({ id: 'new-id' });

    const { result } = renderHook(() => useCreateCompositeSlo(), { wrapper: createWrapper() });

    act(() => {
      result.current.mutate({ compositeSlo: baseForm });
    });

    await waitFor(() => expect(mockAddSuccess).toHaveBeenCalledTimes(1));
  });

  it('shows error toast on failed creation', async () => {
    mockPost.mockRejectedValue({ body: { message: 'Internal error' }, message: 'error' });

    const { result } = renderHook(() => useCreateCompositeSlo(), { wrapper: createWrapper() });

    act(() => {
      result.current.mutate({ compositeSlo: baseForm });
    });

    await waitFor(() => expect(mockAddError).toHaveBeenCalledTimes(1));
  });
});
