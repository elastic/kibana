/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { estypes } from '@elastic/elasticsearch';
import type {
  ActivityEntry,
  EngineConfig,
  EngineCostLedger,
  EngineDetection,
  EngineEvent,
  EngineRunSummary,
  LabState,
} from '../../../common/detection_engine/types';
import { DEFAULT_ENGINE_CONFIG, ENGINE_INDICES } from './constants';

const keyword = { type: 'keyword' } as const;
const date = { type: 'date' } as const;
const double = { type: 'double' } as const;

const INDEX_MAPPINGS: Record<keyof typeof ENGINE_INDICES, estypes.MappingTypeMapping> = {
  observations: {
    dynamic: false,
    properties: {
      '@timestamp': date,
      space_id: keyword,
      run_id: keyword,
      strategy: keyword,
      fingerprint: keyword,
      service: keyword,
      bucket_start: date,
      value: double,
      looks_off: { type: 'boolean' },
      mode: keyword,
    },
  },
  detections: {
    dynamic: false,
    properties: {
      '@timestamp': date,
      detection_id: keyword,
      space_id: keyword,
      run_id: keyword,
      strategy: keyword,
      fingerprint: keyword,
      service: keyword,
      bucket_start: date,
      value: double,
      importance: double,
      outcome: keyword,
      event_id: keyword,
      baseline: { properties: { decision: keyword } },
    },
  },
  events: {
    dynamic: false,
    properties: {
      event_id: keyword,
      space_id: keyword,
      status: keyword,
      severity: keyword,
      services: keyword,
      origin_strategy: keyword,
      created_at: date,
      opened_at: date,
      updated_at: date,
      closed_at: date,
      members: { properties: { fingerprint: keyword, strategy: keyword, service: keyword } },
    },
  },
  activity: {
    dynamic: false,
    properties: {
      '@timestamp': date,
      space_id: keyword,
      run_id: keyword,
      step: keyword,
      action: keyword,
      strategy: keyword,
      service: keyword,
      detection_id: keyword,
      event_id: keyword,
      message: { type: 'text' },
    },
  },
  state: {
    dynamic: false,
    properties: { kind: keyword, space_id: keyword, updated_at: date },
  },
};

// Index creation is idempotent, so a per-process cache only saves round trips.
const ensuredIndices = new Set<string>();

async function ensureIndex(esClient: ElasticsearchClient, key: keyof typeof ENGINE_INDICES) {
  const index = ENGINE_INDICES[key];
  if (ensuredIndices.has(index)) {
    return;
  }
  const exists = await esClient.indices.exists({ index });
  if (!exists) {
    try {
      await esClient.indices.create({
        index,
        settings: { 'index.hidden': true, number_of_shards: 1 },
        mappings: INDEX_MAPPINGS[key],
      });
    } catch (error) {
      // Two runs can race to create the same index; the loser can carry on.
      if (!String(error).includes('resource_already_exists_exception')) {
        throw error;
      }
    }
  }
  ensuredIndices.add(index);
}

interface StateDocs {
  config: EngineConfig;
  lab: LabState;
  last_run: EngineRunSummary & { last_evaluated_bucket_end?: string };
  memory: { fingerprint: string; notes: string[] };
  cost: EngineCostLedger;
}
type StateKind = keyof StateDocs;

/** Storage for one space. All reads filter by space; all writes stamp it. */
export interface EngineStorage {
  spaceId: string;
  ensure(): Promise<void>;
  writeObservations(
    docs: Array<{
      run_id: string;
      strategy: string;
      fingerprint: string;
      service: string;
      bucket_start: string;
      value: number;
      looks_off: boolean;
      mode: 'live' | 'replay';
    }>
  ): Promise<void>;
  /** Values per fingerprint for buckets in [from, to), oldest first. */
  readHistory(params: {
    fingerprints: string[];
    from: string;
    to: string;
  }): Promise<Map<string, Array<{ bucket_start: string; value: number }>>>;
  writeDetections(docs: EngineDetection[]): Promise<void>;
  searchDetections(params: {
    from?: string;
    to?: string;
    strategy?: string;
    outcome?: string;
    eventId?: string;
    size?: number;
  }): Promise<EngineDetection[]>;
  countDetections(params: {
    from: string;
    filters?: estypes.QueryDslQueryContainer[];
  }): Promise<number>;
  putEvent(event: EngineEvent): Promise<void>;
  getEvent(eventId: string): Promise<EngineEvent | undefined>;
  searchEvents(params: {
    statuses?: string[];
    fingerprints?: string[];
    size?: number;
  }): Promise<EngineEvent[]>;
  appendActivity(
    entries: Array<Omit<ActivityEntry, 'space_id' | '@timestamp'> & { '@timestamp'?: string }>
  ): Promise<void>;
  searchActivity(params: {
    eventId?: string;
    step?: string;
    runId?: string;
    size?: number;
  }): Promise<ActivityEntry[]>;
  getState<TKind extends StateKind>(
    kind: TKind,
    key?: string
  ): Promise<StateDocs[TKind] | undefined>;
  putState<TKind extends StateKind>(
    kind: TKind,
    doc: StateDocs[TKind],
    key?: string
  ): Promise<void>;
  getConfig(): Promise<EngineConfig>;
  /** Removes every engine document of this space. */
  clear(): Promise<void>;
  /** Removes what runs produced in this space, keeping settings, lab state and the cost ledger. */
  clearRunData(): Promise<void>;
  refresh(): Promise<void>;
}

