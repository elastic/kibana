/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ElasticsearchClient,
  KibanaRequest,
  Logger,
  SavedObjectsClientContract,
  StartServicesAccessor,
} from '@kbn/core/server';
import { isSavedObjectErrorResult } from '@kbn/core-saved-objects-server';
import Boom from '@hapi/boom';
import _ from 'lodash';
import moment from 'moment';
import type {
  MonitoringEntitySourceAttributes,
  MonitoringEntitySource,
} from '../../../../../../common/api/entity_analytics/watchlists/data_source/common.gen';
import type {
  ListWatchlistEntitySourcesRequestQuery,
  ListWatchlistEntitySourcesResponse,
} from '../../../../../../common/api/entity_analytics/watchlists/data_source/list.gen';
import type { StartPlugins } from '../../../../../plugin';
import { watchlistEntitySourceTypeName } from './entity_source_type';
import type { EntitySourceApiKeyFields } from './entity_source_type';
import {
  grantEntitySourceApiKey,
  invalidateEntitySourceApiKey,
  validateIndexPermissions,
} from '../entity_source_api_key';

export interface WatchlistEntitySourceClientDependencies {
  soClient: SavedObjectsClientContract;
  namespace: string;
  // user's scoped client (`core.elasticsearch.client.asCurrentUser`) - used to validate index read privileges
  esClient: ElasticsearchClient;
  getStartServices: StartServicesAccessor<StartPlugins>;
  logger: Logger;
  hasEncryptionKey: boolean;
}

interface UpsertResult {
  action: 'created' | 'updated';
  source: MonitoringEntitySource;
}

const ENCRYPTION_REQUIRED_ERROR =
  'Index-type entity sources require encrypted saved objects. Ensure xpack.encryptedSavedObjects.encryptionKey is configured.';

export class WatchlistEntitySourceClient {
  constructor(private readonly dependencies: WatchlistEntitySourceClientDependencies) {}

  /**
   * Checks everything that can make saving a source fail, without writing anything: a store source
   * needs a query, an index source needs encrypted saved objects and an index the current user can
   * read, and the name must be unique. Pass the source's own `id` when it is being updated.
   */
  async validate(
    attributes: Partial<MonitoringEntitySourceAttributes> & { id?: string }
  ): Promise<void> {
    if (attributes.type === 'store' && !attributes.queryRule) {
      throw Boom.badRequest('queryRule is required for store-type sources');
    }

    if (attributes.type === 'index') {
      if (!this.dependencies.hasEncryptionKey) {
        throw new Error(ENCRYPTION_REQUIRED_ERROR);
      }
      if (attributes.indexPattern) {
        await validateIndexPermissions(this.dependencies.esClient, attributes.indexPattern);
      }
    }

    await this.assertNameUniqueness(attributes);
  }

  async create(
    attributes: MonitoringEntitySourceAttributes,
    request?: KibanaRequest
  ): Promise<MonitoringEntitySource> {
    await this.validate(attributes);

    let apiKey = {};
    if (attributes.type === 'index') {
      if (!request) {
        throw new Error('Cannot create index-type entity source without a request.');
      }

      const [coreStart] = await this.dependencies.getStartServices();
      apiKey = (await grantEntitySourceApiKey(coreStart.security, request, attributes.name)) ?? {};
    }

    const { id, attributes: created } =
      await this.dependencies.soClient.create<MonitoringEntitySourceAttributes>(
        watchlistEntitySourceTypeName,
        { ...attributes, ...apiKey, managed: attributes.managed ?? false },
        { refresh: 'wait_for' }
      );

    return { ...created, id };
  }

  async upsert(
    source: Partial<MonitoringEntitySource>,
    request?: KibanaRequest
  ): Promise<UpsertResult> {
    const { sources } = await this.list({ name: source.name, per_page: 1 });
    const found = sources[0];

    if (found) {
      // TODO: Add matcher override protection (matchersModifiedByUser) once
      // managed source reconciliation is implemented for watchlists.
      const updated = await this.update({ ...source, id: found.id }, request);
      return { action: 'updated', source: updated };
    }

    const created = await this.create(source, request);
    return { action: 'created', source: created };
  }

