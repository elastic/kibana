/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Sha256 } from '@kbn/crypto-browser';
import {
  AGENT_LOOKBACK_DAYS,
  MAX_AGENT_INVOCATIONS,
  MAX_AGENT_TRACES,
  MAX_TRACE_SPANS,
} from './queries';
import type {
  AgentActivity,
  AgentDefinitionResponse,
  AgentInventoryItem,
  AgentInvocation,
  AgentOperationOutcome,
  AgentReportedUser,
  AgentRuntimeAttribution,
  AgentSearchResponse,
  AgentToolCall,
  AgentToolsResponse,
  AgentTraceDocument,
  AgentTraceHit,
} from './types';

/** Matches current and historical exports without changing trace privacy settings. */
export const getAgentTraceAliases = (agentId: string): string[] => [
  agentId,
  `custom-${new Sha256().update(agentId, 'utf8').digest('hex').slice(0, 16)}`,
];

export const buildAgentInventory = (
  spaceId: string,
  definitions: AgentDefinitionResponse,
  tools?: AgentToolsResponse
): AgentInventoryItem[] => {
  const toolMap = new Map(tools?.results.map((tool) => [tool.id, tool]));
  return definitions.results.map((agent) => ({
    id: agent.id,
    entityId: `ai_agent:${encodeURIComponent(spaceId)}:${encodeURIComponent(agent.id)}`,
    name: agent.name,
    description: agent.description,
    type: agent.type,
    readonly: agent.readonly,
    owner: agent.created_by
      ? { id: agent.created_by.id, name: agent.created_by.username }
      : undefined,
    accessMode: agent.access_control?.access_mode,
    configuredTools: [...new Set(agent.configuration.tools.flatMap((group) => group.tool_ids))].map(
      (id) => {
        const tool = toolMap.get(id);
        return {
          id,
          type: tool?.type,
          connectorId: tool?.type === 'mcp' ? tool.configuration?.connector_id : undefined,
          externalToolName: tool?.type === 'mcp' ? tool.configuration?.tool_name : undefined,
          confirmation: tool?.confirmation?.askUser,
          definitionAvailable: tool !== undefined,
        };
      }
    ),
    connectorIds: agent.configuration.connector_ids ?? [],
    subagentIds: agent.configuration.subagent_ids ?? [],
    enableElasticCapabilities: agent.configuration.enable_elastic_capabilities ?? false,
    traceAliases: getAgentTraceAliases(agent.id),
  }));
};

export const addAgentMetrics = (
  agents: AgentInventoryItem[],
  response?: AgentSearchResponse
): AgentInventoryItem[] =>
  agents.map((agent) => {
    const bucket = response?.aggregations?.agents?.buckets[agent.id];
    return {
      ...agent,
      activity: bucket
        ? {
            invocations: bucket.doc_count,
            failedInvocations: bucket.failures?.doc_count ?? 0,
            lastSeen: bucket.last_seen?.value_as_string,
          }
        : undefined,
    };
  });

export const getTotalHits = (response: AgentSearchResponse): number => {
  const total = response.hits.total;
  return typeof total === 'number' ? total : total?.value ?? response.hits.hits.length;
};

export const hasIncompleteSearch = (response: AgentSearchResponse): boolean =>
  response.timed_out === true || (response._shards?.failed ?? 0) > 0;

const getOutcome = (code?: string | number): AgentOperationOutcome => {
  if (code === 'Error' || code === 'ERROR' || code === 2 || code === '2') return 'failure';
  if (code === 'Ok' || code === 'OK' || code === 1 || code === '1') return 'success';
  return 'unknown';
};

const spanKey = (doc: AgentTraceDocument): string => `${doc.trace_id}:${doc.span_id}`;
const isAgentSpan = (doc: AgentTraceDocument): boolean =>
  doc.attributes?.['gen_ai.operation.name'] === 'invoke_agent' &&
  doc.attributes?.['elastic.inference.span.kind'] === 'AGENT';

const getReportedUser = (doc: AgentTraceDocument): AgentReportedUser | undefined => {
  const id = doc.attributes?.['user.id'];
  const name = doc.attributes?.['user.name'];
  const hash = doc.attributes?.['user.hash'];
  return id || name || hash ? { id, name, hash } : undefined;
};

const getRuntimeAttribution = (doc: AgentTraceDocument): AgentRuntimeAttribution | undefined => {
  const attrs = doc.attributes;
  const status = attrs?.['elastic.agent_builder.attribution.status'];
  if (!attrs || (status !== 'partial' && status !== 'unavailable')) return undefined;
  const capturePoint = attrs['elastic.agent_builder.attribution.capture_point'];
  const actorId = attrs['elastic.agent_builder.initiating_actor.id'];
  const actorHash = attrs['elastic.agent_builder.initiating_actor.hash'];
  const actorName = attrs['elastic.agent_builder.initiating_actor.name'];
  const callerType = attrs['elastic.agent_builder.caller.principal.type'];
  const callerId = attrs['elastic.agent_builder.caller.principal.id'];
  const callerHash = attrs['elastic.agent_builder.caller.principal.hash'];
  const callerName = attrs['elastic.agent_builder.caller.principal.name'];
  const apiKeyId = attrs['elastic.agent_builder.caller.api_key.id'];
  const apiKeyHash = attrs['elastic.agent_builder.caller.api_key.hash'];
  return {
    status,
    source: attrs['elastic.agent_builder.attribution.source'],
    capturePoint:
      capturePoint === 'request' || capturePoint === 'execution' ? capturePoint : undefined,
    initiatingActor:
      actorId || actorHash || actorName
        ? {
            id: actorId,
            hash: actorHash,
            name: actorName,
            source: attrs['elastic.agent_builder.initiating_actor.source'],
          }
        : undefined,
    caller:
      callerType || callerId || callerHash || callerName || apiKeyId || apiKeyHash
        ? {
            type: callerType,
            id: callerId,
            hash: callerHash,
            name: callerName,
            apiKeyId,
            apiKeyHash,
          }
        : undefined,
    delegationStatus: 'unknown',
    downstreamCredentialStatus: 'unknown',
  };
};

