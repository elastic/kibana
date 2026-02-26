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
} from '@kbn/core/server';
import type { SetOptional } from 'type-fest';
import type { WatchlistObject } from '../../../../../common/api/entity_analytics/watchlists/management/common.gen';
import { getIndexForWatchlist } from '../entities/utils';
import { watchlistConfigTypeName } from './saved_object/watchlist_config_type';
import { createOrUpdateIndex } from '../../utils/create_or_update_index';

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

const toWatchlistObject = (so: SavedObject<WatchlistSavedObjectAttributes>): WatchlistObject => ({
  ...so.attributes,
  id: so.id,
  createdAt: so.created_at,
  updatedAt: so.updated_at,
});

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
}
