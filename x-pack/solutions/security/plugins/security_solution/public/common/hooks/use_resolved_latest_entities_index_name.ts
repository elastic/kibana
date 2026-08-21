/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lastValueFrom } from 'rxjs';
import { useQuery } from '@kbn/react-query';
import type { IKibanaSearchResponse } from '@kbn/search-types';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import {
  getEntitiesAlias,
  getLatestEntitiesIndexName,
  getLegacySecurityLatestEntitiesIndexName,
  ENTITY_LATEST,
} from '@kbn/entity-store/common';
import { useKibana } from '../lib/kibana';

export interface ResolvedLatestEntitiesIndexResult {
  /**
   * Concrete latest entities index name to query, or null when neither naming
   * scheme has a live index the caller may read (Entity Store not installed,
   * missing read privileges on both names, or the legacy name belongs to
   * another space).
   */
  indexName: string | null;
}

const RESOLVED_LATEST_ENTITIES_INDEX = ['GET', 'RESOLVED_LATEST_ENTITIES_INDEX'];

const UNAVAILABLE_STATUS_CODES = [403, 404];

/**
 * True when the error means the index is missing or the caller cannot read it
 * (both are "this name is not usable", not a transient failure).
 */
const isUnavailableError = (error: unknown): boolean => {
  const candidates = [error, (error as { err?: unknown })?.err] as Array<
    { statusCode?: number; status?: number; message?: string } | undefined
  >;
  return candidates.some(
    (candidate) =>
      candidate != null &&
      (UNAVAILABLE_STATUS_CODES.includes(candidate.statusCode ?? -1) ||
        UNAVAILABLE_STATUS_CODES.includes(candidate.status ?? -1) ||
        /security_exception|index_not_found_exception/.test(candidate.message ?? ''))
  );
};

/**
 * Resolves the concrete latest entities index name for the space: the
 * solution-neutral `.entities.v2.latest.{space}-00001` name when it exists,
 * otherwise the pre-migration `.entities.v2.latest.security_{space}-00001` name.
 *
 * Needed by consumers that must target a concrete index (ES|QL LOOKUP JOIN) or
 * gate UI on index existence. While the `entityStore.migrateLegacySecurityAssets`
 * feature flag is off, upgraded deployments keep the legacy Security-scoped index,
 * so probing only the neutral name reports the store as absent. Plain searches
 * should use the `entities-latest-{space}` alias instead of this hook.
 *
 * Collision guard: legacy names for space `{ns}` equal neutral names for a space
 * literally named `security_{ns}`. When that space owns Entity Store assets
 * (detected via its `entities-latest-security_{ns}` alias, mirroring the
 * server-side `hasCollidingNeutralNamespaceAssets`), the legacy fallback is
 * skipped so this space never reads another space's entities.
 */
export const useResolvedLatestEntitiesIndexName = (spaceId: string | undefined) => {
  const { data } = useKibana().services;

  return useQuery<ResolvedLatestEntitiesIndexResult, IHttpFetchError>({
    queryKey: [...RESOLVED_LATEST_ENTITIES_INDEX, spaceId],
    queryFn: async () => {
      const indexHasShards = async (index: string): Promise<boolean> => {
        try {
          const response = await lastValueFrom(
            data.search.search<
              { params: Record<string, unknown> },
              IKibanaSearchResponse<{ _shards: { total: number } }>
            >({
              params: {
                index,
                size: 0,
                allow_no_indices: true,
                terminate_after: 1,
              },
            })
          );
          return (response.rawResponse._shards?.total ?? 0) > 0;
        } catch (error) {
          if (isUnavailableError(error)) {
            return false;
          }
          // Transient failures (network, 5xx) must not be cached as "index
          // missing" — rethrow so react-query retries and reports an error.
          throw error;
        }
      };

      const namespace = spaceId ?? 'default';
      const neutralIndexName = getLatestEntitiesIndexName(namespace);
      if (await indexHasShards(neutralIndexName)) {
        return { indexName: neutralIndexName };
      }

      const collidingSpaceAlias = getEntitiesAlias(ENTITY_LATEST, `security_${namespace}`);
      if (await indexHasShards(collidingSpaceAlias)) {
        return { indexName: null };
      }

      const legacyIndexName = getLegacySecurityLatestEntitiesIndexName(namespace);
      if (await indexHasShards(legacyIndexName)) {
        return { indexName: legacyIndexName };
      }
      return { indexName: null };
    },
    enabled: spaceId != null,
    retry: 1,
  });
};
