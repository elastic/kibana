/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import {
  AI_POLICIES_URL,
  AI_POLICY_STATUS_URL,
} from '../../../../../common/entity_intelligence/ai_policies';
import { API_VERSIONS } from '../../../../../common/entity_analytics/constants';
import { emptyPolicy } from './policy_form';
import { useAiPolicies } from './use_ai_policies';

const mockGet = jest.fn();
const mockPost = jest.fn();
const mockPut = jest.fn();
jest.mock('../../../../common/lib/kibana', () => ({
  useKibana: () => ({ services: { http: { get: mockGet, post: mockPost, put: mockPut } } }),
}));
jest.mock('../../../../common/hooks/use_space_id', () => ({ useSpaceId: () => 'default' }));

const input = { ...emptyPolicy(), name: 'Protect customer file', inputContains: 'private.csv' };
const policy = {
  ...input,
  id: 'policy-1',
  version: 3,
  createdAt: '2026-10-14T00:00:00Z',
  updatedAt: '2026-10-14T00:00:00Z',
  effectiveFrom: '2026-10-14T00:00:00Z',
  createdBy: 'James',
  updatedBy: 'James',
};

const renderPolicies = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, cacheTime: 0 } },
    logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderHook(() => useAiPolicies(), { wrapper });
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGet.mockImplementation((path: string) =>
    Promise.resolve(
      path === AI_POLICY_STATUS_URL
        ? { status: null, stale: true }
        : { policies: [policy], total: 1 }
    )
  );
  mockPost.mockResolvedValue({ policy });
  mockPut.mockResolvedValue({ policy });
});

it('saves a real policy and refetches persisted state', async () => {
  const { result } = renderPolicies();
  await waitFor(() => expect(result.current.policies).toEqual([policy]));
  await act(async () => {
    expect(await result.current.save(input)).toBe(true);
  });
  expect(mockPost).toHaveBeenCalledWith(AI_POLICIES_URL, {
    version: API_VERSIONS.internal.v1,
    body: JSON.stringify(input),
  });
  expect(mockGet).toHaveBeenCalledWith(AI_POLICIES_URL, {
    version: API_VERSIONS.internal.v1,
    signal: expect.any(AbortSignal),
  });
  expect(mockGet).toHaveBeenCalledWith(AI_POLICY_STATUS_URL, {
    version: API_VERSIONS.internal.v1,
    signal: expect.any(AbortSignal),
  });
  expect(mockPut).not.toHaveBeenCalled();
  expect(mockGet.mock.calls.filter(([path]) => path === AI_POLICIES_URL).length).toBe(2);
});

it('uses the revision that was opened and preserves the server state on a conflict', async () => {
  const { result } = renderPolicies();
  await waitFor(() => expect(result.current.policies).toHaveLength(1));
  mockPut.mockRejectedValue({ body: { statusCode: 409 } });
  await act(async () => {
    expect(await result.current.save({ ...input, name: 'Changed' }, policy)).toBe(false);
  });
  expect(mockPut).toHaveBeenCalledWith(`${AI_POLICIES_URL}/policy-1`, {
    version: API_VERSIONS.internal.v1,
    body: JSON.stringify({ ...input, name: 'Changed', expectedVersion: 3 }),
  });
  expect(result.current.saveError).toContain('changed while you were editing');
  expect(result.current.policies[0].name).toBe(input.name);
  expect(result.current.isSaving).toBe(false);
});

it('does not display cached policies as readable after access fails', async () => {
  const { result } = renderPolicies();
  await waitFor(() => expect(result.current.policies).toHaveLength(1));
  mockGet.mockRejectedValue(new Error('Forbidden'));
  act(() => result.current.refresh());
  await waitFor(() => expect(result.current.unavailable).toBe(true));
  expect(result.current.policies).toEqual([]);
  expect(result.current.total).toBeUndefined();
  expect(result.current.detector).toBeUndefined();
});

it('keeps policies available when collector status cannot be read', async () => {
  mockGet.mockImplementation((path: string) =>
    path === AI_POLICY_STATUS_URL
      ? Promise.reject(new Error('Unavailable'))
      : Promise.resolve({ policies: [policy], total: 1 })
  );
  const { result } = renderPolicies();
  await waitFor(() => expect(result.current.detectorUnavailable).toBe(true));
  expect(result.current.policies).toEqual([policy]);
  expect(result.current.detector).toBeUndefined();
});
