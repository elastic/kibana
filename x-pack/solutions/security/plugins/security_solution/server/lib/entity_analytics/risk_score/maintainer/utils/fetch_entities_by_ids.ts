/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityUpdateClient } from '@kbn/entity-store/server';
import type { EntityStoreModifierSource, RiskScoreModifierEntity } from '../steps/pipeline_types';
import type { ScopedLogger } from './with_log_context';
import { MAX_ENTITY_SEARCH_PAGE_SIZE } from '../../constants';

interface FetchEntitiesByIdsParams {
  crudClient: EntityUpdateClient;
  entityIds: string[];
  logger: ScopedLogger;
  errorContext: string;
  /** Throw on lookup failure so an empty fallback cannot route the page through entity creation without criticality or watchlist modifiers. */
  strict?: boolean;
  onError?: () => void;
}

const normalizeWatchlists = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter((watchlistId): watchlistId is string => typeof watchlistId === 'string');
  }
  if (typeof value === 'string') {
    return [value];
  }
  return [];
};

export const normalizeModifierEntity = (
  entity: EntityStoreModifierSource | undefined
): RiskScoreModifierEntity | undefined => {
  if (!entity) {
    return undefined;
  }
  const id = entity.entity?.id;
  if (!id) {
    return undefined;
  }

  const watchlists = normalizeWatchlists(entity.entity?.attributes?.watchlists);
  const resolvedTo = entity.entity?.relationships?.resolution?.resolved_to;

  return {
    entity: {
      id,
      attributes: {
        watchlists,
      },
      relationships: {
        resolution: {
          resolved_to: typeof resolvedTo === 'string' ? resolvedTo : undefined,
        },
      },
    },
    asset: {
      criticality: entity.asset?.criticality,
    },
  };
};

export const fetchEntitiesByIds = async ({
  crudClient,
  entityIds,
  logger,
  errorContext,
  strict = false,
  onError,
}: FetchEntitiesByIdsParams): Promise<Map<string, RiskScoreModifierEntity>> => {
  const entityMap = new Map<string, RiskScoreModifierEntity>();

  if (entityIds.length === 0) {
    return entityMap;
  }

  try {
    // One request per chunk keeps `size` within `index.max_result_window`. `entity.id` is unique in
    // the index, so a chunk's matches always fit in one response and no cursor is needed.
    const uniqueIds = [...new Set(entityIds)];
    for (let start = 0; start < uniqueIds.length; start += MAX_ENTITY_SEARCH_PAGE_SIZE) {
      const chunk = uniqueIds.slice(start, start + MAX_ENTITY_SEARCH_PAGE_SIZE);
      const { entities: batch } = await crudClient.listEntities({
        filter: { terms: { 'entity.id': chunk } },
        size: chunk.length,
        source: [
          'entity.id',
          'entity.attributes.watchlists',
          'entity.relationships.resolution.resolved_to',
          'asset.criticality',
        ],
      });
      for (const entity of batch) {
        const normalizedEntity = normalizeModifierEntity(entity);
        if (normalizedEntity?.entity?.id) {
          entityMap.set(normalizedEntity.entity.id, normalizedEntity);
        }
      }
    }
  } catch (error) {
    // All-or-nothing: a partial map would apply modifiers to some entities only.
    entityMap.clear();
    onError?.();
    if (strict) {
      throw error;
    }
    logger.warn(`${errorContext}: ${error}`);
  }

  return entityMap;
};
