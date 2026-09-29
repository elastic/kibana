/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { isNotFoundError, isResponseError } from '@kbn/es-errors';
import { isElasticsearchWriteConflict } from '@kbn/occ';
import {
  MEMORY_INDEX,
  type MemoryArchiveReason,
  type MemoryFilter,
  type MemoryPageSummary,
  type MemoryStats,
  type StoredMemoryPage,
  type MemoryPage,
} from '../../common/memory';
import { formatPageRefs, previewText } from './log_format';
import { applyUpdate, displayTelemetry, type CounterState, type CounterUpdate } from './ranking';

const MAX_LIST_SIZE = 500;
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 200;
const MAX_ARCHIVE_ATTEMPTS = 3;
const MAX_COUNTER_UPDATE_ATTEMPTS = 3;
const MEMORY_TAG = 'memory';
const SPACE_ID_FIELD = 'attributes.space_id';
const ARCHIVE_REASON_FIELD = 'attributes.archive_reason';
const UPDATED_AT_FIELD = 'attributes.updated_at';
const SLUG_FIELD = 'attributes.slug';

export type { CounterUpdate };

export type MemoryRetrieveMatch = 'context' | 'content';

export interface VersionedMemoryPage {
  page: MemoryPage;
  seqNo: number;
  primaryTerm: number;
}

export interface MemoryPageWrite {
  slug: string;
  title: string;
  description?: string;
  content: string;
  context?: string;
  tags: string[];
  categories: string[];
  references: string[];
  source?: string;
  merged_from?: string[];
  archive_reason?: MemoryArchiveReason;
  /** Provenance. Metadata only — Space remains the tenancy boundary. */
  agent_id?: string;
  conversation_id?: string;
  telemetry?: {
    impressions: number;
    conversions: number;
    last_impression_time: string;
  };
  user: string;
}

/** One page of the browsing UI's results, with the decayed numbers already applied. */
export interface MemoryPageListResult {
  pages: MemoryPageSummary[];
  stats: MemoryStats;
  /** Total matches across all pages. */
  total: number;
  /** Opaque `search_after` token; absent when the result set is exhausted. */
  cursor?: string;
}

export interface MemoryPageStore {
  list: (options?: { filter?: MemoryFilter }) => Promise<{
    pages: MemoryPageSummary[];
    stats: MemoryStats;
  }>;
  /**
   * Cursor-paginated listing for the browsing UI. Unlike `list`, this does not
   * cap the result set, and returns a `search_after` token for the next page.
   */
  listPaginated: (options?: {
    filter?: MemoryFilter;
    cursor?: string;
    size?: number;
  }) => Promise<MemoryPageListResult>;
  retrieve: (options?: {
    query?: string;
    size?: number;
    /** Task recall uses `context` (default). Duplicate-detection uses `content`. */
    match?: MemoryRetrieveMatch;
  }) => Promise<MemoryPage[]>;
  get: (id: string) => Promise<MemoryPage | undefined>;
  getMany: (ids: readonly string[]) => Promise<MemoryPage[]>;
  getVersioned: (id: string) => Promise<VersionedMemoryPage | undefined>;
  getByName: (name: string) => Promise<MemoryPage | undefined>;
  upsert: (page: MemoryPageWrite) => Promise<MemoryPage>;
  create: (page: MemoryPageWrite) => Promise<MemoryPage>;
  update: (id: string, page: MemoryPageWrite, version: VersionedMemoryPage) => Promise<MemoryPage>;
  applyCounterUpdates: (updates: readonly CounterUpdate[]) => Promise<void>;
  archive: (id: string, reason: MemoryArchiveReason) => Promise<MemoryPage | undefined>;
  archiveVersioned: (
    version: VersionedMemoryPage,
    reason: MemoryArchiveReason
  ) => Promise<MemoryPage>;
  /** Clears `archive_reason`, returning the memory to active recall. */
  unarchive: (id: string) => Promise<MemoryPage | undefined>;
  delete: (id: string) => Promise<void>;
}

