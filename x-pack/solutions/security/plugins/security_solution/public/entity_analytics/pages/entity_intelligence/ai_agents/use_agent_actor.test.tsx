/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { focusManager, QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useAgentActor } from './use_agent_actor';
import type { AgentResolvedActor } from './agent_actor_identity';
import { getConversationReferenceAliases } from './agent_conversations';
import type { AgentConversationResponse } from './agent_conversations';
import type { AgentInvocation, AgentRuntimeAttribution } from './types';

const mockGet = jest.fn();
jest.mock('../../../../common/lib/kibana', () => ({
  useKibana: () => ({ services: { http: { get: mockGet } } }),
}));

const attribution: AgentRuntimeAttribution = {
  status: 'partial',
  source: 'kibana_authc',
  capturePoint: 'request',
  initiatingActor: { id: 'user-id', source: 'kibana_authc' },
  caller: { type: 'user', id: 'user-id' },
  delegationStatus: 'unknown',
  downstreamCredentialStatus: 'unknown',
};
const invocation: AgentInvocation = {
  id: 'trace:span',
  traceId: 'trace',
  spanId: 'span',
  timestamp: '2026-10-13T12:00:00Z',
  outcome: 'success',
  source: { index: 'trace-index', id: 'document' },
  conversationReference: 'conversation',
  attribution,
};
const response: AgentConversationResponse = {
  id: 'conversation',
  agent_id: 'agent',
  title: 'Private conversation title',
  rounds: [
    {
      id: 'round',
      trace_id: 'trace',
      author: { id: 'user-id', username: 'james', full_name: 'James Example' },
      input: { message: 'Private user prompt' },
      response: { message: 'Private model response' },
      steps: [],
    },
  ],
};
const resolvedActor: AgentResolvedActor = {
  id: 'user-id',
  name: 'James Example',
  username: 'james',
  provenance: 'conversation_author',
  conversationId: 'conversation',
  roundId: 'round',
};
interface HookProps {
  spaceId: string | undefined;
  agentId: string;
  conversationId: string | undefined;
  selectedInvocation: AgentInvocation | undefined;
}
const initialProps: HookProps = {
  spaceId: 'marketing',
  agentId: 'agent',
  conversationId: 'conversation',
  selectedInvocation: invocation,
};
const useActor = ({ spaceId, agentId, conversationId, selectedInvocation }: HookProps) =>
  useAgentActor(spaceId, agentId, conversationId, selectedInvocation);
const withAttribution = (changes: Partial<AgentRuntimeAttribution>): AgentInvocation => ({
  ...invocation,
  attribution: { ...attribution, ...changes },
});
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

beforeEach(() => {
  jest.clearAllMocks();
  mockGet.mockResolvedValue(response);
});

afterEach(() => focusManager.setFocused(undefined));

it('loads the exact accessible conversation and caches only the resolved actor', async () => {
  const { client, Wrapper } = wrapper();
  const { result } = renderHook(useActor, { wrapper: Wrapper, initialProps });
  expect(result.current.isLoading).toBe(true);
  expect(result.current.actor).toBeUndefined();
  await waitFor(() => expect(result.current.actor).toEqual(resolvedActor));
  expect(result.current.unavailable).toBe(false);
  expect(mockGet).toHaveBeenCalledWith('/api/agent_builder/conversations/conversation', {
    version: '2023-10-31',
    signal: expect.any(AbortSignal),
  });
  expect(
    client
      .getQueryCache()
      .getAll()
      .map((query) => query.state.data)
  ).toEqual([{ actor: resolvedActor }]);
});

it('encodes the exact conversation ID and supports a privacy-normalized reference', async () => {
  const conversationId = 'conversation/one?two';
  mockGet.mockResolvedValue({ ...response, id: conversationId });
  const { Wrapper } = wrapper();
  const { result } = renderHook(useActor, {
    wrapper: Wrapper,
    initialProps: {
      ...initialProps,
      conversationId,
      selectedInvocation: {
        ...invocation,
        conversationReference: getConversationReferenceAliases(conversationId)[1],
      },
    },
  });
  await waitFor(() => expect(result.current.actor?.conversationId).toBe(conversationId));
  expect(mockGet).toHaveBeenCalledWith(
    '/api/agent_builder/conversations/conversation%2Fone%3Ftwo',
    expect.objectContaining({ version: '2023-10-31' })
  );
});

