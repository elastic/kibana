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
  getLatestEntitiesIndexName,
  getLegacySecurityLatestEntitiesIndexName,
} from '@kbn/entity-store/common';
import { useKibana } from '../lib/kibana';

export interface ResolvedLatestEntitiesIndexResult {
  /**
   * Concrete latest entities index name to query, or null when neither naming
   * scheme has a live index (Entity Store not installed, or the caller lacks
   * read privileges on both names).
   */
  indexName: string | null;
}

const RESOLVED_LATEST_ENTITIES_INDEX = ['GET', 'RESOLVED_LATEST_ENTITIES_INDEX'];

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
 */
export const useResolvedLatestEntitiesIndexName = (spaceId: string | undefined) => {
  const { data } = useKibana().services;

  return useQuery<ResolvedLatestEntitiesIndexResult, IHttpFetchError>({
    queryKey: [...RESOLVED_LATEST_ENTITIES_INDEX, spaceId],
    queryFn: async () => {
      const indexExists = async (index: string): Promise<boolean> => {
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
        } catch {
          // 403s are indistinguishable from a missing index here; both mean the
          // caller cannot use this name.
          return false;
        }
      };

      const namespace = spaceId ?? 'default';
      const neutralIndexName = getLatestEntitiesIndexName(namespace);
      if (await indexExists(neutralIndexName)) {
        return { indexName: neutralIndexName };
      }
      const legacyIndexName = getLegacySecurityLatestEntitiesIndexName(namespace);
      if (await indexExists(legacyIndexName)) {
        return { indexName: legacyIndexName };
      }
      return { indexName: null };
    },
    enabled: spaceId != null,
    retry: false,
  });
};
