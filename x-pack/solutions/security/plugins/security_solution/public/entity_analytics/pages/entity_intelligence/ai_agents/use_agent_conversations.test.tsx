/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useAgentConversations, useAgentConversationContent } from './use_agent_conversations';
import type { AgentInvocation } from './types';

const mockGet = jest.fn();
jest.mock('../../../../common/lib/kibana', () => ({
  useKibana: () => ({ services: { http: { get: mockGet } } }),
}));
const invocation: AgentInvocation = {
  id: 'trace:span',
  traceId: 'trace',
  spanId: 'span',
  timestamp: '2026-10-12T12:00:00Z',
  outcome: 'unknown',
  source: { index: 'trace-index', id: 'document' },
  conversationReference: 'conversation',
};
const response = {
  id: 'conversation',
  agent_id: 'agent',
  title: 'Recorded title',
  rounds: [{ id: 'round', trace_id: 'trace', input: { message: 'Recorded input' }, steps: [] }],
};
const wrapper = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, cacheTime: 0 } },
    logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, Wrapper };
};
beforeEach(() => jest.clearAllMocks());

it('loads bounded per-agent titles through the versioned current-space public API', async () => {
  mockGet.mockResolvedValue({
    pagination: { total: 101 },
    results: [
      {
        id: 'conversation',
        agent_id: 'agent',
        title: 'Recorded title',
        updated_at: invocation.timestamp,
      },
    ],
  });
  const { Wrapper } = wrapper();
  const { result } = renderHook(() => useAgentConversations('marketing', 'agent'), {
    wrapper: Wrapper,
  });
  await waitFor(() => expect(result.current.conversations).toHaveLength(1));
  expect(result.current.partial).toBe(true);
  expect(mockGet).toHaveBeenCalledWith(
    '/api/agent_builder/conversations',
    expect.objectContaining({
      version: '2023-10-31',
      query: { agent_id: 'agent', page: 1, per_page: 100, sort_order: 'desc' },
    })
  );
});

it('does not load content before a space and exact conversation reference are available', () => {
  const { Wrapper } = wrapper();
  renderHook(() => useAgentConversationContent(undefined, 'agent', 'conversation', invocation), {
    wrapper: Wrapper,
  });
  renderHook(() => useAgentConversationContent('marketing', 'agent', undefined, invocation), {
    wrapper: Wrapper,
  });
  expect(mockGet).not.toHaveBeenCalled();
});

it('projects content and removes it after a failed fresh access check', async () => {
  mockGet.mockResolvedValue(response);
  const { client, Wrapper } = wrapper();
  const { result } = renderHook(
    () => useAgentConversationContent('marketing', 'agent', 'conversation', invocation),
    { wrapper: Wrapper }
  );
  await waitFor(() => expect(result.current.detail?.prompt?.text).toBe('Recorded input'));
  mockGet.mockRejectedValue(new Error('Forbidden'));
  await act(async () => {
    await client.invalidateQueries();
  });
  await waitFor(() => expect(result.current.unavailable).toBe(true));
  expect(result.current.detail).toBeUndefined();
});

it('rejects a mismatched agent, conversation ID, or recorded trace conversation reference', async () => {
  mockGet.mockResolvedValue({ ...response, agent_id: 'different-agent' });
  const { Wrapper } = wrapper();
  const { result } = renderHook(
    () => useAgentConversationContent('marketing', 'agent', 'conversation', invocation),
    { wrapper: Wrapper }
  );
  await waitFor(() => expect(result.current.unavailable).toBe(true));
  expect(result.current.detail).toBeUndefined();
});

it('separates content cache entries by space and never returns previous content while loading another space', async () => {
  mockGet.mockResolvedValue(response);
  const { Wrapper } = wrapper();
  const { result, rerender } = renderHook(
    ({ spaceId }) => useAgentConversationContent(spaceId, 'agent', 'conversation', invocation),
    { wrapper: Wrapper, initialProps: { spaceId: 'one' } }
  );
  await waitFor(() => expect(result.current.detail).toBeDefined());
  mockGet.mockRejectedValue(new Error('Forbidden'));
  rerender({ spaceId: 'two' });
  expect(result.current.detail).toBeUndefined();
  await waitFor(() => expect(result.current.unavailable).toBe(true));
  expect(mockGet).toHaveBeenCalledTimes(2);
});
