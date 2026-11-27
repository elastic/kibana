/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { SearchHit, SortResults } from '@elastic/elasticsearch/lib/api/types';
import { ACTIVITY_MAX_PROCESS_EVENTS } from '../../../../../common/entity_analytics/ai_security/activity/constants';
import { firstString } from '../../../../../common/entity_analytics/ai_security/activity/esql_values';
import { buildAgentsOwnProcessesQuery } from '../../../../../common/entity_analytics/ai_security/activity/own_process_queries';
import { toProcessEvent } from '../../../../../common/entity_analytics/ai_security/activity/process_records';
import type {
  AgentIdentity,
  ProcessRecord,
  TimeWindow,
} from '../../../../../common/entity_analytics/ai_security/activity/types';

const PAGE_SIZE = 1_000;
/** Agents per events query. Each adds one clause to the query's WHERE. */
const AGENTS_PER_QUERY = 100;
/** ES|QL's default `result_truncation_max_size`. A batch that fills it is split and read again. */
const MAX_ROWS_PER_QUERY = 10_000;

const FIELDS = {
  id: 'entity.id',
  type: 'entity.EngineMetadata.Type',
  agentName: 'process.ai_agent.name',
  hostId: 'host.id',
  userName: 'user.name',
} as const;

type HitFields = SearchHit['fields'];
type EsqlRecord = Record<string, unknown>;

export const toAgentIdentity = (fields: HitFields): AgentIdentity | undefined => {
  const read = (name: string) => firstString(fields?.[name]);
  const entityId = read(FIELDS.id);
  const agentName = read(FIELDS.agentName);
  const hostId = read(FIELDS.hostId);
  const userName = read(FIELDS.userName);
  return entityId && agentName && hostId && userName
    ? { entityId, agentName, hostId, userName }
    : undefined;
};

/** Reads every `ai_agent` row in the latest index. */
export const readAgentIdentities = async (
  esClient: ElasticsearchClient,
  index: string,
  signal?: AbortSignal
): Promise<AgentIdentity[]> => {
  const agents: AgentIdentity[] = [];
  let searchAfter: SortResults | undefined;
  while (!signal?.aborted) {
    const { hits } = await esClient.search(
      {
        index,
        size: PAGE_SIZE,
        query: { term: { [FIELDS.type]: 'ai_agent' } },
        _source: false,
        fields: Object.values(FIELDS),
        sort: [{ [FIELDS.id]: 'asc' }],
        ...(searchAfter ? { search_after: searchAfter } : {}),
      },
      { signal }
    );
    hits.hits.forEach(({ fields }) => {
      const agent = toAgentIdentity(fields);
      if (agent) agents.push(agent);
    });
    if (hits.hits.length < PAGE_SIZE) break;
    searchAfter = hits.hits[hits.hits.length - 1].sort;
  }
  return agents;
};

const agentKey = (agentName?: string, hostId?: string, userName?: string): string =>
  JSON.stringify([agentName, hostId, userName]);

/**
 * Splits rows from a batched read by agent, newest first, keeping each agent's newest events up
 * to the limit its own sessions read in the flyout has, so both count the same sessions.
 */
export const groupOwnEventsByAgent = (
  agents: readonly AgentIdentity[],
  rows: readonly EsqlRecord[]
): Map<string, ProcessRecord[]> => {
  const idByKey = new Map(
    agents.map(({ entityId, agentName, hostId, userName }) => [
      agentKey(agentName, hostId, userName),
      entityId,
    ])
  );
  const events = new Map<string, ProcessRecord[]>(agents.map(({ entityId }) => [entityId, []]));
  const sorted = [...rows].sort((a, b) =>
    (firstString(b['@timestamp']) ?? '').localeCompare(firstString(a['@timestamp']) ?? '')
  );
  for (const row of sorted) {
    const entityId = idByKey.get(
      agentKey(
        firstString(row['process.ai_agent.name']),
        firstString(row['host.id']),
        firstString(row['user.name'])
      )
    );
    const list = entityId ? events.get(entityId) : undefined;
    const event = toProcessEvent(row);
    if (list && event && list.length < ACTIVITY_MAX_PROCESS_EVENTS) list.push(event);
  }
  return events;
};

const toRecords = ({
  columns,
  values,
}: {
  columns: ReadonlyArray<{ name: string }>;
  values: readonly unknown[][];
}): EsqlRecord[] =>
  values.map((row) => Object.fromEntries(columns.map(({ name }, i) => [name, row[i]])));

const isMissingIndexError = (error: unknown): boolean => {
  const { message, meta } = error as { message?: string; meta?: { body?: unknown } };
  return /Unknown index|index_not_found/.test(`${message} ${JSON.stringify(meta?.body ?? '')}`);
};

export interface OwnEventsResult {
  /** Events by agent entity ID. An agent whose read failed is left out. */
  readonly eventsByAgent: Map<string, ProcessRecord[]>;
  readonly failedAgents: number;
  /** The first failure, for the log. */
  readonly error?: string;
}

/**
 * Reads the agents' own process starts in the window, many agents per query. A query that fills
 * the row limit is split in half and read again, so no agent loses events to another. A failed
 * query leaves its agents out, and the caller keeps their last profile.
 */
export const readOwnProcessEvents = async ({
  esClient,
  namespace,
  agents,
  window,
  signal,
}: {
  readonly esClient: ElasticsearchClient;
  readonly namespace: string;
  readonly agents: readonly AgentIdentity[];
  readonly window: TimeWindow;
  readonly signal?: AbortSignal;
}): Promise<OwnEventsResult> => {
  const eventsByAgent = new Map<string, ProcessRecord[]>();
  let failedAgents = 0;
  let firstError: string | undefined;

  const readBatch = async (batch: readonly AgentIdentity[]): Promise<void> => {
    if (signal?.aborted) return;
    let rows: EsqlRecord[];
    try {
      const response = await esClient.esql.query(
        {
          query: buildAgentsOwnProcessesQuery({
            namespace,
            agents: batch,
            from: window.from,
            to: window.to,
            limit: MAX_ROWS_PER_QUERY,
          }),
        },
        { signal }
      );
      rows = toRecords(response as unknown as Parameters<typeof toRecords>[0]);
    } catch (error) {
      if (signal?.aborted) return;
      if (isMissingIndexError(error)) {
        rows = [];
      } else {
        failedAgents += batch.length;
        firstError ??= (error as Error).message;
        return;
      }
    }
    if (rows.length >= MAX_ROWS_PER_QUERY && batch.length > 1) {
      const middle = Math.ceil(batch.length / 2);
      await readBatch(batch.slice(0, middle));
      await readBatch(batch.slice(middle));
      return;
    }
    groupOwnEventsByAgent(batch, rows).forEach((events, entityId) =>
      eventsByAgent.set(entityId, events)
    );
  };

  for (let start = 0; start < agents.length; start += AGENTS_PER_QUERY) {
    await readBatch(agents.slice(start, start + AGENTS_PER_QUERY));
  }
  return { eventsByAgent, failedAgents, error: firstError };
};