const disabledCases: Array<[string, Partial<HookProps>]> = [
  ['missing space', { spaceId: undefined }],
  ['blank space', { spaceId: ' ' }],
  ['missing agent', { agentId: '' }],
  ['missing conversation', { conversationId: undefined }],
  ['missing invocation', { selectedInvocation: undefined }],
  ['missing trace', { selectedInvocation: { ...invocation, traceId: '' } }],
  [
    'missing conversation reference',
    { selectedInvocation: { ...invocation, conversationReference: undefined } },
  ],
  [
    'legacy identity only',
    {
      selectedInvocation: {
        ...invocation,
        attribution: undefined,
        reportedUser: { name: 'James' },
      },
    },
  ],
  ['unavailable attribution', { selectedInvocation: withAttribution({ status: 'unavailable' }) }],
  ['untrusted attribution source', { selectedInvocation: withAttribution({ source: 'reported' }) }],
  ['no initiating actor', { selectedInvocation: withAttribution({ initiatingActor: undefined }) }],
  [
    'untrusted actor source',
    {
      selectedInvocation: withAttribution({
        initiatingActor: { id: 'user-id', source: 'reported' },
      }),
    },
  ],
  [
    'no recorded actor ID',
    { selectedInvocation: withAttribution({ initiatingActor: { source: 'kibana_authc' } }) },
  ],
  [
    'already named actor',
    {
      selectedInvocation: withAttribution({
        initiatingActor: { id: 'user-id', name: 'James', source: 'kibana_authc' },
      }),
    },
  ],
  ['no authenticated caller', { selectedInvocation: withAttribution({ caller: undefined }) }],
  [
    'API-key caller',
    { selectedInvocation: withAttribution({ caller: { type: 'api_key', id: 'user-id' } }) },
  ],
  [
    'service account caller',
    { selectedInvocation: withAttribution({ caller: { type: 'service_account', id: 'user-id' } }) },
  ],
  [
    'caller with API-key evidence',
    { selectedInvocation: withAttribution({ caller: { type: 'user', apiKeyHash: 'key-hash' } }) },
  ],
  [
    'caller with empty API-key evidence',
    { selectedInvocation: withAttribution({ caller: { type: 'user', apiKeyId: '' } }) },
  ],
];

it.each(disabledCases)('does not fetch for %s', (_name, props) => {
  const { Wrapper } = wrapper();
  const { result } = renderHook(useActor, {
    wrapper: Wrapper,
    initialProps: { ...initialProps, ...props },
  });
  expect(mockGet).not.toHaveBeenCalled();
  expect(result.current).toEqual({ actor: undefined, isLoading: false, unavailable: true });
});

it.each([
  ['agent', { ...response, agent_id: 'another-agent' }, invocation],
  ['conversation ID', { ...response, id: 'another-conversation' }, invocation],
  [
    'recorded conversation reference',
    response,
    { ...invocation, conversationReference: 'another-conversation' },
  ],
] as const)('rejects a mismatched %s', async (_name, conversation, selectedInvocation) => {
  mockGet.mockResolvedValue(conversation);
  const { Wrapper } = wrapper();
  const { result } = renderHook(useActor, {
    wrapper: Wrapper,
    initialProps: { ...initialProps, selectedInvocation },
  });
  await waitFor(() => expect(result.current.unavailable).toBe(true));
  expect(result.current.actor).toBeUndefined();
});

it('reports unresolved authors without retaining raw conversation content', async () => {
  mockGet.mockResolvedValue({ ...response, rounds: [] });
  const { client, Wrapper } = wrapper();
  const { result } = renderHook(useActor, { wrapper: Wrapper, initialProps });
  await waitFor(() => expect(result.current.unavailable).toBe(true));
  expect(result.current.isLoading).toBe(false);
  expect(result.current.actor).toBeUndefined();
  expect(
    client
      .getQueryCache()
      .getAll()
      .map((query) => query.state.data)
  ).toEqual([{ actor: undefined }]);
});

