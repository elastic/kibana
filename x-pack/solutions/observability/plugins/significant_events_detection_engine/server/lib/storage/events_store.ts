/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core/server';
import { mappings } from '@kbn/es-mappings';
import type { SignalStrategyId, EngineEvent, EngineEventStatus, EnginePage } from '../../../common';
import { OPEN_EVENT_STATUSES } from '../../../common';
import type { DocVersion } from '../domain';
import { decodeCursor, encodeCursor } from './cursor';
import { withCurrentEventNames } from './legacy_names';
import type { IManagedIndexInstaller, ManagedIndexDefinition } from './managed_index';

export const EVENTS_INDEX: ManagedIndexDefinition = {
  name: '.significant_events-detection_engine-events',
  version: 1,
  mappings: {
    dynamic: false,
    properties: {
      event_id: mappings.keyword(),
      space_id: mappings.keyword(),
      status: mappings.keyword(),
      severity: mappings.keyword(),
      services: mappings.keyword(),
      origin_strategy: mappings.keyword(),
      created_at: mappings.date(),
      opened_at: mappings.date(),
      updated_at: mappings.date(),
      closed_at: mappings.date(),
      close_reason: mappings.keyword(),
      title: mappings.text(),
      members: {
        type: 'object',
        properties: {
          fingerprint: mappings.keyword(),
          strategy: mappings.keyword(),
          service: mappings.keyword(),
        },
      },
      published: { type: 'object', properties: { pending: mappings.boolean() } },
    },
  },
};

const PAGE_SIZE = 1_000;
const TERMS_CHUNK = 1_000;

/** An event with the token a conditional write must present. */
export interface VersionedEvent {
  event: EngineEvent;
  version: DocVersion;
}

/** Outcome of writing one event. */
export type EventWriteResult =
  | { event_id: string; ok: true; version: DocVersion }
  | { event_id: string; ok: false; conflict: boolean; error: string };

/** Significant events of one space, stored as their current state. */
export interface IEventsStore {
  get(eventId: string): Promise<VersionedEvent | undefined>;
  /** A page of events, most recently updated first. */
  list(params: {
    statuses?: EngineEventStatus[];
    service?: string;
    size: number;
    cursor?: string;
  }): Promise<EnginePage<EngineEvent>>;
  /** The most recently updated events with these statuses, with their versions. */
  listRecent(params: { statuses: EngineEventStatus[]; size: number }): Promise<VersionedEvent[]>;
  /** Every open event, up to `limit`. `truncated` says some were left out. */
  listOpen(limit: number): Promise<{ events: VersionedEvent[]; truncated: boolean }>;
  /** Events whose members include any of these series, most recently updated first. */
  findByFingerprints(fingerprints: string[]): Promise<VersionedEvent[]>;
  /** Events whose last publication failed, oldest first. */
  findPendingPublication(limit: number): Promise<VersionedEvent[]>;
  /** New events per origin strategy since a time, for the daily caps. */
  countCreatedSince(since: string): Promise<Partial<Record<SignalStrategyId, number>>>;
  /** Events each strategy opened, and how many of those people dismissed. */
  strategyStats(): Promise<
    Partial<Record<SignalStrategyId, { opened: number; dismissed: number }>>
  >;
  /** Counts of all and of open events. */
  counts(): Promise<{ events: number; open: number }>;
  /**
   * Writes events. An event with a version is written only if nobody changed it since it was
   * read; one without is created and must not exist yet.
   */
  write(items: Array<{ event: EngineEvent; version?: DocVersion }>): Promise<EventWriteResult[]>;
  clear(): Promise<void>;
}