const normalizeSlugText = (slug: string): string =>
  slug
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const canonicalizeSlug = (slug: string): string =>
  normalizeSlugText(slug)
    .replace(/^(?:memory-|-)+/, '')
    .slice(0, 80)
    .replace(/-+$/, '');

export const toMemoryKiId = (slug: string): string => {
  const normalizedSlug = canonicalizeSlug(slug);
  return `memory_${normalizedSlug}`.slice(0, 512);
};

export const isCanonicalMemoryId = (id: string): boolean => {
  if (!id.startsWith('memory_')) {
    return false;
  }
  const slug = id.slice('memory_'.length);
  return slug.length > 0 && id === toMemoryKiId(slug);
};

export const slugFromMemoryId = (id: string): string => {
  const prefix = `memory_`;
  if (id.startsWith(prefix)) {
    return id.slice(prefix.length);
  }
  return id;
};

export const isoToEpochSeconds = (iso: string): number => {
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms / 1000 : 0;
};

export const epochSecondsToIso = (epochSeconds: number): string =>
  new Date(epochSeconds * 1000).toISOString();

const toCounterState = (telemetry: MemoryPage['telemetry']): CounterState => ({
  impressions: telemetry.impressions,
  conversions: telemetry.conversions,
  lastTime: isoToEpochSeconds(telemetry.last_impression_time),
});

/** Read-time decay for headers / stats. Does not change stored `last_impression_time`. */
export const toMemoryDisplayTelemetry = (
  page: MemoryPage,
  nowSec: number
): {
  impressions: number;
  conversions: number;
  conversionRate: number;
  confidence: number;
  last_impression_time: string;
} => {
  const shown = displayTelemetry(toCounterState(page.telemetry), nowSec);
  return {
    impressions: shown.impressions,
    conversions: shown.conversions,
    conversionRate: shown.conversionRate,
    confidence: shown.confidence,
    last_impression_time: page.telemetry.last_impression_time,
  };
};

const memoryTags = (tags: string[]): string[] => [
  MEMORY_TAG,
  ...tags.filter((tag) => tag !== MEMORY_TAG),
];

const toPage = (id: string, source: StoredMemoryPage): MemoryPage | undefined => {
  if (source.title === undefined || source.title.length === 0) {
    return undefined;
  }

  const slug = source.attributes?.slug ?? slugFromMemoryId(id);
  // `archive_reason` is the single source of truth. The `status` branch only
  // exists so documents written before the field was introduced still report as
  // archived; it is never written.
  const archiveReason = source.attributes?.archive_reason;
  const archived = archiveReason !== undefined || source.attributes?.status === 'archived';

  return {
    id,
    slug,
    title: source.title,
    description: source.description,
    content: source.content ?? '',
    context: source.context,
    tags: source.tags ?? [],
    archived,
    source: source.attributes?.source,
    merged_from: source.attributes?.merged_from,
    archive_reason: archiveReason,
    conversation_id: source.attributes?.conversation_id,
    agent_id: source.attributes?.agent_id,
    categories: source.attributes?.categories ?? [],
    references: source.attributes?.references ?? [],
    created_at: source.attributes?.created_at ?? source['@timestamp'] ?? new Date().toISOString(),
    updated_at: source.attributes?.updated_at ?? source['@timestamp'] ?? new Date().toISOString(),
    created_by: source.attributes?.created_by ?? '',
    updated_by: source.attributes?.updated_by ?? '',
    telemetry: {
      impressions: Number(source.attributes?.impressions ?? 0.0),
      conversions: Number(source.attributes?.conversions ?? 0.0),
      last_impression_time:
        source.attributes?.last_impression_time ?? source['@timestamp'] ?? new Date().toISOString(),
    },
  };
};