  async update(
    entitySource: Partial<MonitoringEntitySource> & { id: string },
    request?: KibanaRequest
  ): Promise<MonitoringEntitySource> {
    const { esClient, getStartServices, logger } = this.dependencies;
    const [coreStart] = await getStartServices();

    // Step 1: Validate index permissions
    const currentSource = await this.get(entitySource.id);
    const newType = entitySource.type ?? currentSource?.type;
    const indexPatternToCheck =
      newType === 'index' ? entitySource.indexPattern ?? currentSource?.indexPattern : undefined;
    if (indexPatternToCheck) {
      await validateIndexPermissions(esClient, indexPatternToCheck);
    }

    // Step 2: handle API key fields
    const wasIndex = currentSource.type === 'index';
    const isNowIndex = newType === 'index';
    const indexPatternChanged =
      wasIndex &&
      isNowIndex &&
      entitySource.indexPattern !== undefined &&
      entitySource.indexPattern !== currentSource.indexPattern;

    let apiKey = {};
    // Invalidates old API key: index pattern changed or type changed from index to non-index
    if ((indexPatternChanged || (wasIndex && !isNowIndex)) && currentSource.apiKeyId) {
      await invalidateEntitySourceApiKey(coreStart.security, currentSource.apiKeyId, logger);
    }
    // Needs new API key: index pattern changed, type changed from non-index to index, or API key is missing (re-auth)
    if (isNowIndex && (indexPatternChanged || !wasIndex || !currentSource.apiKeyId)) {
      if (!this.dependencies.hasEncryptionKey) {
        throw new Error(ENCRYPTION_REQUIRED_ERROR);
      }
      if (!request) {
        throw new Error('Cannot update index-type entity source without a request.');
      }

      apiKey =
        (await grantEntitySourceApiKey(coreStart.security, request, entitySource.name)) ?? {};
    }
    // Clears API key fields: type changed from index to non-index
    if (wasIndex && !isNowIndex) {
      apiKey = { apiKeyId: null, apiKey: null };
    }

    // Step 3: Update entity source
    const newEntitySource = { ..._.omit(entitySource, ['id', 'apiKeyId', 'apiKey']), ...apiKey };
    await this.assertNameUniqueness(entitySource);
    const { attributes } =
      await this.dependencies.soClient.update<MonitoringEntitySourceAttributes>(
        watchlistEntitySourceTypeName,
        entitySource.id,
        newEntitySource,
        { refresh: 'wait_for' }
      );

    return { ...attributes, id: entitySource.id };
  }

  /**
   * Replaces the API key of an index source with one granted from `request`.
   * The new key is granted and persisted before the old one is invalidated.
   */
  async rotateApiKey(id: string, request: KibanaRequest): Promise<MonitoringEntitySource> {
    const { esClient, getStartServices, logger, soClient, hasEncryptionKey } = this.dependencies;

    if (!hasEncryptionKey) {
      throw new Error(ENCRYPTION_REQUIRED_ERROR);
    }

    const source = await this.get(id);
    if (source.type !== 'index') {
      throw Boom.badRequest('Only index-type entity sources have an API key.');
    }
    if (source.indexPattern) {
      await validateIndexPermissions(esClient, source.indexPattern);
    }

    const [coreStart] = await getStartServices();
    const newKey = await grantEntitySourceApiKey(coreStart.security, request, source.name);
    if (!newKey) {
      throw new Error('Could not create an API key from the current request.');
    }

    let attributes: MonitoringEntitySourceAttributes;
    try {
      ({ attributes } = await soClient.update<
        MonitoringEntitySourceAttributes & EntitySourceApiKeyFields
      >(watchlistEntitySourceTypeName, id, newKey, { refresh: 'wait_for' }));
    } catch (err) {
      // Only drop the new key once the source is confirmed to still reference another one.
      const storedApiKeyId = await this.readStoredApiKeyId(id);
      if (storedApiKeyId !== undefined && storedApiKeyId !== newKey.apiKeyId) {
        await invalidateEntitySourceApiKey(coreStart.security, newKey.apiKeyId, logger);
      }
      throw err;
    }

    if (source.apiKeyId) {
      await invalidateEntitySourceApiKey(coreStart.security, source.apiKeyId, logger);
    }

    return { ...source, ...attributes, id };
  }

  /** Returns the key id currently stored on the source, or `undefined` when it cannot be read. */
  private async readStoredApiKeyId(id: string): Promise<string | null | undefined> {
    try {
      const { attributes } = await this.dependencies.soClient.get<EntitySourceApiKeyFields>(
        watchlistEntitySourceTypeName,
        id
      );
      return attributes.apiKeyId ?? null;
    } catch {
      return undefined;
    }
  }

  async get(id: string): Promise<MonitoringEntitySource> {
    const { attributes, id: savedObjectId } =
      await this.dependencies.soClient.get<MonitoringEntitySource>(
        watchlistEntitySourceTypeName,
        id
      );
    return { ...attributes, id: savedObjectId };
  }

  async delete(id: string): Promise<void> {
    const { getStartServices, logger } = this.dependencies;
    const [coreStart] = await getStartServices();
    const source = await this.get(id);

    // Delete the saved object first: if that fails, the source still has a working key and can be
    // deleted again. A key left behind by a failed invalidation is harmless.
    await this.dependencies.soClient.delete(watchlistEntitySourceTypeName, id);
    if (source.apiKeyId) {
      await invalidateEntitySourceApiKey(coreStart.security, source.apiKeyId, logger);
    }
  }