it('hides a previously resolved actor during a fresh access check and after access is denied', async () => {
  const { client, Wrapper } = wrapper();
  const { result } = renderHook(useActor, { wrapper: Wrapper, initialProps });
  await waitFor(() => expect(result.current.actor).toEqual(resolvedActor));
  let rejectRequest: ((error: Error) => void) | undefined;
  mockGet.mockImplementationOnce(
    () =>
      new Promise<AgentConversationResponse>((_resolve, reject) => {
        rejectRequest = reject;
      })
  );
  act(() => {
    void client.invalidateQueries();
  });
  await waitFor(() => expect(result.current.isLoading).toBe(true));
  expect(result.current.actor).toBeUndefined();
  await act(async () => {
    rejectRequest?.(new Error('Forbidden'));
  });
  await waitFor(() => expect(result.current.unavailable).toBe(true));
  expect(result.current.actor).toBeUndefined();
});

it.each([
  ['space', { spaceId: 'another-space' }],
  ['agent', { agentId: 'another-agent' }],
  ['conversation', { conversationId: 'another-conversation' }],
  ['trace', { selectedInvocation: { ...invocation, traceId: 'another-trace' } }],
  [
    'actor attribution with the same invocation ID',
    {
      selectedInvocation: withAttribution({
        initiatingActor: { id: 'another-user', source: 'kibana_authc' },
      }),
    },
  ],
  [
    'caller attribution with the same invocation ID',
    { selectedInvocation: withAttribution({ caller: { type: 'user', id: 'another-caller' } }) },
  ],
] as Array<[string, Partial<HookProps>]>)(
  'does not reuse the prior actor after changing %s',
  async (_name, props) => {
    const { Wrapper } = wrapper();
    const { result, rerender } = renderHook(useActor, { wrapper: Wrapper, initialProps });
    await waitFor(() => expect(result.current.actor).toEqual(resolvedActor));
    mockGet.mockRejectedValue(new Error('Forbidden'));
    rerender({ ...initialProps, ...props });
    expect(result.current.actor).toBeUndefined();
    await waitFor(() => expect(result.current.unavailable).toBe(true));
    expect(mockGet).toHaveBeenCalledTimes(2);
  }
);

it('hides prior resolution immediately when attribution becomes ineligible', async () => {
  const { Wrapper } = wrapper();
  const { result, rerender } = renderHook(useActor, { wrapper: Wrapper, initialProps });
  await waitFor(() => expect(result.current.actor).toEqual(resolvedActor));
  rerender({ ...initialProps, selectedInvocation: withAttribution({ source: 'untrusted' }) });
  expect(result.current).toEqual({ actor: undefined, isLoading: false, unavailable: true });
  expect(mockGet).toHaveBeenCalledTimes(1);
});

it('rechecks current access after regaining window focus', async () => {
  const { Wrapper } = wrapper();
  const { result } = renderHook(useActor, { wrapper: Wrapper, initialProps });
  await waitFor(() => expect(result.current.actor).toEqual(resolvedActor));
  mockGet.mockRejectedValue(new Error('Forbidden'));
  act(() => {
    focusManager.setFocused(false);
  });
  act(() => {
    focusManager.setFocused(true);
  });
  await waitFor(() => expect(result.current.unavailable).toBe(true));
  expect(result.current.actor).toBeUndefined();
  expect(mockGet).toHaveBeenCalledTimes(2);
});

it('discards a successful resolution on unmount and rechecks access when mounted again', async () => {
  const { client, Wrapper } = wrapper();
  const first = renderHook(useActor, { wrapper: Wrapper, initialProps });
  await waitFor(() => expect(first.result.current.actor).toEqual(resolvedActor));
  first.unmount();
  await waitFor(() => expect(client.getQueryCache().getAll()).toHaveLength(0));
  mockGet.mockRejectedValue(new Error('Forbidden'));
  const next = renderHook(useActor, { wrapper: Wrapper, initialProps });
  expect(next.result.current.actor).toBeUndefined();
  await waitFor(() => expect(next.result.current.unavailable).toBe(true));
  expect(mockGet).toHaveBeenCalledTimes(2);
});

it('aborts an in-flight conversation request when the graph unmounts', () => {
  let requestSignal: AbortSignal | undefined;
  mockGet.mockImplementationOnce((_path: string, options: { signal: AbortSignal }) => {
    requestSignal = options.signal;
    return new Promise<AgentConversationResponse>(() => {});
  });
  const { Wrapper } = wrapper();
  const { unmount } = renderHook(useActor, { wrapper: Wrapper, initialProps });
  expect(requestSignal?.aborted).toBe(false);
  unmount();
  expect(requestSignal?.aborted).toBe(true);
});
