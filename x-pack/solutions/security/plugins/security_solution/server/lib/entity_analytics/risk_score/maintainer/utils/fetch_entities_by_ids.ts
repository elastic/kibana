/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityUpdateClient } from '@kbn/entity-store/server';
import type { RiskScoreModifierEntity } from '../steps/pipeline_types';
import type { ScopedLogger } from './with_log_context';

interface FetchEntitiesByIdsParams {
  crudClient: EntityUpdateClient;
  entityIds: string[];
  logger: ScopedLogger;
  errorContext: string;
}

interface NormalizedModifierEntitySource {
  entity?: {
    id?: string;
    attributes?: { watchlists?: unknown };
    relationships?: { resolution?: { resolved_to?: unknown } };
  };
  asset?: RiskScoreModifierEntity['asset'] | null;
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

const normalizeModifierEntity = (
  entity: NormalizedModifierEntitySource | undefined
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
}: FetchEntitiesByIdsParams): Promise<Map<string, RiskScoreModifierEntity>> => {
  const entityMap = new Map<string, RiskScoreModifierEntity>();

  if (entityIds.length === 0) {
    return entityMap;
  }

  try {
    let searchAfter: Array<string | number> | undefined;
    do {
      const { entities: batch, nextSearchAfter } = await crudClient.listEntities({
        filter: { terms: { 'entity.id': entityIds } },
        size: entityIds.length,
        searchAfter,
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
      searchAfter = nextSearchAfter;
    } while (searchAfter !== undefined);
  } catch (error) {
    logger.warn(`${errorContext}: ${error}`);
  }

  return entityMap;
};
