/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import {
  MEMORY_INDEX,
  type MemoryArchiveReason,
  type StoredMemoryPage,
  type StoredMemoryStatus,
  type MemoryPage,
  type MemoryStats,
} from '../../common/memory';
import { formatPageRefs, previewText } from './log_format';
import { applyUpdates, displayTelemetry, type CounterState, type CounterUpdate } from './ranking';

const MAX_LIST_SIZE = 500;
const MEMORY_TAG = 'memory';
const AGENT_ID_FIELD = 'attributes.agent_id';

export type { CounterUpdate };

export type MemoryRetrieveMatch = 'context' | 'content';

export interface MemoryPageStore {
  list: (options?: { status?: StoredMemoryStatus }) => Promise<{
    pages: MemoryPage[];
    stats: MemoryStats;
  }>;
  retrieve: (options?: {
    query?: string;
    size?: number;
    /** Task recall uses `context` (default). Duplicate-detection uses `content`. */
    match?: MemoryRetrieveMatch;
  }) => Promise<MemoryPage[]>;
  get: (id: string) => Promise<MemoryPage | undefined>;
  getByName: (name: string) => Promise<MemoryPage | undefined>;
  upsert: (page: {
    slug: string;
    title: string;
    description?: string;
    content: string;
    context?: string;
    tags: string[];
    categories: string[];
    references: string[];
    status: StoredMemoryStatus;
    source?: string;
    merged_from?: string[];
    archive_reason?: MemoryArchiveReason;
    telemetry?: {
      impressions: number;
      conversions: number;
      last_impression_time: string;
    };
    user: string;
  }) => Promise<MemoryPage>;
  applyCounterUpdates: (updates: readonly CounterUpdate[]) => Promise<void>;
  archive: (id: string, reason: MemoryArchiveReason) => Promise<MemoryPage | undefined>;
  delete: (id: string) => Promise<void>;
  pruneDuplicates: () => Promise<number>;
}

const normalizeSlugText = (slug: string): string =>
  slug
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const canonicalizeSlug = (slug: string): string => {
  let normalized = normalizeSlugText(slug);
  if (normalized.startsWith('memory-')) {
    normalized = normalized.slice('memory-'.length);
  }
  return normalized.replace(/^-+|-+$/g, '').slice(0, 80);
};

