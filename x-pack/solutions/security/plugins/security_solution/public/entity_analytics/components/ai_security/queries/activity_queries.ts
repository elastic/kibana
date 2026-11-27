/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { escapeStringValue } from '@kbn/esql-utils';
import {
  getAlertsIndex,
  SET_UNMAPPED_NULLIFY,
  toList,
} from '../../home/entities_grid/queries/esql';
import {
  ACTIVITY_MAX_OTEL_EVENTS,
  ACTIVITY_MAX_PROCESS_EVENTS,
  getClaudeCodeOtelIndex,
  getEndpointFileIndex,
  getEndpointNetworkIndex,
  getEndpointProcessIndex,
} from '../constants';
import type { AgentIdentity } from '../types';
import {
  agentOwnEventsFilter,
  inRange,
  PROCESS_COLUMNS,
  PROCESS_START_FILTER,
} from '../../../../../common/entity_analytics/ai_security/activity/own_process_queries';

export {
  buildOwnProcessesQuery,
  PROCESS_COLUMNS,
} from '../../../../../common/entity_analytics/ai_security/activity/own_process_queries';

const ACTIVITY_MAX_RUN_ALERTS = 500;

/**
 * When each of the agent's own processes ended, newest first. Defend can put fork, exec and end on
 * one event for a short-lived process, so any event carrying `end` counts.
 */
export const buildOwnProcessEndsQuery = (
  namespace: string,
  identity: AgentIdentity,
  from: string,
  to?: string
): string =>
  [
    SET_UNMAPPED_NULLIFY,
    `FROM ${getEndpointProcessIndex(namespace)}`,
    `| WHERE ${agentOwnEventsFilter(identity)} AND MV_CONTAINS(event.action, "end") AND ${inRange(
      from,
      to
    )}`,
    '| STATS ended_at = MAX(@timestamp) BY process.entity_id',
    '| SORT ended_at DESC',
    `| LIMIT ${ACTIVITY_MAX_PROCESS_EVENTS}`,
  ].join('\n');

/**
 * Start events of every tagged descendant of this agent product on the host, whatever OS user it
 * ran as. A `sudo` child runs as root, so filtering on `user.name` would drop it. The caller places
 * each process under a run by its ancestry. Read for one session's time range, newest first.
 */
export const buildDescendantProcessesQuery = (
  namespace: string,
  { agentName, hostId }: AgentIdentity,
  from: string,
  to?: string
): string =>
  [
    SET_UNMAPPED_NULLIFY,
    `FROM ${getEndpointProcessIndex(namespace)} METADATA _id, _index`,
    `| WHERE process.ai_agent.name == ${escapeStringValue(agentName)}`,
    `  AND host.id == ${escapeStringValue(hostId)}`,
    '  AND process.ai_agent.is_descendant == true',
    `  AND ${PROCESS_START_FILTER} AND ${inRange(from, to)}`,
    `| KEEP ${PROCESS_COLUMNS.join(', ')}`,
    '| SORT @timestamp DESC',
    `| LIMIT ${ACTIVITY_MAX_PROCESS_EVENTS}`,
  ].join('\n');

/** File and network activity per process, attached to the process steps. */
export const buildProcessSideEffectsQuery = (
  namespace: string,
  { agentName, hostId }: AgentIdentity,
  from: string,
  to?: string
): string =>
  [
    SET_UNMAPPED_NULLIFY,
    `FROM ${getEndpointFileIndex(namespace)}, ${getEndpointNetworkIndex(namespace)}`,
    `| WHERE process.ai_agent.name == ${escapeStringValue(agentName)}`,
    `  AND host.id == ${escapeStringValue(hostId)} AND ${inRange(from, to)}`,
    '| EVAL is_network = data_stream.dataset == "endpoint.events.network",',
    '    direct_ip = CASE(dns.question.name IS NULL, destination.ip, NULL)',
    '| STATS file_events = SUM(CASE(is_network, 0, 1)),',
    '    network_events = SUM(CASE(is_network, 1, 0)),',
    '    files = MV_SLICE(VALUES(file.path), 0, 9),',
    '    domains = MV_SLICE(VALUES(dns.question.name), 0, 9),',
    '    destinations = MV_SLICE(VALUES(direct_ip), 0, 9)',
    '  BY process.entity_id',
    `| LIMIT ${ACTIVITY_MAX_PROCESS_EVENTS}`,
  ].join('\n');

/**
 * Alerts on the agent with the fields that tie each one to a session, newest first. Alerts don't
 * carry `process.Ext.ancestry` today, so an alert on a deeper descendant is tied by its terminal
 * session and event time.
 */
export const buildRunAlertsQuery = (namespace: string, entityId: string, from: string): string =>
  [
    SET_UNMAPPED_NULLIFY,
    `FROM ${getAlertsIndex(namespace)} METADATA _id`,
    `| WHERE MV_CONTAINS(kibana.alert.entity.id, ${escapeStringValue(entityId)}) AND ${inRange(
      from
    )}`,
    '| KEEP @timestamp, _id, kibana.alert.original_time, process.entity_id,',
    '    process.parent.entity_id, process.Ext.ancestry, process.entry_leader.entity_id',
    '| SORT @timestamp DESC',
    `| LIMIT ${ACTIVITY_MAX_RUN_ALERTS}`,
  ].join('\n');

/**
 * Claude Code OTel, read through ECS `gen_ai.*` with the Claude fields as a fallback. OTel has no
 * host, so it is tied to the install by Defend's session ID when there is one, and otherwise by
 * the install's accounts within the session's time range. A resumed conversation keeps its ID
 * across launches, so the time range applies to session IDs too when given.
 */
export const buildOtelEventsQuery = (
  namespace: string,
  match:
    | { readonly sessionIds: readonly string[]; readonly from?: string; readonly to?: string }
    | { readonly emails: readonly string[]; readonly from: string; readonly to: string }
): string => {
  const range = match.from ? ` AND ${inRange(match.from, match.to)}` : '';
  const where =
    'sessionIds' in match
      ? `conversation_id IN (${toList(match.sessionIds)})${range}`
      : `user.email IN (${toList(match.emails)})${range}`;
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
    '| SORT @timestamp DESC',
    `| LIMIT ${ACTIVITY_MAX_OTEL_EVENTS}`,
  ].join('\n');
};
