/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  addAgentMetrics,
  buildAgentActivity,
  buildAgentInventory,
  getAgentTraceAliases,
  selectAgentTraceIds,
} from './model';
import { MAX_AGENT_TRACES } from './queries';
import type { AgentInventoryItem, AgentSearchResponse, AgentTraceHit } from './types';

const agent: AgentInventoryItem = {
  id: 'agent-a',
  entityId: 'ai_agent:default:agent-a',
  name: 'Agent A',
  description: '',
  type: 'chat',
  readonly: false,
  configuredTools: [],
  connectorIds: [],
  subagentIds: [],
  enableElasticCapabilities: false,
  traceAliases: getAgentTraceAliases('agent-a'),
};

const hit = (
  spanId: string,
  parentId: string | undefined,
  operation: 'invoke_agent' | 'execute_tool' | 'chat',
  options: {
    agentId?: string;
    kind?: string;
    tool?: string;
    traceId?: string;
    userHash?: string;
    status?: string;
  } = {}
): AgentTraceHit => ({
  _index: 'traces-agent_builder.otel-default',
  _id: spanId,
  _source: {
    '@timestamp': '2026-10-12T20:00:00Z',
    trace_id: options.traceId ?? 'trace-1',
    span_id: spanId,
    parent_span_id: parentId,
    attributes: {
      'gen_ai.operation.name': operation,
      'gen_ai.agent.id': options.agentId,
      'elastic.inference.span.kind': options.kind,
      'gen_ai.tool.name': options.tool,
      'user.hash': options.userHash,
    },
    status: { code: options.status },
  },
});

const response = (hits: AgentTraceHit[], total = hits.length): AgentSearchResponse => ({
  hits: { hits, total: { value: total, relation: 'eq' } },
});

const invocation = hit('agent-span', 'chain', 'invoke_agent', {
  agentId: 'agent-a',
  kind: 'AGENT',
});

it('matches the exported SHA-256 prefix without discarding the original ID', () => {
  expect(getAgentTraceAliases('hello')).toEqual(['hello', 'custom-2cf24dba5fb0a30e']);
});

it('keeps explicit configuration distinct from observed activity and unresolved tool definitions', () => {
  const items = buildAgentInventory('space-one', {
    results: [
      {
        id: 'agent-a',
        name: 'Agent A',
        description: '',
        type: 'chat',
        readonly: false,
        configuration: { tools: [{ tool_ids: ['missing-tool', 'missing-tool'] }] },
      },
    ],
  });
  expect(items[0].configuredTools).toEqual([{ id: 'missing-tool', definitionAvailable: false }]);
  expect(items[0].activity).toBeUndefined();
  expect(addAgentMetrics(items)[0].activity).toBeUndefined();
  expect(items[0].entityId).toBe('ai_agent:space-one:agent-a');
});

it('counts only AGENT spans and assigns tools to the nearest agent, excluding subagent tools', () => {
  const chain = hit('chain', undefined, 'invoke_agent', {
    agentId: 'agent-a',
    kind: 'CHAIN',
    userHash: 'hashed-user',
  });
  const traces = response([
    chain,
    invocation,
    hit('llm', 'agent-span', 'chat'),
    hit('own-tool', 'llm', 'execute_tool', { tool: 'search', status: 'Ok' }),
    hit('subagent', 'agent-span', 'invoke_agent', { agentId: 'agent-b', kind: 'AGENT' }),
    hit('subagent-tool', 'subagent', 'execute_tool', { tool: 'send_message' }),
  ]);
  const activity = buildAgentActivity(agent, response([invocation, chain]), traces, ['trace-1']);
  expect(activity.invocations).toHaveLength(1);
  expect(activity.invocations[0].reportedUser).toEqual({ hash: 'hashed-user' });
  expect(activity.toolCalls.map((tool) => tool.toolName)).toEqual(['search']);
  expect(activity.toolCalls[0].invocationSpanId).toBe('agent-span');
  expect(activity.toolCalls[0].outcome).toBe('success');
});

