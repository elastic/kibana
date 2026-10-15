/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pMap from 'p-map';
import type { ElasticsearchClient } from '@kbn/core/server';
import {
  resolveSingleEntity,
  type AmbiguousEntityResult,
  type ResolveSingleEntityResult,
} from '../entity_resolution';

const ENTITY_RESOLUTION_CONCURRENCY = 10;

export interface ResolvedEntityResult {
  euid: string;
  resolvedTo?: string;
}

/** `resolveSingleEntity` statuses that do not yield a canonical entity id. */
type UnresolvedEntityStatus = Exclude<ResolveSingleEntityResult['status'], 'resolved'>;

export type UnresolvedEntityResult =
  | { entityId: string; status: Exclude<UnresolvedEntityStatus, 'ambiguous'> }
  | ({
      entityId: string;
      status: Extract<UnresolvedEntityStatus, 'ambiguous'>;
    } & AmbiguousEntityResult);

/**
 * Resolves a batch of user-supplied entity references (EUIDs, bare names, or display
 * names) to canonical `entity.id` values.
 *
 * High-confidence matches that have an `entity.id` are returned in `resolved`, each with
 * the group target it is currently an alias of when one exists. Everything else is
 * reported in `unresolved`: `not_found`, `ambiguous` (with candidates), or `no_identity`
 * when a match has no canonical id.
 */
export const resolveEntityIds = async ({
  esClient,
  spaceId,
  entityIds,
}: {
  esClient: ElasticsearchClient;
  spaceId: string;
  entityIds: readonly string[];
}): Promise<{ resolved: ResolvedEntityResult[]; unresolved: UnresolvedEntityResult[] }> => {
  const outcomes = await pMap(
    entityIds,
    async (entityId) => {
      const result = await resolveSingleEntity({ esClient, spaceId, entityId });
      if (result.status === 'resolved' && result.identity.entityStoreId) {
        return {
          kind: 'resolved' as const,
          value: { euid: result.identity.entityStoreId, resolvedTo: result.identity.resolvedTo },
        };
      }
      if (result.status === 'ambiguous') {
        return {
          kind: 'unresolved' as const,
          value: {
            entityId,
            status: result.status,
            matchCount: result.matchCount,
            candidateEntityIds: result.candidateEntityIds,
          },
        };
      }
      return {
        kind: 'unresolved' as const,
        value: {
          entityId,
          status: result.status === 'resolved' ? 'no_identity' : result.status,
        },
      };
    },
    { concurrency: ENTITY_RESOLUTION_CONCURRENCY }
  );

  return {
    resolved: outcomes.flatMap((outcome) => (outcome.kind === 'resolved' ? [outcome.value] : [])),
    unresolved: outcomes.flatMap((outcome) =>
      outcome.kind === 'unresolved' ? [outcome.value] : []
    ),
  };
};
