/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ElasticsearchClient,
  Logger,
  SavedObject,
  SavedObjectsClientContract,
  SavedObjectReference,
  SecurityServiceStart,
} from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { isSavedObjectErrorResult } from '@kbn/core-saved-objects-server';
import type { SetOptional } from 'type-fest';
import type {
  AggregationsFilterAggregate,
  AggregationsStringTermsAggregate,
  AggregationsStringTermsBucket,
} from '@elastic/elasticsearch/lib/api/types';
import { nodeBuilder } from '@kbn/es-query';
import type { WatchlistObject } from '../../../../../common/api/entity_analytics/watchlists/management/common.gen';
import type { MonitoringEntitySource } from '../../../../../common/api/entity_analytics/watchlists/data_source/common.gen';
import { validateWatchlistUpdate } from './validation';
import { getIndexForWatchlist } from '../entities/utils';
import { generateWatchlistEntityIndexMappings } from '../entities/mappings';
import { watchlistConfigTypeName } from './saved_object/watchlist_config_type';
import { createOrUpdateIndex } from '../../utils/create_or_update_index';
import { watchlistEntitySourceTypeName } from '../entity_sources/infra';
import { invalidateEntitySourceApiKey } from '../entity_sources/entity_source_api_key';
import { MANUAL_SOURCE_ID } from '../entity_sources/manual/constants';

export const MAX_PER_PAGE = 10_000;

interface WatchlistConfigClientDeps {
  soClient: SavedObjectsClientContract;
  esClient: ElasticsearchClient;
  /**
   * Used for system index operations (e.g. creating the watchlist backing index).
   * Hidden indices require the `x-elastic-product-origin: kibana` header which is
   * only attached when using the internal client.
   */
  internalEsClient?: ElasticsearchClient;
  securityServiceStart?: SecurityServiceStart;
  namespace: string;
  logger: Logger;
}

type WatchlistSavedObjectAttributes = Omit<
  WatchlistObject,
  'id' | 'createdAt' | 'updatedAt' | 'hasManualEntities'
>;
type WatchlistUpdateAttrs = Partial<WatchlistSavedObjectAttributes>;
type WatchlistObjectWithId = WatchlistObject & { id: string };

export type ResolveWatchlistResult = { id: string; name: string } | { error: string };

interface WatchlistEntityMetadata {
  entityCount: number;
  hasManualEntities: boolean;
}

const omitWatchlistMeta = (
  watchlist: Partial<WatchlistObject>
): Partial<WatchlistSavedObjectAttributes> => {
  const {
    id: _ignoredId,
    createdAt: _ignoredCreatedAt,
    updatedAt: _ignoredUpdatedAt,
    hasManualEntities: _ignoredHasManualEntities,
    ...attrs
  } = watchlist;
  return attrs;
};

const ENTITY_SOURCE_REF_NAME_PREFIX = 'entity-source_';

const isEntitySourceRef = (ref: SavedObjectReference): boolean =>
  ref.type === watchlistEntitySourceTypeName && ref.name.startsWith(ENTITY_SOURCE_REF_NAME_PREFIX);

const extractEntitySourceIds = (references: SavedObjectReference[]): string[] =>
  references.filter(isEntitySourceRef).map((ref) => ref.id);

// TODO: Update WatchlistObject OpenAPI schema to include entitySourceIds
const toWatchlistObject = (so: SavedObject<WatchlistSavedObjectAttributes>): WatchlistObject => ({
  ...so.attributes,
  id: so.id,
  createdAt: so.created_at,
  updatedAt: so.updated_at,
  entitySourceIds: extractEntitySourceIds(so.references ?? []),
});

export interface WatchlistValidationError extends Error {
  statusCode: number;
}

export const createWatchlistValidationError = (
  statusCode: number,
  message: string
): WatchlistValidationError => {
  const error = new Error(message) as WatchlistValidationError;
  error.statusCode = statusCode;
  return error;
};

export class WatchlistConfigClient {
  constructor(private readonly deps: WatchlistConfigClientDeps) {}

