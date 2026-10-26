/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NightshiftSource } from '@kbn/nightshift-shared';
import { BUCKET_MS, DAY_MS, HOUR_MS } from '../../../common';
import type { IEngineScope } from '../engine/engine_scope';
import { getErrorMessage } from '../errors';
import { esqlString, field, listColumns, queryRows, timeRangeWhere, toNumber } from '../esql';
import { mapWithConcurrency } from '../concurrency';
import { messageFieldOf } from './detector_author';
import { requestTokens } from '../agent/mentions';
import { callNamePatterns } from '../strategies/dependency_health';

/** How far back mentions are counted. */
const TOPOLOGY_WINDOW_MS = HOUR_MS;
/** A service must name another this often before the engine calls it a dependency. */
const MIN_MENTIONS = 20;
/** Topology changes slowly; it is recomputed at most this often. */
export const TOPOLOGY_REFRESH_MS = HOUR_MS;
const QUERY_CONCURRENCY = 3;
/** Lines read per source, from one settled minute, to find services that serve the same requests. */
const SHARED_REQUEST_SAMPLE_LINES = 10_000;
/** Distinct requests two services must share in that minute to sit on one call path. */
const MIN_SHARED_REQUESTS = 10;
/** A token on more lines than this is not one request but a run, a host or a tenant. */
const MAX_LINES_PER_REQUEST = 20;

/** An edge not seen again for this long is forgotten; a service may name another only when it fails. */
const EDGE_TTL_MS = 7 * DAY_MS;

/** A dependency seen in the data: `source` writes about `target` in its own log lines. */
export interface ObservedDependency {
  source: string;
  target: string;
  /**
   * `calls`: the source's logs name the target. `shared_requests`: both logged the same request
   * or trace ids, so they sit on one call path, direction unknown.
   */
  kind?: 'calls' | 'shared_requests';
  /**
   * The Nightshift source whose logs showed the call. Two systems can each have a service with
   * the same name, so an edge only links services seen in the same source.
   */
  source_id?: string;
  /** Mentions in the window it was last seen in. */
  mentions: number;
  first_seen: string;
  last_seen: string;
}

/** What the engine learned about who calls whom, with when it looked. */
export interface ObservedTopology {
  computed_at: string;
  window_from: string;
  edges: ObservedDependency[];
}

/**
 * Learns dependencies from what services write: when the log lines of one service name another
 * service again and again ("dependency failed: catalogue"), the first calls the second. It is
 * code over the customer's own data, so it needs no AI and can be checked by re-running it.
 * Knowledge indicators may also hold dependencies; those are written by an AI and can be wrong.
 */