  async find({
    kuery,
    sortField,
    sortOrder,
    page,
    perPage,
  }: {
    kuery: string;
    sortField?: string;
    sortOrder?: 'asc' | 'desc';
    page?: number;
    perPage?: number;
  }): Promise<ListWatchlistEntitySourcesResponse> {
    const soResult = await this.dependencies.soClient.find<MonitoringEntitySource>({
      type: watchlistEntitySourceTypeName,
      filter: kuery,
      sortField,
      sortOrder,
      page,
      perPage,
    });

    return {
      sources: soResult.saved_objects.map((so) => ({ ...so.attributes, id: so.id })),
      page: page ?? 1,
      per_page: perPage ?? 10,
      total: soResult.total,
    };
  }

  async list(
    query: ListWatchlistEntitySourcesRequestQuery,
    ids?: string[]
  ): Promise<ListWatchlistEntitySourcesResponse> {
    // find() turns an id filter into a text search, and that search cannot match these saved objects.
    // bulkGet fetches them directly.
    if (ids) {
      return this.listByIds(query, ids);
    }

    return this.find({
      kuery: this.getQueryFilters(query),
      sortField: query?.sort_field ?? undefined,
      sortOrder: query?.sort_order ?? undefined,
      page: query?.page ?? 1,
      perPage: query?.per_page ?? 10,
    });
  }

  private async listByIds(
    query: ListWatchlistEntitySourcesRequestQuery,
    ids: string[]
  ): Promise<ListWatchlistEntitySourcesResponse> {
    if (ids.length === 0) {
      return {
        sources: [],
        page: query.page ?? 1,
        per_page: query.per_page ?? 10,
        total: 0,
      };
    }

    const { saved_objects: savedObjects } =
      await this.dependencies.soClient.bulkGet<MonitoringEntitySource>(
        ids.map((id) => ({ type: watchlistEntitySourceTypeName, id }))
      );

    const matched = savedObjects
      .flatMap((savedObject) =>
        isSavedObjectErrorResult(savedObject)
          ? []
          : [{ ...savedObject.attributes, id: savedObject.id }]
      )
      .filter(
        (source) =>
          (query.type === undefined || source.type === query.type) &&
          (query.managed === undefined || Boolean(source.managed) === query.managed) &&
          (query.name === undefined || source.name === query.name)
      );

    const sorted = query.sort_field
      ? _.orderBy(matched, [query.sort_field], [query.sort_order ?? 'asc'])
      : matched;

    const page = query?.page ?? 1;
    const perPage = query?.per_page ?? 10;
    const start = (page - 1) * perPage;

    return {
      sources: sorted.slice(start, start + perPage),
      page,
      per_page: perPage,
      total: sorted.length,
    };
  }

  private getQueryFilters(query?: ListWatchlistEntitySourcesRequestQuery): string {
    const queryParts = _.pick(query ?? {}, ['type', 'managed', 'name']);
    const filters = Object.entries(queryParts).map(
      ([key, value]) => `${watchlistEntitySourceTypeName}.attributes.${key}: "${value}"`
    );

    return filters.join(' and ');
  }

  /**
   * Throws a 409 when another entity source already uses `attributes.name`. Pass the source's own
   * `id` when updating it, so it does not conflict with itself.
   */
  async assertNameUniqueness(attributes: Partial<MonitoringEntitySource>): Promise<void> {
    if (attributes.name) {
      // `name` is a `text` field, so the lookup also returns names that tokenize the same, such as
      // `test--store` for `test-store`, or names that only differ in case. Keep the exact matches.
      // Such near matches are few, so the first page of the lookup should be enough.
      const { sources } = await this.list({ name: attributes.name });

      const taken = sources.filter((so) => so.name === attributes.name && so.id !== attributes.id);

      if (taken.length > 0) {
        throw Boom.conflict(
          `A watchlist entity source with the name "${attributes.name}" already exists.`
        );
      }
    }
  }

  /**
   * Integrations Sync Marker Methods
   */
  async updateLastProcessedMarker(
    source: MonitoringEntitySource,
    lastProcessedMarker: string
  ): Promise<void> {
    if (!moment(lastProcessedMarker).isValid()) {
      throw new Error(`Invalid timestamp: ${lastProcessedMarker}`);
    }
    await this.update({
      ...source,
      integrations: {
        syncData: {
          lastUpdateProcessed: lastProcessedMarker,
        },
      },
    });
  }

  async getLastProcessedMarker(source: MonitoringEntitySource): Promise<string | undefined> {
    return source.integrations?.syncData?.lastUpdateProcessed;
  }

  async getLastFullSyncMarker(source: MonitoringEntitySource): Promise<string | undefined> {
    return source.integrations?.syncData?.lastFullSync;
  }

  async updateLastFullSyncMarker(
    source: MonitoringEntitySource,
    lastFullSyncMarker: string
  ): Promise<void> {
    if (!moment(lastFullSyncMarker).isValid()) {
      throw new Error(`Invalid timestamp: ${lastFullSyncMarker}`);
    }
    await this.update({
      ...source,
      integrations: {
        syncData: {
          lastFullSync: lastFullSyncMarker,
        },
      },
    });
  }
}
