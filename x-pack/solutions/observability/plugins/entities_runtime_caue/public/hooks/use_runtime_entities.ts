/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { HttpStart } from '@kbn/core/public';
import type { DiscoverEntitiesResponse } from '../../common/entity_definition';
import type { MetadataFilter } from '../../common/metadata_filter';

export const useRuntimeEntities = (
  http: HttpStart,
  definitionId: string,
  start: string,
  end: string,
  filter?: Record<string, unknown>,
  metadataFilters?: MetadataFilter[]
) =>
  useQuery<DiscoverEntitiesResponse>({
    queryKey: [
      'entities_runtime_caue',
      'entities',
      definitionId,
      start,
      end,
      filter,
      metadataFilters,
    ],
    queryFn: () =>
      http.post<DiscoverEntitiesResponse>(
        `/internal/entities_runtime_caue/definitions/${encodeURIComponent(definitionId)}/_entities`,
        {
          body: JSON.stringify({
            start,
            end,
            ...(filter ? { filter } : {}),
            ...(metadataFilters && metadataFilters.length > 0 ? { metadataFilters } : {}),
          }),
        }
      ),
    enabled: Boolean(definitionId),
    refetchOnWindowFocus: false,
  });
