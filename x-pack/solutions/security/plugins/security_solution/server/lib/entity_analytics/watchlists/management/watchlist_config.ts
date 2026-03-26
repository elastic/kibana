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
} from '@kbn/core/server';
import type { SetOptional } from 'type-fest';
import type { WatchlistObject } from '../../../../../common/api/entity_analytics/watchlists/management/common.gen';
import type { MonitoringEntitySource } from '../../../../../common/api/entity_analytics/watchlists/data_source/common.gen';
import { getIndexForWatchlist } from '../entities/utils';
import { generateWatchlistEntityIndexMappings } from '../entities/mappings';
import { watchlistConfigTypeName } from './saved_object/watchlist_config_type';
import { createOrUpdateIndex } from '../../utils/create_or_update_index';
import { monitoringEntitySourceTypeName } from '../../privilege_monitoring/saved_objects/monitoring_entity_source_type';

export const MAX_PER_PAGE = 10_000;

interface WatchlistConfigClientDeps {
  soClient: SavedObjectsClientContract;
  esClient: ElasticsearchClient;
  namespace: string;
  logger: Logger;
}

type WatchlistSavedObjectAttributes = Omit<WatchlistObject, 'id' | 'createdAt' | 'updatedAt'>;
type WatchlistUpdateAttrs = Partial<WatchlistSavedObjectAttributes>;

const omitWatchlistMeta = (
  watchlist: Partial<WatchlistObject>
): Partial<WatchlistSavedObjectAttributes> => {
  const {
    id: _ignoredId,
    createdAt: _ignoredCreatedAt,
    updatedAt: _ignoredUpdatedAt,
    ...attrs
  } = watchlist;
  return attrs;
};

const ENTITY_SOURCE_REF_NAME_PREFIX = 'entity-source_';

const isEntitySourceRef = (ref: SavedObjectReference): boolean =>
  ref.type === monitoringEntitySourceTypeName && ref.name.startsWith(ENTITY_SOURCE_REF_NAME_PREFIX);

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
    attrs: SetOptional<WatchlistSavedObjectAttributes, 'managed'>
  ): Promise<WatchlistObject> {
    const so = await this.deps.soClient.create<WatchlistSavedObjectAttributes>(
      watchlistConfigTypeName,
      { ...attrs, managed: attrs.managed ?? false },
      { refresh: 'wait_for' }
    );

    await createOrUpdateIndex({
      esClient: this.deps.esClient,
      logger: this.deps.logger,
      options: {
        index: getIndexForWatchlist(attrs.name, this.deps.namespace),
        mappings: generateWatchlistEntityIndexMappings(),
      },
    });

    return toWatchlistObject(so);
  }

  async update(id: string, attrs: WatchlistUpdateAttrs): Promise<WatchlistObject> {
    const existing = await this.get(id);
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

  async list(): Promise<WatchlistObject[]> {
    return this.deps.soClient
      .find<WatchlistObject>({
        type: watchlistConfigTypeName,
        namespaces: [this.deps.namespace],
        perPage: MAX_PER_PAGE,
      })

      .then((response) => {
        return response.saved_objects.map((so) => toWatchlistObject(so));
      });
  }

  async get(id: string) {
    try {
      const so = await this.deps.soClient.get<WatchlistSavedObjectAttributes>(
        watchlistConfigTypeName,
        id
      );
      return toWatchlistObject(so);
    } catch (e) {
      if (e.output && e.output.statusCode === 404) {
        throw new Error(`Watchlist config '${id}' not found`);
      }
      throw e;
    }
  }

  async delete(id: string) {
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
      type: monitoringEntitySourceTypeName,
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

    if (so.attributes.managed === true) {
      throw createWatchlistValidationError(400, `Cannot modify managed watchlist '${watchlistId}'`);
    }

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
}