/** Creates the storage for one space, backed by the plugin's engine indices. */
export function createEngineStorage({
  esClient,
  spaceId,
}: {
  esClient: ElasticsearchClient;
  spaceId: string;
}): EngineStorage {
  const spaceFilter = { term: { space_id: spaceId } };
  const stateId = (kind: string, key?: string) => [spaceId, kind, key].filter(Boolean).join(':');

  const search = async <TDoc>(
    key: keyof typeof ENGINE_INDICES,
    request: Omit<estypes.SearchRequest, 'index'>
  ): Promise<TDoc[]> => {
    const response = await esClient.search<TDoc>({
      index: ENGINE_INDICES[key],
      ignore_unavailable: true,
      ...request,
    });
    return response.hits.hits.flatMap((hit) => (hit._source ? [hit._source] : []));
  };

  const bulkIndex = async (
    key: keyof typeof ENGINE_INDICES,
    docs: Array<{ id?: string; doc: object }>
  ) => {
    if (docs.length === 0) {
      return;
    }
    const response = await esClient.bulk({
      index: ENGINE_INDICES[key],
      operations: docs.flatMap(({ id, doc }) => [{ index: id ? { _id: id } : {} }, doc]),
    });
    if (response.errors) {
      const firstError = response.items.find((item) => item.index?.error)?.index?.error;
      throw new Error(`Engine storage write to ${key} failed: ${JSON.stringify(firstError)}`);
    }
  };

  const storage: EngineStorage = {
    spaceId,

    async ensure() {
      await Promise.all(
        (Object.keys(ENGINE_INDICES) as Array<keyof typeof ENGINE_INDICES>).map((key) =>
          ensureIndex(esClient, key)
        )
      );
    },

    async writeObservations(docs) {
      // Deterministic ids: re-evaluating a bucket overwrites it instead of adding a sample.
      await bulkIndex(
        'observations',
        docs.map((doc) => ({
          id: `${spaceId}:${doc.fingerprint}:${doc.bucket_start}`,
          doc: { ...doc, '@timestamp': doc.bucket_start, space_id: spaceId },
        }))
      );
    },

    async readHistory({ fingerprints, from, to }) {
      const history = new Map<string, Array<{ bucket_start: string; value: number }>>();
      if (fingerprints.length === 0) {
        return history;
      }
      const hits = await search<{ fingerprint: string; bucket_start: string; value: number }>(
        'observations',
        {
          size: 10_000,
          _source: ['fingerprint', 'bucket_start', 'value'],
          query: {
            bool: {
              filter: [
                spaceFilter,
                { terms: { fingerprint: fingerprints } },
                { range: { bucket_start: { gte: from, lt: to } } },
              ],
            },
          },
          sort: [{ bucket_start: 'asc' }],
        }
      );
      hits.forEach((hit) => {
        const series = history.get(hit.fingerprint) ?? [];
        series.push({ bucket_start: hit.bucket_start, value: hit.value });
        history.set(hit.fingerprint, series);
      });
      return history;
    },

    async writeDetections(docs) {
      await bulkIndex(
        'detections',
        docs.map((doc) => ({ id: doc.detection_id, doc }))
      );
    },

    async searchDetections({ from, to, strategy, outcome, eventId, size = 200 }) {
      const filter: estypes.QueryDslQueryContainer[] = [spaceFilter];
      if (from || to) {
        filter.push({ range: { '@timestamp': { gte: from, lte: to } } });
      }
      if (strategy) {
        filter.push({ term: { strategy } });
      }
      if (outcome) {
        filter.push({ term: { outcome } });
      }
      if (eventId) {
        filter.push({ term: { event_id: eventId } });
      }
      return search<EngineDetection>('detections', {
        size,
        query: { bool: { filter } },
        sort: [{ '@timestamp': 'desc' }],
      });
    },

    async countDetections({ from, filters = [] }) {
      const response = await esClient.count({
        index: ENGINE_INDICES.detections,
        ignore_unavailable: true,
        query: {
          bool: { filter: [spaceFilter, { range: { '@timestamp': { gte: from } } }, ...filters] },
        },
      });
      return response.count;
    },

    async putEvent(event) {
      await esClient.index({
        index: ENGINE_INDICES.events,
        id: `${spaceId}:${event.event_id}`,
        document: event,
        refresh: 'wait_for',
      });
    },

    async getEvent(eventId) {
      const [event] = await search<EngineEvent>('events', {
        size: 1,
        query: { bool: { filter: [spaceFilter, { term: { event_id: eventId } }] } },
      });
      return event;
    },

    async searchEvents({ statuses, fingerprints, size = 200 }) {
      const filter: estypes.QueryDslQueryContainer[] = [spaceFilter];
      if (statuses?.length) {
        filter.push({ terms: { status: statuses } });
      }
      if (fingerprints?.length) {
        filter.push({ terms: { 'members.fingerprint': fingerprints } });
      }
      return search<EngineEvent>('events', {
        size,
        query: { bool: { filter } },
        sort: [{ updated_at: 'desc' }],
      });
    },

    async appendActivity(entries) {
      const now = new Date().toISOString();
      await bulkIndex(
        'activity',
        entries.map((entry) => ({
          doc: { '@timestamp': now, ...entry, space_id: spaceId },
        }))
      );
    },

    async searchActivity({ eventId, step, runId, size = 300 }) {
      const filter: estypes.QueryDslQueryContainer[] = [spaceFilter];
      if (eventId) {
        filter.push({ term: { event_id: eventId } });
      }
      if (step) {
        filter.push({ term: { step } });
      }
      if (runId) {
        filter.push({ term: { run_id: runId } });
      }
      return search<ActivityEntry>('activity', {
        size,
        query: { bool: { filter } },
        sort: [{ '@timestamp': 'desc' }],
      });
    },

    async getState(kind, key) {
      try {
        const response = await esClient.get<{ doc: StateDocs[typeof kind] }>({
          index: ENGINE_INDICES.state,
          id: stateId(kind, key),
        });
        return response._source?.doc;
      } catch (error) {
        if ((error as { meta?: { statusCode?: number } }).meta?.statusCode === 404) {
          return undefined;
        }
        throw error;
      }
    },

    async putState(kind, doc, key) {
      await esClient.index({
        index: ENGINE_INDICES.state,
        id: stateId(kind, key),
        document: { kind, space_id: spaceId, updated_at: new Date().toISOString(), doc },
        refresh: 'wait_for',
      });
    },

    async getConfig() {
      const stored = await storage.getState('config');
      // Merge field by field so a config saved by an older build gains new defaults.
      return {
        ...DEFAULT_ENGINE_CONFIG,
        ...stored,
        strategies: { ...DEFAULT_ENGINE_CONFIG.strategies, ...stored?.strategies },
        agent: { ...DEFAULT_ENGINE_CONFIG.agent, ...stored?.agent },
        baseline: { ...DEFAULT_ENGINE_CONFIG.baseline, ...stored?.baseline },
      };
    },

    async clear() {
      await esClient.deleteByQuery({
        index: Object.values(ENGINE_INDICES),
        ignore_unavailable: true,
        refresh: true,
        conflicts: 'proceed',
        query: spaceFilter,
      });
    },

    async clearRunData() {
      await esClient.deleteByQuery({
        index: Object.values(ENGINE_INDICES),
        ignore_unavailable: true,
        refresh: true,
        conflicts: 'proceed',
        query: {
          bool: {
            filter: [spaceFilter],
            must_not: [{ terms: { kind: ['config', 'lab', 'cost'] } }],
          },
        },
      });
    },

    async refresh() {
      await esClient.indices.refresh({
        index: Object.values(ENGINE_INDICES),
        ignore_unavailable: true,
      });
    },
  };

  return storage;
}
