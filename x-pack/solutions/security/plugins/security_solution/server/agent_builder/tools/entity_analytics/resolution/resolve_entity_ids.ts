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

export type UnresolvedEntityResult = {
  entityId: string;
  status: ResolveSingleEntityResult['status'];
} & Partial<AmbiguousEntityResult>;

/**
 * Resolves a batch of user-supplied entity references (EUIDs, bare names, or display
 * names) to canonical `entity.id` values.
 *
 * References that resolve with high confidence are returned in `euids`; everything else
 * (not found, ambiguous, or already resolved-with-no-identity) is reported in `unresolved`.
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
  const euids: string[] = [];
  const unresolved: UnresolvedEntityResult[] = [];

  await pMap(
    entityIds,
    async (entityId) => {
      const resolved = await resolveSingleEntity({ esClient, spaceId, entityId });
      if (resolved.status === 'resolved' && resolved.identity.entityStoreId) {
        euids.push(resolved.identity.entityStoreId);
      } else {
        unresolved.push({
          entityId,
          status: resolved.status,
          ...(resolved.status === 'ambiguous'
            ? { matchCount: resolved.matchCount, candidateEntityIds: resolved.candidateEntityIds }
            : {}),
        });
      }
    },
    { concurrency: ENTITY_RESOLUTION_CONCURRENCY }
  );

  return { euids, unresolved };
};
