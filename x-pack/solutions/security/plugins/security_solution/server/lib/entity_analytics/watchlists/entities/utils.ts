/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Entity as EntityStoreEntity } from '../../../../../common/api/entity_analytics/entity_store/entities/common.gen';
import { EntityType } from '../../../../../common/entity_analytics/types';

export const ENTITY_ANALYTICS_WATCHLISTS_PREFIX = '.entity_analytics.watchlists';

export const getIndexForWatchlist = (namespace: string) =>
  `${ENTITY_ANALYTICS_WATCHLISTS_PREFIX}.${namespace}`;

/** Builds a composite document _id for the watchlist entity index. */
export const buildWatchlistDocId = (watchlistId: string, euid: string) => `${watchlistId}:${euid}`;

/** Extracts the euid from a composite watchlist doc _id ({watchlistId}:{euid}). */
export const extractEuidFromDocId = (docId: string) => docId.substring(docId.indexOf(':') + 1);

export const getEntityType = (record: EntityStoreEntity): EntityType => {
  const entityType = record.entity.EngineMetadata?.Type || record.entity.type;

  if (!entityType || !Object.values(EntityType).includes(entityType as EntityType)) {
    throw new Error(`Unexpected entity store record: ${JSON.stringify(record)}`);
  }

  return EntityType[entityType as keyof typeof EntityType];
};