  async create(
    attrs: SetOptional<WatchlistSavedObjectAttributes, 'managed'>,
    options?: { id?: string }
  ): Promise<WatchlistObject> {
    const so = await this.deps.soClient.create<WatchlistSavedObjectAttributes>(
      watchlistConfigTypeName,
      { ...attrs, managed: attrs.managed ?? false },
      { id: options?.id, refresh: 'wait_for' }
    );

    if (!this.deps.internalEsClient) {
      throw new Error('internalEsClient is required to create a watchlist index');
    }

    try {
      await createOrUpdateIndex({
        esClient: this.deps.internalEsClient,
        logger: this.deps.logger,
        options: {
          index: getIndexForWatchlist(this.deps.namespace),
          mappings: generateWatchlistEntityIndexMappings(),
          settings: { hidden: true, auto_expand_replicas: '0-1' },
        },
      });
    } catch (err) {
      await this.deps.soClient
        .delete(watchlistConfigTypeName, so.id, { refresh: 'wait_for' })
        .catch((deleteErr) =>
          this.deps.logger.error(
            `Failed to roll back watchlist saved object '${so.id}' after index creation failed: ${deleteErr.message}`
          )
        );
      throw err;
    }

    return toWatchlistObject(so);
  }

  async update(id: string, attrs: WatchlistUpdateAttrs): Promise<WatchlistObject> {
    const existing = await this.get(id);

    validateWatchlistUpdate(id, attrs, existing);

    const existingAttrs = omitWatchlistMeta(existing);
    const attrsNoMeta = omitWatchlistMeta(attrs);
    const update: Partial<WatchlistSavedObjectAttributes> = {
      ...existingAttrs,
      ...attrsNoMeta,
    };
    await this.deps.soClient.update<WatchlistSavedObjectAttributes>(
      watchlistConfigTypeName,
      id,
      update,
      { refresh: 'wait_for' }
    );
    return this.get(id);
  }

  /**
   * List all watchlists and populate entity counts for each watchlist
   * @returns List of watchlists with entity counts
   */
  async list(limit: number = MAX_PER_PAGE): Promise<WatchlistObjectWithId[]> {
    const response = await this.deps.soClient.find<WatchlistObject>({
      type: watchlistConfigTypeName,
      namespaces: [this.deps.namespace],
      perPage: limit,
    });
    const watchlists = response.saved_objects.map(
      (so) => toWatchlistObject(so) as WatchlistObjectWithId
    );
    const watchlistIds = watchlists.map((w) => w.id);
    if (watchlistIds.length > 0) {
      const entityMetadata = await this.getEntityMetadata(watchlistIds);
      for (const w of watchlists) {
        const metadata = entityMetadata[w.id];
        w.entityCount = metadata?.entityCount ?? 0;
        w.hasManualEntities = metadata?.hasManualEntities ?? false;
      }
    }
    return watchlists;
  }

  /**
   * Resolves a watchlist reference that may be either an id or a name to its canonical id.
   *
   * Tries the reference as an id first (a direct saved-object get); on a miss, looks it up by an
   * **exact** name match. Because the `name` field is a case-sensitive `keyword` (no normalizer),
   * the name match is exact and case-sensitive. Returns an actionable `error` when the name is
   * unknown or ambiguous. Does not populate entity counts — resolution only needs id + name.
   */
  async resolveIdentifier(identifier: string): Promise<ResolveWatchlistResult> {
    const trimmed = identifier.trim();

    // 1. Treat the reference as an id.
    try {
      const so = await this.deps.soClient.get<WatchlistSavedObjectAttributes>(
        watchlistConfigTypeName,
        trimmed
      );
      return { id: so.id, name: so.attributes.name };
    } catch (error) {
      if (!SavedObjectsErrorHelpers.isNotFoundError(error)) {
        throw error;
      }
    }

    // 2. Look it up by exact name
    const response = await this.deps.soClient.find<WatchlistSavedObjectAttributes>({
      type: watchlistConfigTypeName,
      namespaces: [this.deps.namespace],
      filter: nodeBuilder.is(`${watchlistConfigTypeName}.attributes.name`, trimmed),
      perPage: 100,
      fields: ['name'],
    });

    const matches = response.saved_objects;
    if (matches.length === 1) {
      return { id: matches[0].id, name: matches[0].attributes.name };
    }
    if (matches.length > 1) {
      return {
        error: `Multiple watchlists are named "${trimmed}". Pass the watchlist id instead. Candidates: ${matches
          .map((so) => `${so.attributes.name} (${so.id})`)
          .join(', ')}.`,
      };
    }
    return {
      error: `No watchlist found named "${trimmed}". The name must match exactly (case-sensitive) — use security.list_watchlists to see the available watchlists, or pass the watchlist id.`,
    };
  }

