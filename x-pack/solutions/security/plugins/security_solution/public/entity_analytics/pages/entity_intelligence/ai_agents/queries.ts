/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { AgentInventoryItem } from './types';

export const AGENT_LOOKBACK_DAYS = 30;
export const MAX_INVENTORY_AGENTS = 500;
export const MAX_AGENT_INVOCATIONS = 100;
export const MAX_AGENT_TRACES = 20;
export const MAX_TRACE_SPANS = 2000;

export interface AgentSearchRequest {
  params: estypes.SearchRequest;
}

export const AGENT_TRACE_SOURCE_FIELDS = [
  '@timestamp',
  'trace_id',
  'span_id',
  'parent_span_id',
  'status.code',
  'attributes.gen_ai.agent.id',
  'attributes.gen_ai.operation.name',
  'attributes.gen_ai.tool.name',
  'attributes.gen_ai.conversation.id',
  'attributes.gen_ai.tool.call.id',
  'attributes.elastic.inference.span.kind',
  'attributes.user.id',
  'attributes.user.name',
  'attributes.user.hash',
  'attributes.elastic.agent_builder.attribution.status',
  'attributes.elastic.agent_builder.attribution.source',
  'attributes.elastic.agent_builder.attribution.capture_point',
  'attributes.elastic.agent_builder.caller.principal.type',
  'attributes.elastic.agent_builder.caller.principal.id',
  'attributes.elastic.agent_builder.caller.principal.hash',
  'attributes.elastic.agent_builder.caller.principal.name',
  'attributes.elastic.agent_builder.caller.api_key.id',
  'attributes.elastic.agent_builder.caller.api_key.hash',
  'attributes.elastic.agent_builder.initiating_actor.id',
  'attributes.elastic.agent_builder.initiating_actor.hash',
  'attributes.elastic.agent_builder.initiating_actor.name',
  'attributes.elastic.agent_builder.initiating_actor.source',
  'attributes.elastic.agent_builder.delegation.status',
  'attributes.elastic.agent_builder.downstream_credential.status',
];

export const getAgentTracesIndex = (spaceId: string): string =>
  `traces-agent_builder.otel-${spaceId}`;

const invocationFilters = (): estypes.QueryDslQueryContainer[] => [
  { range: { '@timestamp': { gte: `now-${AGENT_LOOKBACK_DAYS}d`, lte: 'now' } } },
  { term: { 'attributes.gen_ai.operation.name': 'invoke_agent' } },
  { term: { 'attributes.elastic.inference.span.kind': 'AGENT' } },
];

export const buildAgentInventoryQuery = (
  spaceId: string,
  agents: AgentInventoryItem[]
): AgentSearchRequest => ({
  params: {
    index: getAgentTracesIndex(spaceId),
    size: 0,
    allow_no_indices: true,
    ignore_unavailable: true,
    query: { bool: { filter: invocationFilters() } },
    aggs: {
      agents: {
        filters: {
          filters: Object.fromEntries(
            agents
              .slice(0, MAX_INVENTORY_AGENTS)
              .map((agent) => [
                agent.id,
                { terms: { 'attributes.gen_ai.agent.id': agent.traceAliases } },
              ])
          ),
        },
        aggs: {
          last_seen: { max: { field: '@timestamp', format: 'strict_date_time' } },
          failures: { filter: { terms: { 'status.code': ['Error', 'ERROR', '2'] } } },
        },
      },
    },
  },
});

export const buildAgentInvocationsQuery = (
  spaceId: string,
  agent: AgentInventoryItem
): AgentSearchRequest => ({
  params: {
    index: getAgentTracesIndex(spaceId),
    size: MAX_AGENT_INVOCATIONS,
    track_total_hits: true,
    allow_no_indices: true,
    ignore_unavailable: true,
    _source: AGENT_TRACE_SOURCE_FIELDS,
    query: {
      bool: {
        filter: [
          ...invocationFilters(),
          { terms: { 'attributes.gen_ai.agent.id': agent.traceAliases } },
        ],
      },
    },
    sort: [{ '@timestamp': 'desc' }],
  },
});

export const buildAgentTraceQuery = (spaceId: string, traceIds: string[]): AgentSearchRequest => ({
  params: {
    index: getAgentTracesIndex(spaceId),
    size: MAX_TRACE_SPANS,
    track_total_hits: true,
    allow_no_indices: true,
    ignore_unavailable: true,
    _source: AGENT_TRACE_SOURCE_FIELDS,
    query: { terms: { trace_id: traceIds.slice(0, MAX_AGENT_TRACES) } },
    sort: [{ '@timestamp': 'desc' }],
  },
});
