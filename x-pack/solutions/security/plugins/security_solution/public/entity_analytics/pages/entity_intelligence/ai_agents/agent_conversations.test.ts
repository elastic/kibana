/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildAgentConversationDetail,
  findInvocationConversation,
  getConversationReferenceAliases,
  projectAgentConversations,
} from './agent_conversations';
import type { AgentConversationResponse } from './agent_conversations';
import type { AgentInvocation, AgentToolCall } from './types';

const invocation: AgentInvocation = {
  id: 'trace:agent-span',
  traceId: 'trace',
  spanId: 'agent-span',
  timestamp: '2026-10-12T12:00:00Z',
  outcome: 'success',
  source: { index: 'traces', id: 'agent-doc' },
  conversationReference: 'conversation-id',
};
const call: AgentToolCall = {
  id: 'trace:tool-span',
  traceId: 'trace',
  spanId: 'tool-span',
  invocationSpanId: 'agent-span',
  timestamp: invocation.timestamp,
  outcome: 'success',
  source: { index: 'traces', id: 'tool-doc' },
  toolName: 'platform.core.execute_esql',
  toolCallId: 'call-id',
  nameRedacted: false,
};
const conversation: AgentConversationResponse = {
  id: 'conversation-id',
  agent_id: 'agent',
  title: 'Investigate entity activity',
  rounds: [
    {
      id: 'round-one',
      trace_id: 'trace',
      input: { message: 'Find recent entity activity' },
      response: { message: 'Found five events' },
      steps: [
        {
          type: 'tool_call',
          tool_call_id: 'call-id',
          tool_id: call.toolName,
          params: { query: 'FROM logs-* | LIMIT 5' },
          results: [{ type: 'esql_results', data: { rows: 5 } }],
        },
        { type: 'reasoning', params: { reasoning: 'Never include this internal reasoning' } },
      ],
    },
  ],
};

it('matches titles only by exact accessible conversation references, including the exporter hash', () => {
  const summaries = projectAgentConversations(
    {
      pagination: { total: 2 },
      results: [
        {
          id: conversation.id,
          agent_id: 'agent',
          title: conversation.title,
          updated_at: invocation.timestamp,
        },
        {
          id: 'other',
          agent_id: 'other-agent',
          title: 'Not this agent',
          updated_at: invocation.timestamp,
        },
      ],
    },
    'agent'
  );
  expect(summaries).toHaveLength(1);
  expect(findInvocationConversation(invocation, summaries)?.id).toBe(conversation.id);
  expect(
    findInvocationConversation(
      { ...invocation, conversationReference: getConversationReferenceAliases(conversation.id)[1] },
      summaries
    )?.id
  ).toBe(conversation.id);
  expect(
    findInvocationConversation(
      { ...invocation, conversationReference: conversation.title },
      summaries
    )
  ).toBeUndefined();
  expect(findInvocationConversation(invocation, [...summaries, ...summaries])).toBeUndefined();
});

it('loads the exact recorded prompt and tool arguments without reasoning or unrelated rounds', () => {
  const detail = buildAgentConversationDetail(
    {
      ...conversation,
      rounds: [
        ...conversation.rounds,
        {
          ...conversation.rounds[0],
          id: 'round-other',
          trace_id: 'other-trace',
          input: { message: 'Unrelated input' },
          steps: [
            {
              type: 'tool_call',
              tool_call_id: 'call-id',
              tool_id: call.toolName,
              params: { query: 'wrong round' },
            },
          ],
        },
      ],
    },
    invocation,
    call
  );
  expect(detail.status).toBe('matched');
  expect(detail.roundId).toBe('round-one');
  expect(detail.prompt?.text).toBe('Find recent entity activity');
  expect(detail.tool?.arguments?.text).toContain('FROM logs-* | LIMIT 5');
  expect(JSON.stringify(detail)).not.toMatch(/reasoning|wrong round|Unrelated input/);
});

it('supports persisted round trace arrays but refuses missing or ambiguous round matches', () => {
  const arrayTrace = {
    ...conversation,
    rounds: [{ ...conversation.rounds[0], trace_id: ['previous-trace', 'trace'] }],
  };
  expect(buildAgentConversationDetail(arrayTrace, invocation).status).toBe('matched');
  expect(
    buildAgentConversationDetail(conversation, { ...invocation, traceId: 'missing' }).status
  ).toBe('round_missing');
  const duplicate = buildAgentConversationDetail(
    { ...conversation, rounds: [...conversation.rounds, ...conversation.rounds] },
    invocation,
    call
  );
  expect(duplicate.status).toBe('round_ambiguous');
  expect(duplicate.prompt).toBeUndefined();
  expect(duplicate.tool).toBeUndefined();
});

it('requires a unique exact call ID in the matched round and checks invocation ancestry again', () => {
  expect(
    buildAgentConversationDetail(conversation, invocation, { ...call, toolCallId: undefined })
      .status
  ).toBe('tool_missing');
  expect(
    buildAgentConversationDetail(conversation, invocation, { ...call, toolCallId: 'another-id' })
      .tool
  ).toBeUndefined();
  expect(
    buildAgentConversationDetail(conversation, invocation, {
      ...call,
      invocationSpanId: 'another-agent',
    }).tool
  ).toBeUndefined();
  const duplicate = {
    ...conversation,
    rounds: [
      {
        ...conversation.rounds[0],
        steps: [conversation.rounds[0].steps[0], conversation.rounds[0].steps[0]],
      },
    ],
  };
  expect(buildAgentConversationDetail(duplicate, invocation, call).status).toBe('tool_ambiguous');
});

it('redacts explicit secret values across the prompt, arguments, results, and title', () => {
  const secret = 'SyntheticCredentialValue987';
  const sensitive = {
    ...conversation,
    title: `Investigate ${secret}`,
    rounds: [
      {
        ...conversation.rounds[0],
        input: { message: `password=${secret}` },
        steps: [
          {
            ...conversation.rounds[0].steps[0],
            params: { command: `run --value ${secret}` },
            results: [{ message: secret }],
          },
        ],
      },
    ],
  };
  const detail = buildAgentConversationDetail(sensitive, invocation, call);
  expect(JSON.stringify(detail)).not.toContain(secret);
  expect(detail.prompt?.redacted).toBe(true);
  expect(detail.tool?.arguments?.redacted).toBe(true);
});

it('bounds displayed content and preserves an explicit truncation signal', () => {
  const detail = buildAgentConversationDetail(
    {
      ...conversation,
      rounds: [{ ...conversation.rounds[0], input: { message: 'a'.repeat(25_000) } }],
    },
    invocation
  );
  expect(detail.prompt?.truncated).toBe(true);
  expect(detail.prompt?.text.length).toBeLessThan(21_000);
});

it('does not synthesize empty arguments or results when the source omits them', () => {
  const detail = buildAgentConversationDetail(
    {
      ...conversation,
      rounds: [
        {
          ...conversation.rounds[0],
          steps: [{ type: 'tool_call', tool_call_id: 'call-id', tool_id: call.toolName }],
        },
      ],
    },
    invocation,
    call
  );
  expect(detail.tool?.arguments).toBeUndefined();
  expect(detail.tool?.results).toBeUndefined();
});
