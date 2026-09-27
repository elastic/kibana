/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pMap from 'p-map';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { AmbiguousEntityResult, ResolveSingleEntityResult } from '../entity_resolution';
import { resolveSingleEntity } from '../entity_resolution';

const ENTITY_RESOLUTION_CONCURRENCY = 10;

export interface ResolvedEntityResult {
  euid: string;
  resolvedTo?: string;
}
export type UnresolvedEntityResult = {
  entityId: string;
  status: ResolveSingleEntityResult['status'];
} & Partial<AmbiguousEntityResult>;

/**
 * Resolves a batch of user-supplied entity references (EUIDs, bare names, or display
 * names) to canonical `entity.id` values.
 *
 * References that resolve with high confidence are returned in `resolved`, each with the
 * group target it is currently an alias of; everything else (not found, ambiguous, or
 * resolved-with-no-identity) is reported in `unresolved`.
 */
export const resolveEntityIdsForResolution = async ({
  esClient,
  spaceId,
  entityIds,
}: {
  esClient: ElasticsearchClient;
  spaceId: string;
  entityIds: string[];
}) => {
  const resolved: ResolvedEntityResult[] = [];
  const unresolved: UnresolvedEntityResult[] = [];

  await pMap(
    entityIds,
    async (entityId) => {
      const resolveResults = await resolveSingleEntity({ esClient, spaceId, entityId });
      if (resolveResults.status === 'resolved' && resolveResults.identity.entityStoreId) {
        const { entityStoreId, resolvedTo } = resolveResults.identity;
        resolved.push({ euid: entityStoreId, resolvedTo });
      } else {
        unresolved.push({
          entityId,
          status: resolveResults.status,
          ...(resolveResults.status === 'ambiguous'
            ? {
                matchCount: resolveResults.matchCount,
                candidateEntityIds: resolveResults.candidateEntityIds,
              }
            : {}),
        });
      }
    },
    { concurrency: ENTITY_RESOLUTION_CONCURRENCY }
  );

  return { resolved, unresolved };
};