export const createMemoryPageStore = ({
  esClient,
  logger,
  spaceId,
  signal,
  now = () => Date.now() / 1000,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  spaceId: string;
  signal?: AbortSignal;
  now?: () => number;
}): MemoryPageStore => {
  const isIndexNotFoundError = (error: unknown): boolean => {
    if (!isResponseError(error) || typeof error.body.error !== 'object') {
      return false;
    }
    return error.body.error.type === 'index_not_found_exception';
  };

  const idPrefix = `${spaceId}:`;
  const toStoredId = (pageId: string): string => `${idPrefix}${pageId}`;
  /** Drops ids from other spaces and non-canonical page ids. */
  const toPageId = (storedId: string): string | undefined =>
    storedId.startsWith(idPrefix) && isCanonicalMemoryId(storedId.slice(idPrefix.length))
      ? storedId.slice(idPrefix.length)
      : undefined;

  const buildDocument = (
    page: MemoryPageWrite,
    existing: MemoryPage | undefined
  ): StoredMemoryPage => {
    const nowIso = epochSecondsToIso(now());
    return {
      '@timestamp': nowIso,
      type: 'memory',
      title: page.title,
      description: page.description,
      content: page.content,
      context: page.context ?? existing?.context,
      tags: memoryTags(page.tags),
      attributes: {
        slug: page.slug,
        space_id: spaceId,
        // `status` is deliberately not written; `archive_reason` is the state.
        ...(page.agent_id !== undefined ? { agent_id: page.agent_id } : {}),
        ...(page.conversation_id !== undefined ? { conversation_id: page.conversation_id } : {}),
        categories: page.categories,
        ...(page.source !== undefined ? { source: page.source } : {}),
        ...(page.merged_from !== undefined ? { merged_from: page.merged_from } : {}),
        ...(page.archive_reason !== undefined ? { archive_reason: page.archive_reason } : {}),
        references: page.references,
        created_at: existing?.created_at ?? nowIso,
        updated_at: nowIso,
        created_by: existing?.created_by ?? page.user,
        updated_by: page.user,
        impressions: page.telemetry?.impressions ?? existing?.telemetry.impressions ?? 0.0,
        conversions: page.telemetry?.conversions ?? existing?.telemetry.conversions ?? 0.0,
        last_impression_time:
          page.telemetry?.last_impression_time ??
          existing?.telemetry.last_impression_time ??
          nowIso,
      },
    };
  };

  const mapWrittenPage = (id: string, document: StoredMemoryPage): MemoryPage => {
    const updated = toPage(id, document);
    if (!updated) {
      throw new Error(`Failed to map standard index response to MemoryPage for ${id}`);
    }
    return updated;
  };

  const writeVersionedPage = async (
    id: string,
    page: MemoryPageWrite,
    version: VersionedMemoryPage
  ): Promise<MemoryPage> => {
    const document = buildDocument(page, version.page);
    await esClient.index(
      {
        index: MEMORY_INDEX,
        id: toStoredId(id),
        document,
        if_seq_no: version.seqNo,
        if_primary_term: version.primaryTerm,
        refresh: 'wait_for',
      },
      { signal }
    );
    return mapWrittenPage(id, document);
  };

  const toArchiveWrite = (
    version: VersionedMemoryPage,
    reason: MemoryArchiveReason
  ): MemoryPageWrite => {
    const latest = version.page;
    return {
      slug: latest.slug,
      title: latest.title,
      description: latest.description,
      content: latest.content,
      context: latest.context,
      tags: latest.tags,
      categories: latest.categories,
      references: latest.references,
      archive_reason: reason,
      agent_id: latest.agent_id,
      conversation_id: latest.conversation_id,
      source: latest.source,
      merged_from: latest.merged_from,
      telemetry: latest.telemetry,
      user: latest.updated_by,
    };
  };

  /**
   * `updated_at desc, _id asc` — a total order, so `search_after` can never skip
   * or repeat a row. `updated_at` alone is not stable: the optimizer writes many
   * memories with the same timestamp, and a non-unique sort key makes paging
   * silently drop documents.
   */
  // `attributes.slug` is the tiebreaker, not `_id`: Elasticsearch refuses
  // fielddata access on `_id`, so sorting on it fails outright. The slug is
  // unique per page and mapped inside the flattened `attributes`, so it gives
  // the same total order.
  const PAGINATION_SORT: estypes.Sort = [
    { [UPDATED_AT_FIELD]: { order: 'desc', unmapped_type: 'date' } },
    { [SLUG_FIELD]: { order: 'asc', unmapped_type: 'keyword' } },
  ];

  const spaceAndTagFilter = [
    { term: { tags: MEMORY_TAG } },
    { term: { [SPACE_ID_FIELD]: spaceId } },
  ];

  /**
   * `active` is "no `archive_reason`". `exists` is true even for an empty string,
   * so a malformed empty reason still reads as archived rather than slipping into
   * the active set.
   */
  const filterClause = (filter: MemoryFilter): object[] => {
    switch (filter) {
      case 'active':
        return [
          ...spaceAndTagFilter,
          { bool: { must_not: [{ exists: { field: ARCHIVE_REASON_FIELD } }] } },
        ];
      case 'archived':
        return [...spaceAndTagFilter, { exists: { field: ARCHIVE_REASON_FIELD } }];
      case 'all':
      default:
        return spaceAndTagFilter;
    }
  };

  const hitsToPages = (
    hits: Array<{ _id?: string; _source?: StoredMemoryPage; sort?: unknown[] }>
  ): MemoryPage[] =>
    hits.flatMap((hit) => {
      if (!hit._id || !hit._source) return [];
      const pageId = toPageId(hit._id);
      if (!pageId) return [];
      const page = toPage(pageId, hit._source);
      return page ? [page] : [];
    });

  const toSummary = (page: MemoryPage): MemoryPageSummary => {
    const { content, ...rest } = page;
    const display = toMemoryDisplayTelemetry(page, now());
    return { ...rest, usefulness: display.conversionRate, confidence: display.confidence };
  };

  const emptyStats = (): MemoryStats => ({
    total: 0,
    archived: 0,
    decayed_impressions: 0,
    decayed_conversions: 0,
  });

  /** Decayed totals over the whole filtered set, independent of the page slice. */
  const aggregateStats = async (filter: MemoryFilter): Promise<MemoryStats> => {
    try {
      const response = await esClient.search<StoredMemoryPage>(
        {
          index: MEMORY_INDEX,
          query: { bool: { filter: filterClause(filter) } },
          size: 0,
          track_total_hits: true,
          aggs: {
            archived: { filter: { exists: { field: ARCHIVE_REASON_FIELD } } },
            impressions: { sum: { field: 'attributes.impressions' } },
            conversions: { sum: { field: 'attributes.conversions' } },
          },
        },
        { signal }
      );
      const aggs = response.aggregations as
        | {
            archived?: { doc_count?: number };
            impressions?: { value?: number | null };
            conversions?: { value?: number | null };
          }
        | undefined;
      return {
        total:
          typeof response.hits.total === 'number'
            ? response.hits.total
            : response.hits.total?.value ?? 0,
        archived: aggs?.archived?.doc_count ?? 0,
        decayed_impressions: aggs?.impressions?.value ?? 0,
        decayed_conversions: aggs?.conversions?.value ?? 0,
      };
    } catch (err) {
      if (isIndexNotFoundError(err)) return emptyStats();
      throw err;
    }
  };

  /**
   * `search_after` values are opaque to callers. A malformed token is dropped
   * rather than forwarded, so a bad cursor restarts at page one instead of
   * erroring the whole listing.
   */
  const decodeCursor = (cursor?: string): Array<number | string> | undefined => {
    if (!cursor) return undefined;
    try {
      const decoded: unknown = JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'));
      if (!Array.isArray(decoded) || decoded.length !== PAGINATION_SORT.length) return undefined;
      return decoded.every((part) => typeof part === 'number' || typeof part === 'string')
        ? (decoded as Array<number | string>)
        : undefined;
    } catch {
      return undefined;
    }
  };

  const encodeCursor = (sort: unknown[] | undefined): string | undefined =>
    Array.isArray(sort) && sort.length === PAGINATION_SORT.length
      ? Buffer.from(JSON.stringify(sort), 'utf8').toString('base64')
      : undefined;

  return {
    async list({ filter = 'all' } = {}) {
      try {
        const response = await esClient.search<StoredMemoryPage>(
          {
            index: MEMORY_INDEX,
            query: { bool: { filter: filterClause(filter) } },
            size: MAX_LIST_SIZE,
            sort: PAGINATION_SORT,
          },
          { signal }
        );
        const pages = hitsToPages(response.hits.hits);
        const nowSec = now();
        let decayedImpressions = 0;
        let decayedConversions = 0;
        for (const page of pages) {
          const display = toMemoryDisplayTelemetry(page, nowSec);
          decayedImpressions += display.impressions;
          decayedConversions += display.conversions;
        }

        return {
          pages: pages.map(toSummary),
          stats: {
            total: pages.length,
            archived: pages.filter((page) => page.archived).length,
            decayed_impressions: decayedImpressions,
            decayed_conversions: decayedConversions,
          },
        };
      } catch (err) {
        if (isIndexNotFoundError(err)) {
          return { pages: [], stats: emptyStats() };
        }
        throw err;
      }
    },

    async listPaginated({ filter = 'all', cursor, size } = {}) {
      const pageSize = Math.min(Math.max(size ?? DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE);
      const searchAfter = decodeCursor(cursor);

      try {
        const response = await esClient.search<StoredMemoryPage>(
          {
            index: MEMORY_INDEX,
            query: { bool: { filter: filterClause(filter) } },
            size: pageSize,
            track_total_hits: true,
            sort: PAGINATION_SORT,
            ...(searchAfter ? { search_after: searchAfter } : {}),
          },
          { signal }
        );

        const hits = response.hits.hits;
        const pages = hitsToPages(hits);
        // A short page means there is nothing after it; a full page might be the last.
        const lastSort = hits.length > 0 ? hits[hits.length - 1].sort : undefined;
        const nextCursor =
          hits.length === pageSize && pages.length === pageSize
            ? encodeCursor(lastSort)
            : undefined;
        const total =
          typeof response.hits.total === 'number'
            ? response.hits.total
            : response.hits.total?.value ?? 0;

        return {
          pages: pages.map(toSummary),
          stats: await aggregateStats(filter),
          total,
          ...(nextCursor ? { cursor: nextCursor } : {}),
        };
      } catch (err) {
        if (isIndexNotFoundError(err)) {
          return { pages: [], stats: emptyStats(), total: 0 };
        }
        throw err;
      }
    },

    async retrieve({ query, size, match = 'context' } = {}) {
      const trimmed = query?.trim();
      const isSearch = trimmed !== undefined && trimmed.length > 0;
      const pageSize = size ?? (isSearch ? 50 : 150);
      // Recall never returns archived memories; the `exists` check is on
      // `archive_reason` rather than the removed `status` value.
      const notArchived = { exists: { field: ARCHIVE_REASON_FIELD } };
      logger.debug(
        `Memory retrieve start match=${match} search=${isSearch} size=${pageSize} ` +
          `space=${spaceId} query=${JSON.stringify(previewText(trimmed))}`
      );

      const searchWithQuery = async (queryText: string) => {
        if (match === 'content') {
          const response = await esClient.search<StoredMemoryPage>(
            {
              index: MEMORY_INDEX,
              query: {
                bool: {
                  filter: spaceAndTagFilter,
                  must_not: [notArchived],
                  must: [
                    {
                      bool: {
                        should: [
                          { match: { title: queryText } },
                          { match: { content: queryText } },
                        ],
                        minimum_should_match: 1,
                      },
                    },
                  ],
                },
              },
              size: pageSize,
            },
            { signal }
          );
          return hitsToPages(response.hits.hits);
        }

        try {
          const response = await esClient.search<StoredMemoryPage>(
            {
              index: MEMORY_INDEX,
              size: pageSize,
              retriever: {
                rrf: {
                  retrievers: [
                    { standard: { query: { match: { context: queryText } } } },
                    { standard: { query: { match: { 'context.semantic': queryText } } } },
                  ],
                  filter: {
                    bool: {
                      filter: spaceAndTagFilter,
                      must_not: [notArchived],
                    },
                  },
                  rank_window_size: pageSize,
                },
              },
            },
            { signal }
          );
          return hitsToPages(response.hits.hits);
        } catch (err) {
          if (isIndexNotFoundError(err)) {
            return [];
          }
          logger.warn(
            `Memory context hybrid retrieve failed, falling back to BM25: ${
              err instanceof Error ? err.message : String(err)
            }`
          );
          const response = await esClient.search<StoredMemoryPage>(
            {
              index: MEMORY_INDEX,
              query: {
                bool: {
                  filter: spaceAndTagFilter,
                  must_not: [notArchived],
                  must: [{ match: { context: queryText } }],
                },
              },
              size: pageSize,
            },
            { signal }
          );
          return hitsToPages(response.hits.hits);
        }
      };

      try {
        let pages: MemoryPage[];
        if (!isSearch || trimmed === undefined) {
          const response = await esClient.search<StoredMemoryPage>(
            {
              index: MEMORY_INDEX,
              query: {
                bool: {
                  filter: spaceAndTagFilter,
                  must_not: [notArchived],
                },
              },
              size: pageSize,
              sort: [{ '@timestamp': { order: 'desc' as const } }],
            },
            { signal }
          );
          pages = hitsToPages(response.hits.hits);
        } else {
          pages = await searchWithQuery(trimmed);
        }
        logger.debug(
          `Memory retrieve done match=${match} hits=${pages.length}: ${formatPageRefs(pages)}`
        );
        return pages;
      } catch (err) {
        if (isIndexNotFoundError(err)) {
          logger.debug(`Memory retrieve index ${MEMORY_INDEX} missing — returning 0 hits`);
          return [];
        }
        throw err;
      }
    },

    async get(id) {
      if (!isCanonicalMemoryId(id)) {
        return undefined;
      }
      const storedId = toStoredId(id);
      try {
        const response = await esClient.get<StoredMemoryPage>(
          {
            index: MEMORY_INDEX,
            id: storedId,
          },
          { signal }
        );
        return response.found && response._source ? toPage(id, response._source) : undefined;
      } catch (err) {
        if (isIndexNotFoundError(err) || isNotFoundError(err)) {
          return undefined;
        }
        throw err;
      }
    },

    /**
     * Batched read. The lineage walk needs an ancestor's ancestors, and issuing
     * one `get` per level turns a five-deep chain into five round trips.
     *
     * Non-canonical and unknown ids are dropped; the caller does not need to
     * distinguish "missing" from "malformed".
     */
    async getMany(ids) {
      const canonical = [...new Set(ids)].filter(isCanonicalMemoryId);
      if (canonical.length === 0) {
        return [];
      }
      const byStoredId = new Map(canonical.map((id) => [toStoredId(id), id]));
      try {
        const response = await esClient.mget<StoredMemoryPage>(
          {
            index: MEMORY_INDEX,
            ids: [...byStoredId.keys()],
          },
          { signal }
        );
        return response.docs.flatMap((doc) => {
          const item = doc as { _id?: string; found?: boolean; _source?: StoredMemoryPage };
          if (!item.found || !item._source || !item._id) return [];
          const pageId = byStoredId.get(item._id);
          if (!pageId) return [];
          const page = toPage(pageId, item._source);
          return page ? [page] : [];
        });
      } catch (err) {
        if (isIndexNotFoundError(err)) return [];
        throw err;
      }
    },

    async getVersioned(id) {
      if (!isCanonicalMemoryId(id)) {
        return undefined;
      }
      const storedId = toStoredId(id);
      try {
        const response = await esClient.get<StoredMemoryPage>(
          {
            index: MEMORY_INDEX,
            id: storedId,
          },
          { signal }
        );
        if (response.found && response._source) {
          const page = toPage(id, response._source);
          if (page && response._seq_no !== undefined && response._primary_term !== undefined) {
            return {
              page,
              seqNo: response._seq_no,
              primaryTerm: response._primary_term,
            };
          }
        }
        return undefined;
      } catch (err) {
        if (isIndexNotFoundError(err) || isNotFoundError(err)) {
          return undefined;
        }
        throw err;
      }
    },

    async getByName(name) {
      const slug = canonicalizeSlug(name);
      return this.get(toMemoryKiId(slug));
    },

    async upsert(page) {
      const id = toMemoryKiId(page.slug);
      const storedId = toStoredId(id);
      const existing = await this.get(id);
      const document = buildDocument(page, existing);

      await esClient.index(
        {
          index: MEMORY_INDEX,
          id: storedId,
          document,
          refresh: 'wait_for',
        },
        { signal }
      );
      return mapWrittenPage(id, document);
    },

    async create(page) {
      const id = toMemoryKiId(page.slug);
      const document = buildDocument(page, undefined);
      await esClient.index(
        {
          index: MEMORY_INDEX,
          id: toStoredId(id),
          document,
          op_type: 'create',
          refresh: 'wait_for',
        },
        { signal }
      );
      return mapWrittenPage(id, document);
    },

    async update(id, page, version) {
      return writeVersionedPage(id, page, version);
    },

    async applyCounterUpdates(updates) {
      if (updates.length === 0) {
        return;
      }

      // Aggregate first so each logical batch decays a page only once.
      const deltas = new Map<string, { addImp: number; addConv: number }>();
      for (const update of updates) {
        const previous = deltas.get(update.id) ?? { addImp: 0, addConv: 0 };
        deltas.set(update.id, {
          addImp: previous.addImp + update.addImp,
          addConv: previous.addConv + update.addConv,
        });
      }

      let updated = 0;
      let skipped = 0;
      let conflicts = 0;
      for (const [id, delta] of [...deltas].sort(([left], [right]) => left.localeCompare(right))) {
        let applied = false;
        for (let attempt = 0; attempt < MAX_COUNTER_UPDATE_ATTEMPTS; attempt++) {
          const versioned = await this.getVersioned(id);
          if (!versioned || versioned.page.archived) {
            skipped++;
            break;
          }

          const current = toCounterState(versioned.page.telemetry);
          // A fresh time on every retry prevents a concurrent newer timestamp from regressing.
          const effectiveNow = Math.max(now(), current.lastTime);
          const next = applyUpdate(current, effectiveNow, delta.addImp, delta.addConv);

          try {
            // Elasticsearch 9.6 rejects scripts on any index containing semantic_text, even
            // when a script only changes counters, so send only the non-semantic partial fields.
            await esClient.update(
              {
                index: MEMORY_INDEX,
                id: toStoredId(id),
                if_seq_no: versioned.seqNo,
                if_primary_term: versioned.primaryTerm,
                refresh: 'wait_for',
                doc: {
                  attributes: {
                    impressions: next.impressions,
                    conversions: next.conversions,
                    last_impression_time: epochSecondsToIso(next.lastTime),
                  },
                },
              },
              { signal }
            );
            // The successful conditional write is the atomic linearization point.
            updated++;
            applied = true;
            break;
          } catch (err) {
            if (!isElasticsearchWriteConflict(err)) {
              throw err;
            }
            conflicts++;
            logger.debug(`Memory counter update conflict id=${id} attempt=${attempt + 1}`);
            // Rereading and recomputing on conflict preserves increments committed by another writer.
            if (attempt === MAX_COUNTER_UPDATE_ATTEMPTS - 1) {
              // Bounded exhaustion fails visibly instead of silently dropping feedback.
              throw new Error(
                `Memory counter update exhausted ${MAX_COUNTER_UPDATE_ATTEMPTS} version conflicts`,
                { cause: err }
              );
            }
          }
        }
        if (applied) {
          logger.debug(
            `Memory counter update applied id=${id} +imp=${delta.addImp} +conv=${delta.addConv}`
          );
        }
      }
      logger.debug(
        `Memory counter updates completed total=${deltas.size} updated=${updated} ` +
          `skipped=${skipped} conflicts=${conflicts}`
      );
    },

    async archive(id, reason) {
      for (let attempt = 0; attempt < MAX_ARCHIVE_ATTEMPTS; attempt++) {
        const versioned = await this.getVersioned(id);
        if (!versioned || versioned.page.archived) {
          return undefined;
        }
        try {
          return await this.archiveVersioned(versioned, reason);
        } catch (err) {
          if (!isElasticsearchWriteConflict(err)) {
            throw err;
          }
          if (attempt === MAX_ARCHIVE_ATTEMPTS - 1) {
            throw new Error(`Memory archive exhausted ${MAX_ARCHIVE_ATTEMPTS} version conflicts`, {
              cause: err,
            });
          }
        }
      }
      return undefined;
    },

    async archiveVersioned(version, reason) {
      return writeVersionedPage(version.page.id, toArchiveWrite(version, reason), version);
    },

    /**
     * Returns an archived memory to active recall by clearing `archive_reason`.
     *
     * Retries on a version conflict for the same reason `archive` does: the
     * optimizer writes asynchronously and can land between our read and write.
     * A memory that is already active is left untouched and returned as-is.
     */
    async unarchive(id) {
      for (let attempt = 0; attempt < MAX_ARCHIVE_ATTEMPTS; attempt++) {
        const versioned = await this.getVersioned(id);
        if (!versioned) {
          return undefined;
        }
        if (!versioned.page.archived) {
          return versioned.page;
        }
        // The reason is the only archived marker, so dropping it is the whole
        // operation. Everything else is carried through unchanged.
        const restored: MemoryPageWrite = {
          slug: versioned.page.slug,
          title: versioned.page.title,
          description: versioned.page.description,
          content: versioned.page.content,
          context: versioned.page.context,
          tags: versioned.page.tags,
          categories: versioned.page.categories,
          references: versioned.page.references,
          source: versioned.page.source,
          merged_from: versioned.page.merged_from,
          agent_id: versioned.page.agent_id,
          conversation_id: versioned.page.conversation_id,
          telemetry: versioned.page.telemetry,
          user: versioned.page.updated_by || 'nightshift',
        };
        try {
          return await writeVersionedPage(id, restored, versioned);
        } catch (err) {
          if (!isElasticsearchWriteConflict(err)) {
            throw err;
          }
          if (attempt === MAX_ARCHIVE_ATTEMPTS - 1) {
            throw new Error(
              `Memory unarchive exhausted ${MAX_ARCHIVE_ATTEMPTS} version conflicts`,
              { cause: err }
            );
          }
        }
      }
      return undefined;
    },

    async delete(id) {
      const storedId = toStoredId(id);
      try {
        await esClient.delete(
          {
            index: MEMORY_INDEX,
            id: storedId,
            refresh: 'wait_for',
          },
          { signal }
        );
      } catch (err) {
        if (!isIndexNotFoundError(err) && (err as { statusCode?: number }).statusCode !== 404) {
          throw err;
        }
      }
    },
  };
};
