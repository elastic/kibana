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
import { getLatestEntitiesIndexName } from '@kbn/entity-store/common';
import { useKibana } from '../../../common/lib/kibana/kibana_react';
import { useSpaceId } from '../../../common/hooks/use_space_id';

interface EntitiesIndexExistsResult {
  indexExists: boolean;
}

const ENTITY_STORE_V2_AVAILABLE = ['GET', 'ENTITY_STORE_V2_AVAILABLE'];

/**
 * Hook to check if the Entity Store v2 entities index exists.
 *
 * TEMPORARY WORKAROUND: This hook exists because the "editor" and "viewer"
 * Serverless roles lack saved-object permissions for the Entity Store plugin's
 * SO types (entity-engine-descriptor-v2, entity-store-global-state), causing the
 * Entity Store `/status` endpoint to fail with a 403 for those roles.
 * Once those roles are compatible with the Entity Store `/status` endpoint,
 * this hook should be updated to check the status endpoint instead.
 *
 * Uses the data search service to run a lightweight ES search (size: 0)
 * against the entities latest index. Both editor and viewer roles have
 * read access to `.entities.v2.latest.security_*` indices.
 */
export const useIsEntityStoreV2Available = () => {
  const { data } = useKibana().services;
  const spaceId = useSpaceId();

  return useQuery<EntitiesIndexExistsResult, IHttpFetchError>({
    queryKey: [...ENTITY_STORE_V2_AVAILABLE, spaceId],
    queryFn: async () => {
      const index = getLatestEntitiesIndexName(spaceId ?? 'default');

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

        return { indexExists: (response.rawResponse._shards?.total ?? 0) > 0 };
      } catch {
        return { indexExists: false };
      }
    },
    enabled: spaceId != null,
    retry: false,
  });
};