const getAncestors = (
  doc: AgentTraceDocument,
  spans: Map<string, AgentTraceHit>
): AgentTraceDocument[] => {
  const ancestors: AgentTraceDocument[] = [];
  const visited = new Set([spanKey(doc)]);
  let parentId = doc.parent_span_id;
  while (parentId) {
    const key = `${doc.trace_id}:${parentId}`;
    if (visited.has(key)) break;
    visited.add(key);
    const parent = spans.get(key)?._source;
    if (!parent) break;
    ancestors.push(parent);
    parentId = parent.parent_span_id;
  }
  return ancestors;
};

export const selectAgentTraceIds = (response: AgentSearchResponse): string[] =>
  [
    ...new Set(
      response.hits.hits.flatMap((hit) => (hit._source?.trace_id ? [hit._source.trace_id] : []))
    ),
  ].slice(0, MAX_AGENT_TRACES);

/** Attributes tools only to their nearest recorded agent ancestor in the same trace. */
export const buildAgentActivity = (
  agent: AgentInventoryItem,
  invocationResponse: AgentSearchResponse,
  traceResponse: AgentSearchResponse,
  traceIds: string[]
): AgentActivity => {
  const includedTraceIds = new Set(traceIds);
  const spans = new Map<string, AgentTraceHit>();
  for (const hit of [...traceResponse.hits.hits, ...invocationResponse.hits.hits]) {
    const doc = hit._source;
    if (doc?.trace_id && doc.span_id && includedTraceIds.has(doc.trace_id)) {
      spans.set(spanKey(doc), hit);
    }
  }
  const invocations: AgentInvocation[] = [];
  const invocationKeys = new Set<string>();
  invocationResponse.hits.hits.forEach((hit) => {
    const doc = hit._source;
    if (
      !doc?.trace_id ||
      !doc.span_id ||
      !doc['@timestamp'] ||
      !includedTraceIds.has(doc.trace_id) ||
      !isAgentSpan(doc) ||
      !agent.traceAliases.includes(doc.attributes?.['gen_ai.agent.id'] ?? '') ||
      invocationKeys.has(spanKey(doc))
    )
      return;
    invocationKeys.add(spanKey(doc));
    const ancestors = getAncestors(doc, spans);
    invocations.push({
      id: spanKey(doc),
      traceId: doc.trace_id,
      spanId: doc.span_id,
      timestamp: doc['@timestamp'],
      outcome: getOutcome(doc.status?.code),
      source: { index: hit._index, id: hit._id },
      conversationReference:
        doc.attributes?.['gen_ai.conversation.id'] ??
        ancestors.map((ancestor) => ancestor.attributes?.['gen_ai.conversation.id']).find(Boolean),
      reportedUser: getReportedUser(doc) ?? ancestors.map(getReportedUser).find(Boolean),
      attribution: getRuntimeAttribution(doc) ?? ancestors.map(getRuntimeAttribution).find(Boolean),
    });
  });
  const toolCalls: AgentToolCall[] = [];
  let unattributedToolCalls = 0;
  spans.forEach((hit) => {
    const doc = hit._source;
    if (
      !doc?.trace_id ||
      !doc.span_id ||
      !doc['@timestamp'] ||
      doc.attributes?.['gen_ai.operation.name'] !== 'execute_tool'
    )
      return;
    const nearestAgent = getAncestors(doc, spans).find(isAgentSpan);
    if (!nearestAgent) {
      unattributedToolCalls++;
      return;
    }
    if (!invocationKeys.has(spanKey(nearestAgent)) || !nearestAgent.span_id) return;
    const toolName = doc.attributes['gen_ai.tool.name'];
    toolCalls.push({
      id: spanKey(doc),
      traceId: doc.trace_id,
      spanId: doc.span_id,
      timestamp: doc['@timestamp'],
      outcome: getOutcome(doc.status?.code),
      source: { index: hit._index, id: hit._id },
      toolName: toolName ?? 'custom',
      toolCallId: doc.attributes['gen_ai.tool.call.id'],
      invocationSpanId: nearestAgent.span_id,
      nameRedacted: !toolName || toolName === 'custom',
    });
  });
  const totalInvocations = getTotalHits(invocationResponse);
  return {
    invocations,
    toolCalls: toolCalls.sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
    sampledInvocations: invocations.length,
    totalInvocations,
    tracesInspected: traceIds.length,
    unattributedToolCalls,
    truncated:
      totalInvocations > invocations.length ||
      getTotalHits(traceResponse) > traceResponse.hits.hits.length ||
      hasIncompleteSearch(invocationResponse) ||
      hasIncompleteSearch(traceResponse),
    lookbackDays: AGENT_LOOKBACK_DAYS,
    privacy: {
      hasHashedAgentId: invocationResponse.hits.hits.some(
        (hit) => hit._source?.attributes?.['gen_ai.agent.id'] !== agent.id
      ),
      hasRedactedToolNames: toolCalls.some((tool) => tool.nameRedacted),
      hasReportedUser: invocations.some((invocation) => invocation.reportedUser !== undefined),
    },
    limits: {
      invocations: MAX_AGENT_INVOCATIONS,
      traces: MAX_AGENT_TRACES,
      spans: MAX_TRACE_SPANS,
    },
  };
};