export const toMemoryKiId = (slug: string): string => {
  const normalizedSlug = canonicalizeSlug(slug);
  return `memory_${normalizedSlug}`.slice(0, 512);
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
  const status = source.attributes?.status ?? 'tentative';

  return {
    id,
    slug,
    title: source.title,
    description: source.description,
    content: source.content ?? '',
    context: source.context,
    tags: source.tags ?? [],
    status,
    agent_id: source.attributes?.agent_id ?? '',
    source: source.attributes?.source,
    merged_from: source.attributes?.merged_from,
    archive_reason: source.attributes?.archive_reason,
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
  agentId,
  signal,
  now = () => Date.now() / 1000,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  agentId: string;
  signal?: AbortSignal;
  now?: () => number;
}): MemoryPageStore => {
  const isIndexNotFoundError = (err: unknown): boolean => {
    const statusCode = (err as { statusCode?: number }).statusCode;
    if (statusCode === 404) return true;
    const message = err instanceof Error ? err.message : String(err);
    return message.includes('index_not_found_exception');
  };

  const idPrefix = `${agentId}:`;
  const toStoredId = (pageId: string): string => `${idPrefix}${pageId}`;
  /** Drops leftover `default:` (and any other agent) ids. No migration. */
  const toPageId = (storedId: string): string | undefined =>
    storedId.startsWith(idPrefix) ? storedId.slice(idPrefix.length) : undefined;

  const listAll = async (): Promise<MemoryPage[]> => {
    try {
      const response = await esClient.search<StoredMemoryPage>(
        {
          index: MEMORY_INDEX,
          query: {
            bool: {
              filter: [{ term: { tags: MEMORY_TAG } }, { term: { [AGENT_ID_FIELD]: agentId } }],
            },
          },
          size: MAX_LIST_SIZE,
          sort: [{ '@timestamp': { order: 'desc' } }],
        },
        { signal }
      );

      return response.hits.hits.flatMap((hit) => {
        if (!hit._id || !hit._source) return [];
        const pageId = toPageId(hit._id);
        if (!pageId) return [];
        const page = toPage(pageId, hit._source);
        return page ? [page] : [];
      });
    } catch (err) {
      if (isIndexNotFoundError(err)) return [];
      throw err;
    }
  };

  return {
    async list({ status } = {}) {
      const allPages = await listAll();
      const filtered = allPages.filter((page) => {
        if (status !== undefined && page.status !== status) {
          return false;
        }
        return true;
      });

      const nowSec = now();
      let decayedImpressions = 0;
      let decayedConversions = 0;
      for (const page of filtered) {
        const display = toMemoryDisplayTelemetry(page, nowSec);
        decayedImpressions += display.impressions;
        decayedConversions += display.conversions;
      }

      return {
        pages: filtered,
        stats: {
          total: filtered.length,
          decayed_impressions: decayedImpressions,
          decayed_conversions: decayedConversions,
        },
      };
    },

    async retrieve({ query, size, match = 'context' } = {}) {
      const trimmed = query?.trim();
      const isSearch = trimmed !== undefined && trimmed.length > 0;
      const pageSize = size ?? (isSearch ? 50 : 150);
      const agentAndTagFilter = [
        { term: { tags: MEMORY_TAG } },
        { term: { [AGENT_ID_FIELD]: agentId } },
      ];
      const notArchived = { term: { 'attributes.status': 'archived' } };
      logger.debug(
        `Memory retrieve start match=${match} search=${isSearch} size=${pageSize} ` +
          `agent=${agentId} query=${JSON.stringify(previewText(trimmed))}`
      );

      const hitsToPages = (
        hits: Array<{ _id?: string; _source?: StoredMemoryPage }>
      ): MemoryPage[] =>
        hits.flatMap((hit) => {
          if (!hit._id || !hit._source) return [];
          const pageId = toPageId(hit._id);
          if (!pageId) return [];
          const page = toPage(pageId, hit._source);
          return page ? [page] : [];
        });

      const searchWithQuery = async (queryText: string) => {
        if (match === 'content') {
          const response = await esClient.search<StoredMemoryPage>(
            {
              index: MEMORY_INDEX,
              query: {
                bool: {
                  filter: agentAndTagFilter,
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
                      filter: agentAndTagFilter,
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
                  filter: agentAndTagFilter,
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
                  filter: agentAndTagFilter,
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
          return toPage(id, response._source);
        }
        return undefined;
      } catch (err) {
        if (isIndexNotFoundError(err) || (err as { statusCode?: number }).statusCode === 404) {
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
      const nowIso = epochSecondsToIso(now());

      const document: StoredMemoryPage = {
        '@timestamp': nowIso,
        type: 'memory',
        title: page.title,
        description: page.description,
        content: page.content,
        context: page.context ?? existing?.context,
        tags: memoryTags(page.tags),
        attributes: {
          status: page.status,
          slug: page.slug,
          agent_id: agentId,
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

      await esClient.index(
        {
          index: MEMORY_INDEX,
          id: storedId,
          document,
          refresh: 'wait_for',
        },
        { signal }
      );

      const updated = toPage(id, document);
      if (!updated) {
        throw new Error(`Failed to map standard index response to MemoryPage for ${id}`);
      }
      return updated;
    },

    async applyCounterUpdates(updates) {
      if (updates.length === 0) {
        return;
      }

      const uniqueIds = [...new Set(updates.map((update) => update.id))];
      const storedIds = uniqueIds.map(toStoredId);

      let docs: Array<{
        _id?: string;
        found?: boolean;
        _source?: StoredMemoryPage;
      }>;
      try {
        const response = await esClient.mget<StoredMemoryPage>(
          {
            index: MEMORY_INDEX,
            ids: storedIds,
          },
          { signal }
        );
        docs = response.docs;
      } catch (err) {
        if (isIndexNotFoundError(err)) {
          return;
        }
        throw err;
      }

      const sourceByPageId = new Map<string, StoredMemoryPage>();
      for (const doc of docs) {
        if (!doc._id || doc.found === false || !doc._source) {
          continue;
        }
        const pageId = toPageId(doc._id);
        if (!pageId) {
          continue;
        }
        sourceByPageId.set(pageId, doc._source);
      }

      const nowSec = now();
      const current: Record<string, CounterState> = {};
      const sourcesToWrite: Array<{ id: string; source: StoredMemoryPage }> = [];

      for (const id of uniqueIds) {
        const source = sourceByPageId.get(id);
        const page = source ? toPage(id, source) : undefined;
        if (!source || !page || page.status === 'archived') {
          continue;
        }
        current[id] = toCounterState(page.telemetry);
        sourcesToWrite.push({ id, source });
      }

      const next = applyUpdates(
        current,
        updates.filter((update) => current[update.id] !== undefined),
        nowSec
      );

      const operations: object[] = [];
      for (const { id, source } of sourcesToWrite) {
        const counter = next[id];
        if (!counter) {
          continue;
        }
        const document: StoredMemoryPage = {
          ...source,
          attributes: {
            ...source.attributes,
            impressions: counter.impressions,
            conversions: counter.conversions,
            last_impression_time: epochSecondsToIso(counter.lastTime),
          },
        };
        operations.push({ index: { _index: MEMORY_INDEX, _id: toStoredId(id) } }, document);
      }

      if (operations.length === 0) {
        logger.debug('Memory counter bulk update skipped — no writable pages');
        return;
      }

      const bulk = await esClient.bulk(
        {
          refresh: 'wait_for',
          operations,
        },
        { signal }
      );
      logger.debug(
        `Memory counter bulk update wrote ${sourcesToWrite.length} doc(s): ` +
          sourcesToWrite
            .map((row) => {
              const counter = next[row.id];
              return counter
                ? `${row.id} imp=${counter.impressions.toFixed(
                    3
                  )} conv=${counter.conversions.toFixed(3)}`
                : row.id;
            })
            .join(', ')
      );
      if (bulk.errors) {
        throw new Error('Memory counter bulk update failed for one or more items');
      }
    },

    async archive(id, reason) {
      const existing = await this.get(id);
      if (!existing || existing.status === 'archived') {
        return undefined;
      }

      return this.upsert({
        slug: existing.slug,
        title: existing.title,
        description: existing.description,
        content: existing.content,
        context: existing.context,
        tags: existing.tags,
        categories: existing.categories,
        references: existing.references,
        status: 'archived',
        source: existing.source,
        merged_from: existing.merged_from,
        archive_reason: reason,
        telemetry: existing.telemetry,
        user: existing.updated_by,
      });
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

    async pruneDuplicates() {
      return 0;
    },
  };
};
