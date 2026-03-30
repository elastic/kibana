/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { EntityContainer } from '../../../../../../common/api/entity_analytics/entity_store/entities/upsert_entities_bulk.gen';
import type { EntityStoreCrudClient } from '../../../entity_store/entity_store_crud_client';

/**
 * Updates the entity store to add the watchlist name to each entity's
 * `entity.attributes.watchlists` array using the CRUD client.
 */
export const addWatchlistAttributeToStore = async ({
  crudClient,
  logger,
  entities,
  watchlistName,
}: {
  crudClient: EntityStoreCrudClient;
  logger: Logger;
  entities: EntityContainer[];
  watchlistName: string;
}): Promise<void> => {
  if (entities.length === 0) return;

  // Update each entity's watchlists in memory
  const updatedEntities = entities.map((entityContainer) => {
    const { type, record } = entityContainer;
    const watchlists = record.entity.attributes?.watchlists ?? [];
    if (!watchlists.includes(watchlistName)) {
      const newWatchlists = [...watchlists, watchlistName];
      return {
        type,
        record: {
          ...record,
          entity: {
            ...record.entity,
            attributes: {
              ...record.entity.attributes,
              watchlists: newWatchlists,
            },
          },
        },
      };
    }
    return entityContainer;
  });

  try {
    await crudClient.upsertEntitiesBulk(updatedEntities);
  } catch (err) {
    logger.error(`[WatchlistSync] Entity store add-watchlist-attribute error: ${err}`);
  }
};

/**
 * Updates the entity store to remove the watchlist name from each entity's
 * `entity.attributes.watchlists` array using the CRUD client.
 */
export const removeWatchlistAttributeFromStore = async ({
  crudClient,
  logger,
  entities,
  watchlistName,
}: {
  crudClient: EntityStoreCrudClient;
  logger: Logger;
  entities: EntityContainer[];
  watchlistName: string;
}): Promise<void> => {
  if (entities.length === 0) return;

  // Remove the watchlist from each entity's watchlists in memory
  const updatedEntities = entities.map((entityContainer) => {
    const { type, record } = entityContainer;
    const watchlists = record.entity.attributes?.watchlists ?? [];
    if (watchlists.includes(watchlistName)) {
      const newWatchlists = watchlists.filter((w: string) => w !== watchlistName);
      return {
        type,
        record: {
          ...record,
          entity: {
            ...record.entity,
            attributes: {
              ...record.entity.attributes,
              watchlists: newWatchlists,
            },
          },
        },
      };
    }
    return entityContainer;
  });

  try {
    await crudClient.upsertEntitiesBulk(updatedEntities);
  } catch (err) {
    logger.error(`[WatchlistSync] Entity store remove-watchlist-attribute error: ${err}`);
  }
};
