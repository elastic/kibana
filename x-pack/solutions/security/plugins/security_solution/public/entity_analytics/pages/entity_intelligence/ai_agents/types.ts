/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type AgentDataStatus = 'available' | 'empty' | 'partial' | 'unavailable';
export type AgentOperationOutcome = 'success' | 'failure' | 'unknown';

export interface AgentEvidenceSource {
  index: string;
  id: string;
}

export interface AgentConfiguredTool {
  id: string;
  type?: string;
  connectorId?: string;
  externalToolName?: string;
  confirmation?: string;
  definitionAvailable: boolean;
}

export interface AgentActivityMetrics {
  invocations: number;
  failedInvocations: number;
  lastSeen?: string;
}

export interface AgentInventoryItem {
  id: string;
  entityId: string;
  name: string;
  description: string;
  type: string;
  readonly: boolean;
  owner?: { id?: string; name?: string };
  accessMode?: string;
  configuredTools: AgentConfiguredTool[];
  connectorIds: string[];
  subagentIds: string[];
  enableElasticCapabilities: boolean;
  activity?: AgentActivityMetrics;
  traceAliases: string[];
}

export interface AgentReportedUser {
  id?: string;
  name?: string;
  hash?: string;
}

export interface AgentIdentityReference {
  id?: string;
  hash?: string;
  name?: string;
}

export interface AgentRuntimeAttribution {
  status: 'partial' | 'unavailable';
  source?: string;
  capturePoint?: 'request' | 'execution';
  initiatingActor?: AgentIdentityReference & { source?: string };
  caller?: AgentIdentityReference & { type?: string; apiKeyId?: string; apiKeyHash?: string };
  delegationStatus: 'unknown';
  downstreamCredentialStatus: 'unknown';
}

export interface AgentInvocation {
  id: string;
  traceId: string;
  spanId: string;
  timestamp: string;
  outcome: AgentOperationOutcome;
  source: AgentEvidenceSource;
  conversationReference?: string;
  reportedUser?: AgentReportedUser;
  attribution?: AgentRuntimeAttribution;
}

export interface AgentToolCall {
  id: string;
  traceId: string;
  spanId: string;
  timestamp: string;
  outcome: AgentOperationOutcome;
  source: AgentEvidenceSource;
  toolName: string;
  toolCallId?: string;
  invocationSpanId: string;
  nameRedacted: boolean;
}

export interface AgentActivity {
  invocations: AgentInvocation[];
  toolCalls: AgentToolCall[];
  sampledInvocations: number;
  totalInvocations: number;
  tracesInspected: number;
  unattributedToolCalls: number;
  truncated: boolean;
  lookbackDays: number;
  privacy: { hasHashedAgentId: boolean; hasRedactedToolNames: boolean; hasReportedUser: boolean };
  limits: { invocations: number; traces: number; spans: number };
}

export interface AgentInventoryResult {
  agents: AgentInventoryItem[];
  isLoading: boolean;
  isRefreshing: boolean;
  status: AgentDataStatus;
  definitionsStatus: AgentDataStatus;
  toolsStatus: AgentDataStatus;
  activityStatus: AgentDataStatus;
  error?: string;
  refetch: () => void;
  lookbackDays: number;
}

export interface AgentActivityResult {
  status: AgentDataStatus;
  isLoading: boolean;
  isRefreshing: boolean;
  activity?: AgentActivity;
  error?: string;
  refetch: () => void;
}

export interface AgentDefinitionResponse {
  results: Array<{
    id: string;
    name: string;
    description: string;
    type: string;
    readonly: boolean;
    created_by?: { id?: string; username?: string };
    access_control?: { access_mode: string } | null;
    configuration: {
      tools: Array<{ tool_ids: string[] }>;
      connector_ids?: string[];
      subagent_ids?: string[];
      enable_elastic_capabilities?: boolean;
    };
  }>;
}

export interface AgentToolsResponse {
  results: Array<{
    id: string;
    type: string;
    configuration?: { connector_id?: string; tool_name?: string };
    confirmation?: { askUser?: string };
  }>;
}

export interface AgentTraceAttributes {
  'gen_ai.agent.id'?: string;
  'gen_ai.operation.name'?: string;
  'gen_ai.tool.name'?: string;
  'gen_ai.conversation.id'?: string;
  'gen_ai.tool.call.id'?: string;
  'elastic.inference.span.kind'?: string;
  'user.id'?: string;
  'user.name'?: string;
  'user.hash'?: string;
  'elastic.agent_builder.attribution.status'?: string;
  'elastic.agent_builder.attribution.source'?: string;
  'elastic.agent_builder.attribution.capture_point'?: string;
  'elastic.agent_builder.caller.principal.type'?: string;
  'elastic.agent_builder.caller.principal.id'?: string;
  'elastic.agent_builder.caller.principal.hash'?: string;
  'elastic.agent_builder.caller.principal.name'?: string;
  'elastic.agent_builder.caller.api_key.id'?: string;
  'elastic.agent_builder.caller.api_key.hash'?: string;
  'elastic.agent_builder.initiating_actor.id'?: string;
  'elastic.agent_builder.initiating_actor.hash'?: string;
  'elastic.agent_builder.initiating_actor.name'?: string;
  'elastic.agent_builder.initiating_actor.source'?: string;
  'elastic.agent_builder.delegation.status'?: string;
  'elastic.agent_builder.downstream_credential.status'?: string;
}

export interface AgentTraceDocument {
  '@timestamp'?: string;
  trace_id?: string;
  span_id?: string;
  parent_span_id?: string;
  status?: { code?: string | number };
  attributes?: AgentTraceAttributes;
}

export interface AgentTraceHit {
  _index: string;
  _id: string;
  _source?: AgentTraceDocument;
}

export interface AgentSearchResponse {
  timed_out?: boolean;
  _shards?: { total?: number; failed?: number };
  hits: { hits: AgentTraceHit[]; total?: number | { value: number; relation: string } };
  aggregations?: {
    agents?: {
      buckets: Record<
        string,
        {
          doc_count: number;
          last_seen?: { value_as_string?: string };
          failures?: { doc_count: number };
        }
      >;
    };
  };
}
