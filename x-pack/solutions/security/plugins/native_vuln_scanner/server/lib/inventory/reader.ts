/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { SortCombinations, SortResults } from '@elastic/elasticsearch/lib/api/types';
import type { InventoryQueryKind } from './queries';
import type { AgentInventoryRows, OsqueryRow } from './normalize';

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
}

interface ResultSource {
  agent?: { id?: string };
  host?: { name?: string; hostname?: string };
  schedule_id?: string;
  osquery_meta?: { unix_time?: number | string };
  osquery?: OsqueryRow;
}

/**
 * Sorted by agent, then run time (newest first): each agent arrives as one contiguous block,
 * and the first run seen for a query is its newest, whichever of its schedule ids produced it.
 */
const SORT: SortCombinations[] = [
  { 'agent.id': { order: 'asc' } },
  { 'osquery_meta.unix_time': { order: 'desc', unmapped_type: 'long' } },
];

class AgentAccumulator {
  private readonly runByKind = new Map<InventoryQueryKind, string>();
  private readonly rowsByKind = new Map<InventoryQueryKind, OsqueryRow[]>();
  private hostName?: string;

  constructor(public readonly agentId: string) {}

  add(kind: InventoryQueryKind, source: ResultSource): void {
    const run = `${source.schedule_id}@${source.osquery_meta?.unix_time ?? ''}`;
    const seen = this.runByKind.get(kind);
    // Older runs of the same query sort after the newest one; drop them.
    if (seen !== undefined && seen !== run) return;
    this.runByKind.set(kind, run);
    this.hostName ??= source.host?.name ?? source.host?.hostname;
    const rows = this.rowsByKind.get(kind);
    if (rows) rows.push(source.osquery ?? {});
    else this.rowsByKind.set(kind, [source.osquery ?? {}]);
  }

  build(): AgentInventoryRows {
    const { rowsByKind } = this;
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
 * Streams the newest inventory snapshot of every agent from osquery scheduled results. Pages
 * with a point in time and `search_after`, so it has no 10k cap and sees one consistent view.
 */
export async function* readAgentInventories(
  es: ElasticsearchClient,
  { scheduleIds, since = 'now-3d', pageSize = PAGE_SIZE }: ReadInventoriesOptions
): AsyncGenerator<AgentInventoryRows> {
  const kindById = new Map<string, InventoryQueryKind>();
  for (const [kind, ids] of Object.entries(scheduleIds) as Array<
    [InventoryQueryKind, readonly string[] | undefined]
  >) {
    for (const id of ids ?? []) kindById.set(id, kind);
  }
  if (kindById.size === 0) return;

  const { id: pitId } = await es.openPointInTime({
    index: OSQUERY_RESULTS_INDEX,
    keep_alive: KEEP_ALIVE,
    ignore_unavailable: true,
    allow_partial_search_results: false,
  });
  let pit = pitId;
  try {
    let current: AgentAccumulator | undefined;
    let searchAfter: SortResults | undefined;
    for (;;) {
      const response = await es.search<ResultSource>({
        pit: { id: pit, keep_alive: KEEP_ALIVE },
        size: pageSize,
        sort: SORT,
        search_after: searchAfter,
        track_total_hits: false,
        _source: [
          'agent.id',
          'host.name',
          'host.hostname',
          'schedule_id',
          'osquery_meta.unix_time',
          'osquery',
        ],
        query: {
          bool: {
            filter: [
              { terms: { schedule_id: [...kindById.keys()] } },
              { range: { '@timestamp': { gte: since } } },
              { exists: { field: 'agent.id' } },
            ],
            // A differential run reports only changes, which would read as a partial inventory.
            must_not: [{ terms: { 'osquery_meta.action': ['added', 'removed'] } }],
          },
        },
      });
      pit = response.pit_id ?? pit;
      const { hits } = response.hits;
      for (const { _source: source } of hits) {
        const agentId = source?.agent?.id;
        const kind = source?.schedule_id ? kindById.get(source.schedule_id) : undefined;
        if (!source || !agentId || !kind) continue;
        if (current?.agentId !== agentId) {
          if (current) yield current.build();
          current = new AgentAccumulator(agentId);
        }
        current.add(kind, source);
      }
      if (hits.length < pageSize) break;
      searchAfter = hits[hits.length - 1].sort;
    }
    if (current) yield current.build();
  } finally {
    await es.closePointInTime({ id: pit }).catch(() => undefined);
  }
}
