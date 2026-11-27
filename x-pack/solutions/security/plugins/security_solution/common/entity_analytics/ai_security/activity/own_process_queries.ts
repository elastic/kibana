/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { escapeStringValue } from '@kbn/esql-utils';
import { ACTIVITY_MAX_PROCESS_EVENTS, getEndpointProcessIndex } from './constants';
import type { AgentIdentity } from './types';

/**
 * `process.ai_agent.session_id` is unmapped in released Endpoint packages, so every activity
 * query sets `unmapped_fields` to nullify.
 */
export const SET_UNMAPPED_NULLIFY = 'SET unmapped_fields="nullify";';

/** Process start columns. */
export const PROCESS_COLUMNS = [
  '@timestamp',
  '_id',
  '_index',
  'event.action',
  'agent.id',
  'process.entity_id',
  'process.pid',
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

/** With `user.name` from `PROCESS_COLUMNS`, these say which agent a row belongs to. */
export const AGENT_KEY_COLUMNS = ['process.ai_agent.name', 'host.id'] as const;

export const PROCESS_START_FILTER =
  '(MV_CONTAINS(event.action, "exec") OR MV_CONTAINS(event.action, "fork"))';

/** Events from `from`, up to `to` when given. */
export const inRange = (from: string, to?: string): string =>
  [
    `@timestamp >= ${escapeStringValue(from)}`,
    ...(to ? [`@timestamp <= ${escapeStringValue(to)}`] : []),
  ].join(' AND ');

type AgentEventsKey = Pick<AgentIdentity, 'agentName' | 'hostId' | 'userName'>;

/** The agent's own events: its three identity fields, descendants left out. */
export const agentOwnEventsFilter = ({ agentName, hostId, userName }: AgentEventsKey): string =>
  [
    `process.ai_agent.name == ${escapeStringValue(agentName)}`,
    `host.id == ${escapeStringValue(hostId)}`,
    `user.name == ${escapeStringValue(userName)}`,
    '(process.ai_agent.is_descendant IS NULL OR process.ai_agent.is_descendant == false)',
  ].join(' AND ');

const ownProcessesQuery = ({
  namespace,
  filter,
  columns,
  from,
  to,
  limit,
}: {
  readonly namespace: string;
  readonly filter: string;
  readonly columns: readonly string[];
  readonly from: string;
  readonly to?: string;
  readonly limit: number;
}): string =>
  [
    SET_UNMAPPED_NULLIFY,
    `FROM ${getEndpointProcessIndex(namespace)} METADATA _id, _index`,
    `| WHERE ${filter} AND ${PROCESS_START_FILTER} AND ${inRange(from, to)}`,
    `| KEEP ${columns.join(', ')}`,
    '| SORT @timestamp DESC',
    `| LIMIT ${limit}`,
  ].join('\n');

/**
 * Start events of the agent's own processes: the launches and the agent's own re-execs, newest
 * first so a busy install loses its oldest sessions rather than its newest. This is the sessions
 * read: it carries no commands, so it stays small.
 */
export const buildOwnProcessesQuery = (
  namespace: string,
  identity: AgentEventsKey,
  from: string,
  to?: string
): string =>
  ownProcessesQuery({
    namespace,
    filter: agentOwnEventsFilter(identity),
    columns: PROCESS_COLUMNS,
    from,
    to,
    limit: ACTIVITY_MAX_PROCESS_EVENTS,
  });

/**
 * The sessions read for several agents at once, with the columns that say which agent each row is
 * for. Each agent matches exactly the rows its own sessions read would.
 */
export const buildAgentsOwnProcessesQuery = ({
  namespace,
  agents,
  from,
  to,
  limit,
}: {
  readonly namespace: string;
  readonly agents: readonly AgentEventsKey[];
  readonly from: string;
  readonly to: string;
  readonly limit: number;
}): string =>
  ownProcessesQuery({
    namespace,
    filter: `(${agents.map((agent) => `(${agentOwnEventsFilter(agent)})`).join(' OR ')})`,
    columns: [...AGENT_KEY_COLUMNS, ...PROCESS_COLUMNS],
    from,
    to,
    limit,
  });
