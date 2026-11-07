/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentCapturedContent } from '../../common/entity_intelligence/content_redaction';

export interface CodexLocalOwner {
  id: string;
  name: string;
  provenance: 'local_os_account';
}

export interface CodexSessionCreator {
  id: string;
  account_id?: string;
  provenance: 'codex_session_creator';
}

export type CodexSessionRole = 'user' | 'subagent' | 'guardian_review';

export type CodexOutcome = 'success' | 'failure' | 'unknown';

export interface CodexToolSummary {
  name: string;
  count: number;
  success_count: number;
  failure_count: number;
  unknown_count: number;
}

export interface CodexObservation {
  '@timestamp': string;
  content?: AgentCapturedContent;
  event: {
    id: string;
    dataset: 'codex.session';
    action: 'session' | 'tool_call';
    outcome: CodexOutcome;
    ingested: string;
  };
  agent: { id: string; name: 'Codex'; type: 'codex'; version?: string };
  owner?: CodexLocalOwner;
  creator?: CodexSessionCreator;
  session: {
    id: string;
    runtime_id?: string;
    parent_id?: string;
    nickname?: string;
    role?: CodexSessionRole;
    agent_path?: string;
    start?: string;
    last_seen?: string;
    completed?: false;
    completion_known?: false;
    summary_complete?: boolean;
    tool_call_count?: number;
    model_tool_call_count?: number;
    native_tool_completion_count?: number;
    success_count?: number;
    failure_count?: number;
    unknown_count?: number;
    completed_turn_count?: number;
    aborted_turn_count?: number;
    models?: string[];
    tools?: CodexToolSummary[];
  };
  tool?: { name: string; call: { id: string }; type: string };
  turn?: { id: string };
  process?: { exit_code: number };
  duration_ms?: number;
  model?: string;
  sandbox?: { mode: string };
  approval?: { policy: string };
  source: {
    kind: 'codex_local_session';
    file_hash: string;
    record_hash?: string;
    id_kind?: 'item' | 'call';
    observation_type?: 'model_tool_call' | 'native_tool_completion';
    schema_version: 1;
  };
  kibana: { space_id: string };
}