export async function observeTopology({
  scope,
  sources,
  services,
  previous,
  now = Date.now(),
  signal,
}: {
  scope: IEngineScope;
  sources: NightshiftSource[];
  services: string[];
  /** What earlier passes saw; edges seen within the TTL are kept. */
  previous?: ObservedTopology;
  now?: number;
  signal: AbortSignal;
}): Promise<{ topology: ObservedTopology; notes: string[] }> {
  const from = now - TOPOLOGY_WINDOW_MS;
  const nowIso = new Date(now).toISOString();
  const notes: string[] = [];
  const perSource = await Promise.all(
    sources.map(async (source) => {
      try {
        const columns = await listColumns({
          esClient: scope.dataEsClient,
          from: source.view_name,
          signal,
        });
        const messageField = messageFieldOf(columns);
        if (!messageField || !columns.includes('service.name')) {
          return [];
        }
        const message = field(messageField);
        const counted = await mapWithConcurrency(services, QUERY_CONCURRENCY, async (target) => {
          const { rows } = await queryRows({
            esClient: scope.dataEsClient,
            query: `FROM ${source.view_name}
| WHERE ${timeRangeWhere(from, now)} AND ${field('service.name')} != ${esqlString(
              target
            )} AND (${callNamePatterns(target)
              .map((pattern) => `${message} LIKE ${esqlString(pattern)}`)
              .join(' OR ')})
| STATS mentions = COUNT(*) BY service = ${field('service.name')}
| WHERE mentions >= ${MIN_MENTIONS}`,
            signal,
            timeoutMs: 60_000,
          });
          return rows.map(
            (row): ObservedDependency => ({
              source: String(row.service),
              target,
              source_id: source.id,
              mentions: toNumber(row.mentions),
              first_seen: nowIso,
              last_seen: nowIso,
            })
          );
        });
        const shared = await observeSharedRequests({
          scope,
          source,
          columns,
          messageField,
          now,
          signal,
        });
        return [...counted.flat(), ...shared];
      } catch (error) {
        notes.push(`Topology on ${source.title}: ${getErrorMessage(error)}`);
        return [];
      }
    })
  );
  const known = new Set(services);
  const seen = perSource
    .flat()
    .filter((edge) => known.has(edge.source) && edge.source !== edge.target);
  const key = (edge: ObservedDependency) =>
    `${edge.kind ?? 'calls'}:${edge.source_id ?? ''}:${edge.source}->${edge.target}`;
  const earlier = new Map((previous?.edges ?? []).map((edge) => [key(edge), edge]));
  const edges = [
    ...seen.map((edge) => ({
      ...edge,
      first_seen: earlier.get(key(edge))?.first_seen ?? edge.first_seen,
    })),
    ...(previous?.edges ?? []).filter(
      (edge) =>
        !seen.some((item) => key(item) === key(edge)) &&
        now - Date.parse(edge.last_seen ?? previous!.computed_at) < EDGE_TTL_MS
    ),
  ];
  return {
    topology: {
      computed_at: new Date(now).toISOString(),
      window_from: new Date(from).toISOString(),
      edges,
    },
    notes,
  };
}

/**
 * Services that logged the same request or trace ids in one settled minute sit on one call
 * path. Logs that never name their dependency still carry the ids that tie a request together,
 * which is what traces would show.
 */
async function observeSharedRequests({
  scope,
  source,
  columns,
  messageField,
  now,
  signal,
}: {
  scope: IEngineScope;
  source: NightshiftSource;
  columns: string[];
  messageField: string;
  now: number;
  signal: AbortSignal;
}): Promise<ObservedDependency[]> {
  const minute = Math.floor(now / BUCKET_MS) * BUCKET_MS - 2 * BUCKET_MS;
  const keep = [
    'service.name',
    messageField,
    ...['trace.id', 'trace_id'].filter((name) => columns.includes(name)),
  ];
  const { rows } = await queryRows({
    esClient: scope.dataEsClient,
    query: `FROM ${source.view_name}
| WHERE ${timeRangeWhere(minute, minute + BUCKET_MS)}
| KEEP ${keep.map(field).join(', ')}
| LIMIT ${SHARED_REQUEST_SAMPLE_LINES}`,
    signal,
    timeoutMs: 60_000,
  });
  const tokens = requestTokens(rows);
  const byToken = rows.reduce((found, row, index) => {
    const service = String(row['service.name'] ?? '');
    if (!service) {
      return found;
    }
    new Set(tokens[index]).forEach((token) => {
      const entry = found.get(token) ?? { lines: 0, services: new Set<string>() };
      entry.lines += 1;
      entry.services.add(service);
      found.set(token, entry);
    });
    return found;
  }, new Map<string, { lines: number; services: Set<string> }>());
  const pairs = [...byToken.values()]
    .filter((entry) => entry.lines <= MAX_LINES_PER_REQUEST && entry.services.size > 1)
    .flatMap((entry) => {
      const services = [...entry.services].sort();
      return services.flatMap((left, index) =>
        services.slice(index + 1).map((right) => `${left}\u0000${right}`)
      );
    })
    .reduce(
      (count, pair) => count.set(pair, (count.get(pair) ?? 0) + 1),
      new Map<string, number>()
    );
  const nowIso = new Date(now).toISOString();
  return [...pairs]
    .filter(([, shared]) => shared >= MIN_SHARED_REQUESTS)
    .map(([pair, shared]): ObservedDependency => {
      const [left, right] = pair.split('\u0000');
      return {
        source: left,
        target: right,
        kind: 'shared_requests',
        source_id: source.id,
        mentions: shared,
        first_seen: nowIso,
        last_seen: nowIso,
      };
    });
}
