/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { escapeStringValue } from '@kbn/esql-utils';
import { SET_UNMAPPED_NULLIFY, toList } from '../../home/entities_grid/queries/esql';
import {
  ACTIVITY_MAX_OTEL_EVENTS,
  ACTIVITY_MAX_PROCESS_EVENTS,
  getClaudeCodeOtelIndex,
  getEndpointFileIndex,
  getEndpointNetworkIndex,
  getEndpointProcessIndex,
} from '../constants';
import type { AgentIdentity } from '../types';
import { agentOwnEventsFilter } from './agent_queries';

/**
 * Process start columns. `process.ai_agent.session_id` is unmapped in released Endpoint packages,
 * which is why every activity query sets `unmapped_fields` to nullify.
 */
export const PROCESS_COLUMNS = [
  '@timestamp',
  '_id',
  '_index',
  'event.action',
  'process.entity_id',
  'process.parent.entity_id',
  'process.Ext.ancestry',
  'process.name',
  'process.executable',
  'process.command_line',
  'process.args',
  'process.working_directory',
  'user.name',
  'process.ai_agent.session_id',
  'process.ai_agent.email',
  'process.ai_agent.is_descendant',
  'process.entry_leader.entity_id',
  'process.entry_leader.start',
  'process.entry_leader.name',
  'process.entry_leader.entry_meta.type',
  'process.interactive',
] as const;

const PROCESS_START = '(MV_CONTAINS(event.action, "exec") OR MV_CONTAINS(event.action, "fork"))';

const since = (from: string): string => `@timestamp >= ${escapeStringValue(from)}`;

/** Start events of the agent's own processes: the launches and the agent's own re-execs. */
export const buildOwnProcessesQuery = (
  namespace: string,
  identity: AgentIdentity,
  from: string
): string =>
  [
    SET_UNMAPPED_NULLIFY,
    `FROM ${getEndpointProcessIndex(namespace)} METADATA _id, _index`,
    `| WHERE ${agentOwnEventsFilter(identity)} AND ${PROCESS_START} AND ${since(from)}`,
    `| KEEP ${PROCESS_COLUMNS.join(', ')}`,
    '| SORT @timestamp ASC',
    `| LIMIT ${ACTIVITY_MAX_PROCESS_EVENTS}`,
  ].join('\n');

/**
 * Start events of every tagged descendant of this agent product on the host, whatever OS user it
 * ran as. A `sudo` child runs as root, so filtering on `user.name` would drop it. The caller places
 * each process under a run by its ancestry.
 */
export const buildDescendantProcessesQuery = (
  namespace: string,
  { agentName, hostId }: AgentIdentity,
  from: string
): string =>
  [
    SET_UNMAPPED_NULLIFY,
    `FROM ${getEndpointProcessIndex(namespace)} METADATA _id, _index`,
    `| WHERE process.ai_agent.name == ${escapeStringValue(agentName)}`,
    `  AND host.id == ${escapeStringValue(hostId)}`,
    '  AND process.ai_agent.is_descendant == true',
    `  AND ${PROCESS_START} AND ${since(from)}`,
    `| KEEP ${PROCESS_COLUMNS.join(', ')}`,
    '| SORT @timestamp ASC',
    `| LIMIT ${ACTIVITY_MAX_PROCESS_EVENTS}`,
  ].join('\n');

/** File and network activity per process, attached to the process steps. */
export const buildProcessSideEffectsQuery = (
  namespace: string,
  { agentName, hostId }: AgentIdentity,
  from: string
): string =>
  [
    SET_UNMAPPED_NULLIFY,
    `FROM ${getEndpointFileIndex(namespace)}, ${getEndpointNetworkIndex(namespace)}`,
    `| WHERE process.ai_agent.name == ${escapeStringValue(agentName)}`,
    `  AND host.id == ${escapeStringValue(hostId)} AND ${since(from)}`,
    '| EVAL is_network = data_stream.dataset == "endpoint.events.network"',
    '| STATS file_events = SUM(CASE(is_network, 0, 1)),',
    '    network_events = SUM(CASE(is_network, 1, 0)),',
    '    files = MV_SLICE(VALUES(file.path), 0, 9),',
    '    destinations = MV_SLICE(VALUES(destination.ip), 0, 9)',
    '  BY process.entity_id',
    `| LIMIT ${ACTIVITY_MAX_PROCESS_EVENTS}`,
  ].join('\n');

/**
 * Claude Code OTel, read through ECS `gen_ai.*` with the Claude fields as a fallback. OTel has no
 * host, so it is tied to the install by Defend's session ID when there is one, and otherwise by
 * the install's accounts within its active window.
 */
export const buildOtelEventsQuery = (
  namespace: string,
  match:
    | { readonly sessionIds: readonly string[] }
    | { readonly emails: readonly string[]; readonly from: string; readonly to: string }
): string => {
  const where =
    'sessionIds' in match
      ? `conversation_id IN (${toList(match.sessionIds)})`
      : `user.email IN (${toList(match.emails)}) AND ${since(
          match.from
        )} AND @timestamp <= ${escapeStringValue(match.to)}`;
  return [
    SET_UNMAPPED_NULLIFY,
    `FROM ${getClaudeCodeOtelIndex(namespace)}`,
    '| EVAL conversation_id = COALESCE(gen_ai.conversation.id, claude_code.events.session.id)',
    `| WHERE ${where}`,
    '| EVAL prompt = COALESCE(TO_STRING(gen_ai.input.messages), claude_code.events.prompt_text),',
    '    event_name = COALESCE(claude_code.events.event.name, event.action),',
    '    prompt_id = claude_code.events.prompt.id',
    '| KEEP @timestamp, conversation_id, event_name, prompt, prompt_id, gen_ai.tool.name,',
    '    process.command_line, claude_code.events.mcp_server_name, claude_code.events.decision_type,',
    '    gen_ai.request.model, gen_ai.usage.input_tokens, gen_ai.usage.output_tokens, tags',
    '| SORT @timestamp ASC',
    `| LIMIT ${ACTIVITY_MAX_OTEL_EVENTS}`,
  ].join('\n');
};