it('does not attribute orphaned tools, cross-trace parents, or cyclic parent links', () => {
  const traces = response([
    invocation,
    hit('orphan', 'missing', 'execute_tool'),
    hit('cross-trace', 'agent-span', 'execute_tool', { traceId: 'trace-2' }),
    hit('cycle-a', 'cycle-b', 'execute_tool'),
    hit('cycle-b', 'cycle-a', 'chat'),
  ]);
  const activity = buildAgentActivity(agent, response([invocation]), traces, [
    'trace-1',
    'trace-2',
  ]);
  expect(activity.toolCalls).toHaveLength(0);
  expect(activity.unattributedToolCalls).toBe(3);
});

it('flags sampled and truncated evidence without converting unknown outcomes to success', () => {
  const tool = hit('tool', 'agent-span', 'execute_tool', { tool: 'custom' });
  const activity = buildAgentActivity(agent, response([invocation], 200), response([tool], 3000), [
    'trace-1',
  ]);
  expect(activity.totalInvocations).toBe(200);
  expect(activity.sampledInvocations).toBe(1);
  expect(activity.truncated).toBe(true);
  expect(activity.toolCalls[0].outcome).toBe('unknown');
  expect(activity.toolCalls[0].nameRedacted).toBe(true);
  expect(activity.privacy.hasReportedUser).toBe(false);
});

it('accepts hashed agent IDs and preserves source documents for review', () => {
  const hashed = hit('hashed', undefined, 'invoke_agent', {
    agentId: agent.traceAliases[1],
    kind: 'AGENT',
  });
  const activity = buildAgentActivity(agent, response([hashed]), response([]), ['trace-1']);
  expect(activity.invocations).toHaveLength(1);
  expect(activity.privacy.hasHashedAgentId).toBe(true);
  expect(activity.invocations[0].source).toEqual({
    index: 'traces-agent_builder.otel-default',
    id: 'hashed',
  });
});

it('bounds the distinct trace expansion and avoids wasting capacity on repeated traces', () => {
  const hits = Array.from({ length: MAX_AGENT_TRACES + 2 }, (_, index) =>
    hit(`span-${index}`, undefined, 'invoke_agent', { traceId: `trace-${index}` })
  );
  expect(selectAgentTraceIds(response([hits[0], ...hits]))).toHaveLength(MAX_AGENT_TRACES);
});

it('keeps trusted caller attribution separate from legacy actor context and unknown downstream credentials', () => {
  const attributed: AgentTraceHit = {
    ...invocation,
    _source: {
      ...invocation._source,
      attributes: {
        ...invocation._source?.attributes,
        'user.hash': 'legacy-owner',
        'elastic.agent_builder.attribution.status': 'partial',
        'elastic.agent_builder.attribution.source': 'kibana_authc',
        'elastic.agent_builder.caller.principal.type': 'api_key',
        'elastic.agent_builder.caller.api_key.hash': 'opaque-key-hash',
      },
    },
  };
  const activity = buildAgentActivity(agent, response([attributed]), response([]), ['trace-1']);
  expect(activity.invocations[0].reportedUser).toEqual({ hash: 'legacy-owner' });
  expect(activity.invocations[0].attribution?.initiatingActor).toBeUndefined();
  expect(activity.invocations[0].attribution?.caller).toEqual({
    type: 'api_key',
    apiKeyHash: 'opaque-key-hash',
  });
  expect(activity.invocations[0].attribution?.downstreamCredentialStatus).toBe('unknown');
  expect(activity.invocations[0].attribution?.delegationStatus).toBe('unknown');
});

it('preserves conversation and tool-call references for exact content joins across recorded ancestry', () => {
  const chain: AgentTraceHit = {
    ...hit('chain', undefined, 'invoke_agent', { agentId: 'agent-a', kind: 'CHAIN' }),
    _source: {
      trace_id: 'trace-1',
      span_id: 'chain',
      attributes: { 'gen_ai.conversation.id': 'privacy-normalized-conversation' },
    },
  };
  const tool = hit('linked-tool', 'agent-span', 'execute_tool', { tool: 'search' });
  const linked: AgentTraceHit = {
    ...tool,
    _source: {
      ...tool._source,
      attributes: { ...tool._source?.attributes, 'gen_ai.tool.call.id': 'provider-call-id' },
    },
  };
  const activity = buildAgentActivity(agent, response([invocation]), response([chain, linked]), [
    'trace-1',
  ]);
  expect(activity.invocations[0].conversationReference).toBe('privacy-normalized-conversation');
  expect(activity.toolCalls[0].toolCallId).toBe('provider-call-id');
});
