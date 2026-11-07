/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type SecurityAgentProvider =
  | 'codex'
  | 'cursor'
  | 'agent_builder'
  | 'claude_desktop'
  | 'google_adk';
export type SecurityActivityType =
  | 'protected_file_access'
  | 'unapproved_export'
  | 'privilege_change'
  | 'suspicious_authentication'
  | 'restricted_tool_use';

export interface SecurityPolicyClause {
  id: string;
  name: string;
  condition: string;
  expected: 'deny' | 'allow';
}

export interface SecurityPolicyDefinition {
  policy_id?: string;
  policy_version?: number;
  description: string;
  scope: string;
  clauses: SecurityPolicyClause[];
}

export interface SecurityInvocationContext {
  request_id?: string;
  runtime_principal?: string;
  operation_outcome?: 'success' | 'failure' | 'unknown';
  tool_call_id: string;
  tool_name: string;
  turn_id?: string;
  observation_index: string;
  observation_id: string;
  input_record_hash: string;
  input_source: string;
  correlation: 'exact_request_id' | 'exact_native_observation';
  trace_id?: string;
  span_id?: string;
  invocation_span_id?: string;
  conversation_id?: string;
  actor_hash?: string;
  actor_round_id?: string;
  actor_source?:
    | 'native_trace'
    | 'conversation_round_author'
    | 'google_signed_id_token_verified_by_application';
  input: string;
  input_redacted: boolean;
  input_truncated: boolean;
  process_exit_code?: number;
}

export interface SecurityPolicyControl {
  id: string;
  name: string;
  version: string;
  engine: string;
  mode: 'enforce' | 'monitor';
  decision: 'deny' | 'allow';
  outcome: 'blocked' | 'allowed' | 'unknown';
  reason: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  clause?: SecurityPolicyClause;
  policy_sha256?: string;
  definition?: SecurityPolicyDefinition;
}

export interface SecurityActivityEvent {
  '@timestamp': string;
  event: {
    id: string;
    kind: 'event';
    dataset: 'entity_intelligence.security';
    action: string;
    category: Array<'file' | 'network' | 'iam' | 'authentication'>;
    type: Array<'access' | 'change' | 'creation' | 'start' | 'allowed' | 'denied'>;
    outcome: 'success' | 'failure' | 'unknown';
  };
  user: { id: string; name: string };
  host: { id: string; name: string };
  agent?: { id: string; name: string; type: SecurityAgentProvider };
  session?: { id: string };
  trace?: { id: string };
  entity?: { id: string[] };
  kibana: { space_id: string };
  entity_intelligence: {
    schema_version: 1;
    actor_provenance:
      | 'local_os_account'
      | 'generated'
      | 'authenticated_user'
      | 'source_identity'
      | 'unknown';
    agent?: {
      id: string;
      provider: SecurityAgentProvider;
      name: string;
      session_id?: string;
    };
    activity: { type: SecurityActivityType; target: string };
    control?: SecurityPolicyControl;
    request_id?: string;
    invocation?: SecurityInvocationContext;
    scenario?: { id: string; step: number; kind: 'controlled' | 'generated' };
  };
}

/** Resolves the exact space-specific security activity index. */
export const securityEventsIndex = (spaceId: string): string => {
  if (!/^[a-z0-9][a-z0-9_-]{0,63}$/.test(spaceId)) throw new Error('Invalid space ID.');
  return `logs-entity_intelligence.security-${spaceId}`;
};
