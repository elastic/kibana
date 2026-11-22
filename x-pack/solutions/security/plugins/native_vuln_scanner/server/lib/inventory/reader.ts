/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import type { SortCombinations, SortResults } from '@elastic/elasticsearch/lib/api/types';
import type { InventoryQueryKind } from './queries';
import { KIND_BY_QUERY_ID } from './queries';
import type { AgentInventoryRows, OsqueryRow } from './normalize';
import { inventoryResultsQuery } from './result_filter';

export const OSQUERY_RESULTS_INDEX = 'logs-osquery_manager.result-*';

const PAGE_SIZE = 5000;
const KEEP_ALIVE = '2m';

export interface ReadInventoriesOptions {
  /**
   * Schedule ids per inventory query. A query can carry more than one id (a legacy
   * `pack_<name>_<query>` key next to a newer minted id); rows of either count.
   */
  scheduleIds: Partial<Record<InventoryQueryKind, readonly string[]>>;
  /** Oldest result considered, as an ES date (default `now-3d`, three daily runs). */
  since?: string;
  pageSize?: number;
  /** Aborts the in-flight search; the point in time is still closed. */
  signal?: AbortSignal;
}

interface ResultSource {
  '@timestamp'?: string;
  agent?: { id?: string };
  host?: { name?: string; hostname?: string };
  /** Scheduled runs only. */
  schedule_id?: string;
  /** One id per scheduled query execution, stamped by osquerybeat. */
  response_id?: string;
  osquery_meta?: { unix_time?: number | string };
  /** Live-query runs only: one id per query execution. */
  action_id?: string;
  action_data?: { id?: string; space_id?: string };
  osquery?: OsqueryRow;
}

/**
 * Sorted by agent, then `@timestamp` (newest first); both result shapes carry it, unlike
 * `osquery_meta.unix_time`. Each agent arrives as one contiguous block. Rows of one run can
 * interleave with another run's, so newest-wins is decided on run time, not on arrival order.
 */
const SORT: SortCombinations[] = [
  { 'agent.id': { order: 'asc' } },
  { '@timestamp': { order: 'desc', unmapped_type: 'date' } },
];

interface Run {
  key: string;
  /** Epoch ms: the scheduled run's start, or the newest row of a live run. */
  time: number;
  rows: OsqueryRow[];
}

const toMillis = (value: number | string | undefined): number => {
  const millis = typeof value === 'number' ? value : Date.parse(value ?? '');
  return Number.isFinite(millis) ? millis : 0;
};

/**
 * Identifies the run a result belongs to and when it happened; `undefined` for a foreign space or
 * a live doc without `action_id`. Scheduled runs group on `response_id`, stamped once per
 * execution by osquerybeat, so two runs in the same second stay separate; older beats without it
 * fall back to `schedule_id@unix_time`.
 */
const describeRun = (source: ResultSource): { key: string; time: number } | undefined => {
  const timestamp = toMillis(source['@timestamp']);
  if (source.schedule_id) {
    const unixTime = source.osquery_meta?.unix_time;
    const time = unixTime === undefined ? timestamp : Number(unixTime) * 1000 || timestamp;
    return { key: `${source.schedule_id}@${source.response_id ?? unixTime ?? ''}`, time };
  }
  if (!source.action_id || source.action_data?.space_id !== DEFAULT_SPACE_ID) return undefined;
  return { key: `live:${source.action_id}`, time: timestamp };
};

/** Exported for tests only. */
export class AgentAccumulator {
  /**
   * Only the newest run per query is held, whichever shape or schedule id produced it; an older
   * run is dropped as its rows arrive. Ties keep the first seen.
   */
  private readonly bestByKind = new Map<InventoryQueryKind, Run>();
  private hostName?: string;

  constructor(public readonly agentId: string) {}

  add(kind: InventoryQueryKind, source: ResultSource, run: { key: string; time: number }): void {
    this.hostName ??= source.host?.name ?? source.host?.hostname;
    const row = source.osquery ?? {};
    const best = this.bestByKind.get(kind);
    if (!best || run.time > best.time) {
      this.bestByKind.set(kind, { key: run.key, time: run.time, rows: [row] });
    } else if (best.key === run.key) {
      best.rows.push(row);
      best.time = Math.max(best.time, run.time);
    }
  }

  /** Rows currently held across all queries; tests use it to guard the one-run-per-query bound. */
  heldRowCount(): number {
    let count = 0;
    for (const { rows } of this.bestByKind.values()) count += rows.length;
    return count;
  }

  build(): AgentInventoryRows {
    const rowsByKind = { get: (kind: InventoryQueryKind) => this.bestByKind.get(kind)?.rows };
    return {
      agentId: this.agentId,
      hostName: this.hostName,
      deb: rowsByKind.get('deb_packages'),
      rpm: rowsByKind.get('rpm_packages'),
      os: rowsByKind.get('os_version')?.[0],
      kernel: rowsByKind.get('kernel_info')?.[0],
    };
  }
}

/**
 * Streams the newest inventory snapshot of every agent from osquery results: scheduled runs
 * (matched by `schedule_id`) and live-query runs (matched by `action_data.id` in the default
 * space). Pages with a point in time and `search_after`, so it has no 10k cap and sees one
 * consistent view.
 */
export async function* readAgentInventories(
  es: ElasticsearchClient,
  { scheduleIds, since = 'now-3d', pageSize = PAGE_SIZE, signal }: ReadInventoriesOptions
): AsyncGenerator<AgentInventoryRows> {
  const kindById = new Map<string, InventoryQueryKind>();
  for (const [kind, ids] of Object.entries(scheduleIds) as Array<
    [InventoryQueryKind, readonly string[] | undefined]
  >) {
    for (const id of ids ?? []) kindById.set(id, kind);
  }
  if (kindById.size === 0) return;

  const { id: pitId } = await es.openPointInTime(
    {
      index: OSQUERY_RESULTS_INDEX,
      keep_alive: KEEP_ALIVE,
      ignore_unavailable: true,
      allow_partial_search_results: false,
    },
    { signal }
  );
  let pit = pitId;
  try {
    let current: AgentAccumulator | undefined;
    let searchAfter: SortResults | undefined;
    for (;;) {
      const response = await es.search<ResultSource>(
        {
          pit: { id: pit, keep_alive: KEEP_ALIVE },
          size: pageSize,
          sort: SORT,
          search_after: searchAfter,
          track_total_hits: false,
          _source: [
            '@timestamp',
            'agent.id',
            'host.name',
            'host.hostname',
            'schedule_id',
            'response_id',
            'osquery_meta.unix_time',
            'action_id',
            'action_data.id',
            'action_data.space_id',
            'osquery',
          ],
          query: inventoryResultsQuery([...kindById.keys()], since),
        },
        { signal }
      );
      pit = response.pit_id ?? pit;
      const { hits } = response.hits;
      for (const { _source: source } of hits) {
        const agentId = source?.agent?.id;
        if (!source || !agentId) continue;
        const kind = source.schedule_id
          ? kindById.get(source.schedule_id)
          : KIND_BY_QUERY_ID.get(source.action_data?.id ?? '');
        const run = kind && describeRun(source);
        if (!kind || !run) continue;
        if (current?.agentId !== agentId) {
          if (current) yield current.build();
          current = new AgentAccumulator(agentId);
        }
        current.add(kind, source, run);
      }
      if (hits.length < pageSize) break;
      searchAfter = hits[hits.length - 1].sort;
    }
    if (current) yield current.build();
  } finally {
    await es.closePointInTime({ id: pit }).catch(() => undefined);
  }
}
