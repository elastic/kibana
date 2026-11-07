/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AgentCapturedContent,
  AgentCapturedInput,
  AgentCapturedText,
  AgentCapturedPrompt,
} from '../../../../../common/entity_intelligence/content_redaction';
import type { GoogleAdkContext } from '../../../../../common/entity_intelligence/google_adk';
import type { ExternalAgentProvider } from './external_agent_provider';
import type { AgentEvidenceSource, AgentOperationOutcome } from './types';

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

export type CodexObservationType = 'model_tool_call' | 'native_tool_completion';

export interface CodexToolSummary {
  name: string;
  count: number;
  failure_count: number;
  success_count: number;
  unknown_count: number;
}

export interface CodexDocument {
  '@timestamp': string;
  google_adk?: GoogleAdkContext;
  content?: AgentCapturedContent;
  event: { id: string; action: string; outcome: AgentOperationOutcome; ingested?: string };
  agent: { id: string; name: string; type: string; version?: string };
  owner?: CodexLocalOwner;
  creator?: CodexSessionCreator;
  session: {
    id: string;
    kind?: 'mcp_connection' | 'agent_run';
    is_chat_session?: boolean;
    parent_id?: string;
    runtime_id?: string;
    nickname?: string;
    role?: CodexSessionRole;
    agent_path?: string;
    start?: string;
    last_seen?: string;
    summary_complete?: boolean;
    tool_call_count?: number;
    model_tool_call_count?: number;
    native_tool_completion_count?: number;
    success_count?: number;
    failure_count?: number;
    unknown_count?: number;
    completed_turn_count?: number;
    aborted_turn_count?: number;
    tools?: CodexToolSummary[];
    models?: string[];
  };
  tool?: { name: string; call: { id: string }; type?: string };
  duration_ms?: number;
  process?: { exit_code?: number };
  turn?: { id?: string };
  model?: string;
  sandbox?: { mode?: string };
  approval?: { policy?: string };
  source: {
    kind: string;
    file_hash: string;
    record_hash?: string;
    schema_version: number;
    observation_type?: CodexObservationType;
  };
  kibana: { space_id: string };
}

export interface CodexHit {
  _index: string;
  _id: string;
  _source?: CodexDocument;
}

export interface CodexSearchResponse {
  timed_out?: boolean;
  _shards?: { total?: number; failed?: number };
  hits: { hits: CodexHit[]; total?: number | { value: number; relation: string } };
}

export interface CodexSession {
  googleAdk?: GoogleAdkContext;
  finalResponse?: AgentCapturedText;
  provider?: ExternalAgentProvider;
  contentMode?: 'metadata_only' | 'redacted_local';
  title?: string;
  titleSource?: string;
  titleRedacted?: boolean;
  titleTruncated?: boolean;
  prompts?: AgentCapturedPrompt[];
  promptsTotal?: number;
  promptsTruncated?: boolean;
  id: string;
  agentId: string;
  parentId?: string;
  runtimeId?: string;
  owner?: CodexLocalOwner;
  creator?: { id: string; accountId?: string; provenance: 'codex_session_creator' };
  nickname?: string;
  role?: CodexSessionRole;
  agentPath?: string;
  start: string;
  lastSeen: string;
  ingestedAt?: string;
  version?: string;
  model?: string;
  models?: string[];
  sandbox?: string;
  approval?: string;
  toolCount: number;
  modelToolCallCount?: number;
  nativeToolCompletionCount?: number;
  failures: number;
  successes: number;
  unknowns: number;
  completedTurns: number;
  abortedTurns: number;
  tools: CodexToolSummary[];
  summaryComplete: boolean;
  source: AgentEvidenceSource;
  fileHash: string;
}

export interface CodexToolEvent {
  googleAdk?: GoogleAdkContext;
  provider?: ExternalAgentProvider;
  contentMode?: 'metadata_only' | 'redacted_local';
  input?: AgentCapturedInput;
  output?: AgentCapturedText;
  id: string;
  sessionId: string;
  agentId: string;
  timestamp: string;
  toolName: string;
  toolType?: string;
  observationType?: CodexObservationType;
  model?: string;
  sandbox?: string;
  approval?: string;
  outcome: AgentOperationOutcome;
  durationMs?: number;
  exitCode?: number;
  turnId?: string;
  source: AgentEvidenceSource;
  recordHash?: string;
}
