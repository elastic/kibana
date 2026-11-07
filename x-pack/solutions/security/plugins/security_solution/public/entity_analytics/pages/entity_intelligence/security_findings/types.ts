/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IntelligenceEntity } from '../common';
import type {
  SecurityPolicyClause,
  SecurityPolicyDefinition,
} from '../../../../../common/entity_intelligence/security_events';

export type SecurityAgentProvider =
  | 'codex'
  | 'cursor'
  | 'claude_desktop'
  | 'google_adk'
  | 'agent_builder';
export type SecurityFindingScope =
  | { type: 'all' }
  | { type: 'policy'; policyId: string }
  | { type: 'entity'; entity: IntelligenceEntity }
  | {
      type: 'agent';
      provider: SecurityAgentProvider;
      agentId: string;
      sessionId?: string;
      traceId?: string;
    };

export interface SecurityEvidenceReference {
  index: string;
  id: string;
}

export interface SecurityFinding {
  id: string;
  timestamp: string;
  detectedAt?: string;
  traceId?: string;
  scenario?: { id: string; step: number; kind: 'controlled' | 'generated' };
  title: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'acknowledged' | 'closed' | 'unknown';
  kind: 'detection' | 'guardrail' | 'policy_violation';
  outcome: 'blocked' | 'allowed' | 'unknown';
  reason?: string;
  action?: string;
  target?: string;
  actor?: { id?: string; name?: string; provenance?: string };
  host?: { id?: string; name?: string };
  service?: { id?: string; name?: string };
  agent?: { id: string; provider: SecurityAgentProvider; name?: string; sessionId?: string };
  rule: { id?: string; name: string };
  invocation?: {
    requestId?: string;
    runtimePrincipal?: string;
    actorSource?: string;
    operationOutcome?: 'success' | 'failure' | 'unknown';
    toolCallId: string;
    toolName: string;
    turnId?: string;
    source: SecurityEvidenceReference;
    inputRecordHash: string;
    inputSource: string;
    correlation: 'exact_request_id' | 'exact_native_observation';
    traceId?: string;
    spanId?: string;
    invocationSpanId?: string;
    conversationId?: string;
    input: string;
    inputRedacted: boolean;
    inputTruncated: boolean;
    processExitCode?: number;
  };
  policy?: {
    id: string;
    name: string;
    mode: 'enforce' | 'monitor';
    decision: 'deny' | 'allow';
    engine: string;
    reason?: string;
    version?: string;
    clause?: SecurityPolicyClause;
    sha256?: string;
    definition?: SecurityPolicyDefinition;
  };
  source: SecurityEvidenceReference;
  ancestors: SecurityEvidenceReference[];
  entityIds: string[];
}

type FieldValue = string | number | boolean | null | Array<string | number | boolean | null>;
interface IdentityFields {
  id?: FieldValue;
  name?: FieldValue;
}
export interface SecurityPolicyClauseFields {
  id?: FieldValue;
  name?: FieldValue;
  condition?: FieldValue;
  expected?: FieldValue;
}
export interface SecurityInvocationFields {
  request_id?: FieldValue;
  runtime_principal?: FieldValue;
  actor_source?: FieldValue;
  operation_outcome?: FieldValue;
  trace_id?: FieldValue;
  span_id?: FieldValue;
  invocation_span_id?: FieldValue;
  conversation_id?: FieldValue;
  tool_call_id?: FieldValue;
  tool_name?: FieldValue;
  turn_id?: FieldValue;
  observation_index?: FieldValue;
  observation_id?: FieldValue;
  input_record_hash?: FieldValue;
  input_source?: FieldValue;
  correlation?: FieldValue;
  input?: FieldValue;
  input_redacted?: FieldValue;
  input_truncated?: FieldValue;
  process_exit_code?: FieldValue;
}
export interface SecurityControlFields {
  id?: FieldValue;
  name?: FieldValue;
  version?: FieldValue;
  engine?: FieldValue;
  mode?: FieldValue;
  decision?: FieldValue;
  outcome?: FieldValue;
  reason?: FieldValue;
  clause?: SecurityPolicyClauseFields;
  policy_sha256?: FieldValue;
  definition?: {
    policy_id?: FieldValue;
    policy_version?: FieldValue;
    description?: FieldValue;
    scope?: FieldValue;
    clauses?: SecurityPolicyClauseFields[];
  };
}
export interface SecurityContextFields {
  schema_version?: FieldValue;
  control?: SecurityControlFields;
  request_id?: FieldValue;
  invocation?: SecurityInvocationFields;
  activity?: { type?: FieldValue; target?: FieldValue };
  agent?: { id?: FieldValue; provider?: FieldValue; name?: FieldValue; session_id?: FieldValue };
  actor_provenance?: FieldValue;
  scenario?: { id?: FieldValue; step?: FieldValue; kind?: FieldValue };
}
interface AncestorFields {
  index?: FieldValue;
  id?: FieldValue;
  type?: FieldValue;
}
interface AlertFields {
  original_time?: FieldValue;
  rule?: { uuid?: FieldValue; name?: FieldValue };
  reason?: FieldValue;
  severity?: FieldValue;
  workflow_status?: FieldValue;
  ancestors?: AncestorFields[];
}
export interface SecurityAlertSource {
  '@timestamp'?: FieldValue;
  'kibana.alert.original_time'?: FieldValue;
  'kibana.alert.rule.uuid'?: FieldValue;
  'kibana.alert.rule.name'?: FieldValue;
  'kibana.alert.reason'?: FieldValue;
  'kibana.alert.severity'?: FieldValue;
  'kibana.alert.workflow_status'?: FieldValue;
  'kibana.alert.ancestors'?: AncestorFields[];
  'kibana.space_ids'?: FieldValue;
  'entity.id'?: FieldValue;
  'user.id'?: FieldValue;
  'user.name'?: FieldValue;
  'host.id'?: FieldValue;
  'host.name'?: FieldValue;
  'service.id'?: FieldValue;
  'service.name'?: FieldValue;
  'agent.id'?: FieldValue;
  'agent.type'?: FieldValue;
  'agent.name'?: FieldValue;
  'trace.id'?: FieldValue;
  'event.action'?: FieldValue;
  kibana?: { alert?: AlertFields; space_ids?: FieldValue; space_id?: FieldValue };
  entity_intelligence?: SecurityContextFields;
  entity?: { id?: FieldValue };
  user?: IdentityFields;
  host?: IdentityFields;
  service?: IdentityFields;
  agent?: IdentityFields & { type?: FieldValue };
  trace?: { id?: FieldValue };
  event?: { action?: FieldValue; outcome?: FieldValue };
}
export interface SecurityAlertHit {
  _index: string;
  _id: string;
  _source?: SecurityAlertSource;
}
export interface SecuritySearchResponse {
  timed_out?: boolean;
  timeout?: boolean;
  _shards?: { total?: number; failed?: number };
  hits: {
    total?: number | { value: number; relation: string };
    hits: SecurityAlertHit[];
  };
}

export interface SecurityFindingsResult {
  findings: SecurityFinding[];
  isLoading: boolean;
  isRefreshing: boolean;
  unavailable: boolean;
  partial: boolean;
  total?: number;
  refetch: () => void;
}