  async get(id: string) {
    try {
      const so = await this.deps.soClient.get<WatchlistSavedObjectAttributes>(
        watchlistConfigTypeName,
        id
      );
      const watchlist = toWatchlistObject(so);
      watchlist.entityCount = await this.getEntityCount(id);
      return watchlist;
    } catch (e) {
      if (e.output && e.output.statusCode === 404) {
        throw new Error(`Watchlist config '${id}' not found`);
      }
      throw e;
    }
  }

  async delete(id: string) {
    const securityServiceStart = this.deps.securityServiceStart;

    // Step 1: Fetch all entity source linked to the watchlist
    const entitySourceIds = await this.getEntitySourceIds(id);
    const indexSourcesApiKeyIdMap = new Map<string, string>();
    if (securityServiceStart && entitySourceIds.length > 0) {
      const soResults = await this.deps.soClient.bulkGet<MonitoringEntitySource>(
        entitySourceIds.map((sourceId) => ({ type: watchlistEntitySourceTypeName, id: sourceId }))
      );

      soResults.saved_objects.forEach((so) => {
        if (
          !isSavedObjectErrorResult(so) &&
          so.attributes.type === 'index' &&
          !!so.attributes.apiKeyId
        ) {
          indexSourcesApiKeyIdMap.set(so.id, so.attributes.apiKeyId);
        }
      });
    }

    // Step 2: Cascade-delete linked entity sources to prevent orphans
    const results = await Promise.allSettled(
      entitySourceIds.map((sourceId) =>
        this.deps.soClient.delete(watchlistEntitySourceTypeName, sourceId, {
          refresh: 'wait_for',
        })
      )
    );

    const successfullyDeletedSourceIds: string[] = [];
    for (const [i, result] of results.entries()) {
      const sourceId = entitySourceIds[i];
      if (result.status === 'rejected') {
        this.deps.logger.warn(
          `Failed to delete entity source '${sourceId}' while deleting watchlist '${id}': ${result.reason.message}`
        );
      } else {
        successfullyDeletedSourceIds.push(sourceId);
      }
    }

    // Step 3: Invalidate API keys for successfully deleted entity sources
    if (securityServiceStart && successfullyDeletedSourceIds.length > 0) {
      await Promise.allSettled(
        successfullyDeletedSourceIds.flatMap((sourceId) => {
          const apiKeyId = indexSourcesApiKeyIdMap.get(sourceId);
          return apiKeyId
            ? [invalidateEntitySourceApiKey(securityServiceStart, apiKeyId, this.deps.logger)]
            : [];
        })
      );
    }

    return this.deps.soClient.delete(watchlistConfigTypeName, id, { refresh: 'wait_for' });
  }

  async addEntitySourceReference(watchlistId: string, entitySourceId: string): Promise<void> {
    const so = await this.deps.soClient.get<WatchlistSavedObjectAttributes>(
      watchlistConfigTypeName,
      watchlistId
    );

    const existingRefs = so.references ?? [];
    const alreadyLinked = existingRefs.some(
      (ref) => isEntitySourceRef(ref) && ref.id === entitySourceId
    );

    if (alreadyLinked) {
      return;
    }

    const newRef: SavedObjectReference = {
      name: `${ENTITY_SOURCE_REF_NAME_PREFIX}${entitySourceId}`,
      type: watchlistEntitySourceTypeName,
      id: entitySourceId,
    };

    await this.deps.soClient.update<WatchlistSavedObjectAttributes>(
      watchlistConfigTypeName,
      watchlistId,
      {},
      { references: [...existingRefs, newRef], refresh: 'wait_for' }
    );
  }

