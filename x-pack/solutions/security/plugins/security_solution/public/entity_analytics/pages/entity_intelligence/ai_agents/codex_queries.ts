/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { externalAgentIndex } from './external_agent_provider';
import type { ExternalAgentProvider } from './external_agent_provider';
import type { AgentSearchRequest } from './queries';

export const CODEX_SESSION_LIMIT = 200;
export const CODEX_TOOL_LIMIT = 5000;
export const CODEX_BASELINE_LIMIT = 10;
export const CODEX_SOURCE_FIELDS = [
  '@timestamp',
  'google_adk',
  'content.mode',
  'content.redaction_version',
  'content.prompts_total',
  'content.prompts_truncated',
  'content.title.text',
  'content.title.source',
  'content.title.recordHash',
  'content.title.redacted',
  'content.title.truncated',
  'event.id',
  'event.action',
  'event.outcome',
  'event.ingested',
  'agent.id',
  'agent.name',
  'agent.type',
  'agent.version',
  'owner.id',
  'owner.name',
  'owner.provenance',
  'creator.id',
  'creator.account_id',
  'creator.provenance',
  'session.id',
  'session.kind',
  'session.is_chat_session',
  'session.parent_id',
  'session.runtime_id',
  'session.nickname',
  'session.role',
  'session.agent_path',
  'session.start',
  'session.last_seen',
  'session.summary_complete',
  'session.tool_call_count',
  'session.model_tool_call_count',
  'session.native_tool_completion_count',
  'session.success_count',
  'session.failure_count',
  'session.unknown_count',
  'session.completed_turn_count',
  'session.aborted_turn_count',
  'session.models',
  'session.tools.name',
  'session.tools.count',
  'session.tools.failure_count',
  'session.tools.success_count',
  'session.tools.unknown_count',
  'tool.name',
  'tool.call.id',
  'tool.type',
  'duration_ms',
  'process.exit_code',
  'turn.id',
  'model',
  'sandbox.mode',
  'approval.policy',
  'source.kind',
  'source.observation_type',
  'source.file_hash',
  'source.record_hash',
  'source.schema_version',
  'kibana.space_id',
];

export const getCodexIndex = (spaceId: string, provider: ExternalAgentProvider = 'codex'): string =>
  externalAgentIndex(spaceId, provider);

export const buildCodexSessionsQuery = (
  spaceId: string,
  provider: ExternalAgentProvider = 'codex'
): AgentSearchRequest => ({
  params: {
    index: getCodexIndex(spaceId, provider),
    size: CODEX_SESSION_LIMIT,
    track_total_hits: true,
    allow_no_indices: true,
    ignore_unavailable: true,
    _source: CODEX_SOURCE_FIELDS,
    query: {
      bool: {
        filter: [
          { term: { 'kibana.space_id': spaceId } },
          { term: { 'event.action': 'session' } },
          { range: { 'session.last_seen': { gte: 'now-30d', lte: 'now' } } },
        ],
      },
    },
    sort: [{ 'session.last_seen': 'desc' }],
  },
});

export const buildCodexToolsQuery = (
  spaceId: string,
  agentId: string,
  sessionId: string,
  provider: ExternalAgentProvider = 'codex'
): AgentSearchRequest => ({
  params: {
    index: getCodexIndex(spaceId, provider),
    size: CODEX_TOOL_LIMIT,
    track_total_hits: true,
    allow_no_indices: true,
    ignore_unavailable: true,
    _source: CODEX_SOURCE_FIELDS,
    query: {
      bool: {
        filter: [
          { term: { 'kibana.space_id': spaceId } },
          { term: { 'agent.id': agentId } },
          { term: { 'session.id': sessionId } },
          { term: { 'event.action': 'tool_call' } },
        ],
      },
    },
    sort: [{ '@timestamp': 'asc' }, { 'event.id': 'asc' }],
  },
});

export const CODEX_CONTENT_FIELDS = [
  ...CODEX_SOURCE_FIELDS,
  'content.prompts.text',
  'content.prompts.source',
  'content.prompts.recordHash',
  'content.prompts.redacted',
  'content.prompts.truncated',
  'content.input.text',
  'content.input.source',
  'content.input.recordHash',
  'content.input.redacted',
  'content.input.truncated',
  'content.prompts.id',
  'content.prompts.timestamp',
  'content.input.kind',
  'content.output.text',
  'content.output.source',
  'content.output.recordHash',
  'content.output.redacted',
  'content.output.truncated',
];

export const buildCodexContentQuery = (
  spaceId: string,
  agentId: string,
  sessionId: string,
  documentId: string,
  action: 'session' | 'tool_call',
  provider: ExternalAgentProvider = 'codex'
): AgentSearchRequest => ({
  params: {
    index: getCodexIndex(spaceId, provider),
    size: 1,
    track_total_hits: true,
    allow_no_indices: true,
    ignore_unavailable: true,
    _source: CODEX_CONTENT_FIELDS,
    query: {
      bool: {
        filter: [
          { term: { 'kibana.space_id': spaceId } },
          { term: { 'agent.id': agentId } },
          { term: { 'session.id': sessionId } },
          { term: { 'event.action': action } },
          { ids: { values: [documentId] } },
        ],
      },
    },
  },
});