/** Creates the events store of one space. Writes run as the Kibana system user. */
export function createEventsStore({
  esClient,
  installer,
  spaceId,
}: {
  esClient: ElasticsearchClient;
  installer: IManagedIndexInstaller;
  spaceId: string;
}): IEventsStore {
  const index = EVENTS_INDEX.name;
  const spaceFilter: estypes.QueryDslQueryContainer = { term: { space_id: spaceId } };
  const docId = (eventId: string) => `${spaceId}:${eventId}`;
  const ensure = () => installer.ensure(EVENTS_INDEX);

  const toVersioned = (hit: estypes.SearchHit<EngineEvent>): VersionedEvent[] =>
    hit._source && hit._seq_no !== undefined && hit._primary_term !== undefined
      ? [
          {
            event: withCurrentEventNames(hit._source),
            version: { seq_no: hit._seq_no, primary_term: hit._primary_term },
          },
        ]
      : [];

  const search = async (request: Omit<estypes.SearchRequest, 'index'>) => {
    await ensure();
    return esClient.search<EngineEvent>({ index, seq_no_primary_term: true, ...request });
  };

  return {
    async get(eventId) {
      const response = await search({
        size: 1,
        query: { bool: { filter: [spaceFilter, { term: { event_id: eventId } }] } },
      });
      return response.hits.hits.flatMap(toVersioned)[0];
    },

    async list({ statuses, service, size, cursor }) {
      const filter: estypes.QueryDslQueryContainer[] = [spaceFilter];
      if (statuses?.length) {
        filter.push({ terms: { status: statuses } });
      }
      if (service) {
        filter.push({ term: { services: service } });
      }
      const response = await search({
        size: size + 1,
        query: { bool: { filter } },
        sort: [{ updated_at: 'desc' }, { event_id: 'asc' }],
        search_after: decodeCursor(cursor),
      });
      const hits = response.hits.hits;
      const page = hits.slice(0, size);
      return {
        items: page.flatMap((hit) => (hit._source ? [withCurrentEventNames(hit._source)] : [])),
        next_cursor: hits.length > size ? encodeCursor(page[page.length - 1]?.sort) : undefined,
      };
    },

    async listRecent({ statuses, size }) {
      const response = await search({
        size,
        query: { bool: { filter: [spaceFilter, { terms: { status: statuses } }] } },
        sort: [{ updated_at: 'desc' }],
      });
      return response.hits.hits.flatMap(toVersioned);
    },

    async listOpen(limit) {
      const collected: VersionedEvent[] = [];
      let searchAfter: estypes.SortResults | undefined;
      // Paged so a space with many open events never loads them in one response.
      while (collected.length < limit) {
        const response = await search({
          size: Math.min(PAGE_SIZE, limit - collected.length),
          query: {
            bool: { filter: [spaceFilter, { terms: { status: [...OPEN_EVENT_STATUSES] } }] },
          },
          sort: [{ updated_at: 'desc' }, { event_id: 'asc' }],
          search_after: searchAfter,
        });
        const hits = response.hits.hits;
        collected.push(...hits.flatMap(toVersioned));
        if (hits.length === 0 || hits.length < PAGE_SIZE) {
          return { events: collected, truncated: false };
        }
        searchAfter = hits[hits.length - 1].sort;
      }
      return { events: collected, truncated: true };
    },

    async findByFingerprints(fingerprints) {
      const unique = [...new Set(fingerprints)];
      const chunks = Array.from({ length: Math.ceil(unique.length / TERMS_CHUNK) }, (_, position) =>
        unique.slice(position * TERMS_CHUNK, (position + 1) * TERMS_CHUNK)
      );
      const results = await Promise.all(
        chunks.map((chunk) =>
          search({
            // A series belongs to one event at a time; a few spare slots cover old episodes.
            size: Math.min(10_000, chunk.length * 3),
            query: {
              bool: { filter: [spaceFilter, { terms: { 'members.fingerprint': chunk } }] },
            },
            sort: [{ updated_at: 'desc' }],
          })
        )
      );
      return results.flatMap((response) => response.hits.hits.flatMap(toVersioned));
    },

    async findPendingPublication(limit) {
      const response = await search({
        size: limit,
        query: { bool: { filter: [spaceFilter, { term: { 'published.pending': true } }] } },
        sort: [{ updated_at: 'asc' }],
      });
      return response.hits.hits.flatMap(toVersioned);
    },

    async countCreatedSince(since) {
      const response = await search({
        size: 0,
        query: { bool: { filter: [spaceFilter, { range: { created_at: { gte: since } } }] } },
        aggs: { strategies: { terms: { field: 'origin_strategy', size: 50 } } },
      });
      const buckets =
        (
          response.aggregations?.strategies as
            | { buckets: Array<{ key: string; doc_count: number }> }
            | undefined
        )?.buckets ?? [];
      return Object.fromEntries(buckets.map((bucket) => [bucket.key, bucket.doc_count]));
    },

    async strategyStats() {
      const response = await search({
        size: 0,
        query: { bool: { filter: [spaceFilter] } },
        aggs: {
          strategies: {
            terms: { field: 'origin_strategy', size: 50 },
            aggs: { dismissed: { filter: { term: { close_reason: 'dismissed' } } } },
          },
        },
      });
      const buckets =
        (
          response.aggregations?.strategies as
            | {
                buckets: Array<{
                  key: string;
                  doc_count: number;
                  dismissed: { doc_count: number };
                }>;
              }
            | undefined
        )?.buckets ?? [];
      return Object.fromEntries(
        buckets.map((bucket) => [
          bucket.key,
          { opened: bucket.doc_count, dismissed: bucket.dismissed.doc_count },
        ])
      );
    },

    async counts() {
      const response = await search({
        size: 0,
        track_total_hits: true,
        query: { bool: { filter: [spaceFilter] } },
        aggs: { open: { filter: { terms: { status: [...OPEN_EVENT_STATUSES] } } } },
      });
      const total = response.hits.total;
      return {
        events: typeof total === 'number' ? total : total?.value ?? 0,
        open: (response.aggregations?.open as { doc_count: number } | undefined)?.doc_count ?? 0,
      };
    },

    async write(items) {
      if (items.length === 0) {
        return [];
      }
      await ensure();
      const response = await esClient.bulk({
        index,
        refresh: 'wait_for',
        operations: items.flatMap(({ event, version }) => [
          version
            ? {
                index: {
                  _id: docId(event.event_id),
                  if_seq_no: version.seq_no,
                  if_primary_term: version.primary_term,
                },
              }
            : { create: { _id: docId(event.event_id) } },
          event,
        ]),
      });
      return response.items.map((item, position): EventWriteResult => {
        const result = item.index ?? item.create;
        const eventId = items[position].event.event_id;
        if (!result || result.error) {
          return {
            event_id: eventId,
            ok: false,
            conflict: result?.status === 409,
            error: result?.error?.reason ?? 'unknown bulk error',
          };
        }
        return {
          event_id: eventId,
          ok: true,
          version: { seq_no: result._seq_no!, primary_term: result._primary_term! },
        };
      });
    },

    async clear() {
      await ensure();
      await esClient.deleteByQuery({
        index,
        // No refresh: the Kibana system user may not refresh these indices, and readers
        // tolerate a second of deleted documents.
        conflicts: 'proceed',
        query: spaceFilter,
      });
    },
  };
}