  async removeEntitySourceReference(
    watchlistId: string,
    source: MonitoringEntitySource
  ): Promise<void> {
    const so = await this.deps.soClient.get<WatchlistSavedObjectAttributes>(
      watchlistConfigTypeName,
      watchlistId
    );

    if (source.managed === true) {
      throw createWatchlistValidationError(
        400,
        `Cannot delete managed entity source '${source.id}'`
      );
    }

    const existingRefs = so.references ?? [];
    const hasRef = existingRefs.some((ref) => isEntitySourceRef(ref) && ref.id === source.id);

    if (!hasRef) {
      throw createWatchlistValidationError(
        404,
        `Entity source '${source.id}' is not linked to watchlist '${watchlistId}'`
      );
    }

    const filteredRefs = existingRefs.filter(
      (ref) => !(isEntitySourceRef(ref) && ref.id === source.id)
    );

    await this.deps.soClient.update<WatchlistSavedObjectAttributes>(
      watchlistConfigTypeName,
      watchlistId,
      {},
      { references: filteredRefs, refresh: 'wait_for' }
    );
  }

  async getEntitySourceIds(watchlistId: string): Promise<string[]> {
    const so = await this.deps.soClient.get<WatchlistSavedObjectAttributes>(
      watchlistConfigTypeName,
      watchlistId
    );

    return extractEntitySourceIds(so.references ?? []);
  }

  async getEntityCount(id: string): Promise<number> {
    const counts = await this.getEntityCounts([id]);
    return counts[id] ?? 0;
  }

  /**
   * Bulk fetch entity counts for a list of watchlists
   * @param ids List of watchlist IDs to fetch entity counts for
   * @returns Map of watchlist IDs to entity counts
   */
  async getEntityCounts(ids: string[]): Promise<Record<string, number>> {
    const metadata = await this.getEntityMetadata(ids);
    return Object.fromEntries(ids.map((id) => [id, metadata[id]?.entityCount ?? 0])) as Record<
      string,
      number
    >;
  }

  /**
   * Bulk fetch entity counts and manual-assignment state for a list of watchlists.
   */
  private async getEntityMetadata(ids: string[]): Promise<Record<string, WatchlistEntityMetadata>> {
    if (ids.length === 0) return {};

    const index = getIndexForWatchlist(this.deps.namespace);
    const metadata: Record<string, WatchlistEntityMetadata> = {};

    for (const id of ids) {
      metadata[id] = { entityCount: 0, hasManualEntities: false };
    }

    try {
      const response = await this.deps.esClient.search({
        index,
        ignore_unavailable: true,
        size: 0,
        query: {
          terms: {
            'watchlist.id': ids,
          },
        },
        aggs: {
          watchlist_counts: {
            terms: {
              field: 'watchlist.id',
              size: ids.length,
            },
            aggs: {
              manual_entities: {
                filter: {
                  term: {
                    'labels.source_ids': MANUAL_SOURCE_ID,
                  },
                },
              },
            },
          },
        },
      });

      const watchlistCountsAgg = response.aggregations?.watchlist_counts as
        | AggregationsStringTermsAggregate
        | undefined;
      const buckets = (watchlistCountsAgg?.buckets as AggregationsStringTermsBucket[]) ?? [];
      for (const bucket of buckets) {
        const manualEntities = bucket.manual_entities as AggregationsFilterAggregate | undefined;
        metadata[String(bucket.key)] = {
          entityCount: bucket.doc_count,
          hasManualEntities: (manualEntities?.doc_count ?? 0) > 0,
        };
      }
    } catch (err) {
      this.deps.logger.warn(`Failed to fetch watchlist entity metadata: ${(err as Error).message}`);
    }

    return metadata;
  }
}
