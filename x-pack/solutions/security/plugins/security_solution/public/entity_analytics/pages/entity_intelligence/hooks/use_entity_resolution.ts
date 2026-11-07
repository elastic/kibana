/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { lastValueFrom } from 'rxjs';
import { useQuery } from '@kbn/react-query';
import type { IKibanaSearchResponse } from '@kbn/search-types';
import { useKibana } from '../../../../common/lib/kibana';
import type { ResolutionLookupRow } from '../entities/enrichment';

const LOOKUP_INDEX_PREFIX = '.entity_analytics.risk_score.lookup-';
const MAX_ROWS = 5000;

interface LookupHit {
  _source?: {
    entity_id?: string;
    resolution_target_id?: string | null;
    propagation_target_id?: string | null;
    relationship_type?: string | null;
  };
}

interface LookupResponse {
  hits: { hits: LookupHit[] };
}

/**
 * Reads the risk-score resolution lookup index
 * (`.entity_analytics.risk_score.lookup-<space>`) which maps each entity to its
 * resolution/propagation target. These rows back the resolution-group column
 * (which identities resolve to the same real-world entity). The richer
 * `entity.relationships.resolution` fields exist in the entity-store mapping
 * but are unpopulated in this deployment, so this lookup + the entity `source`
 * list are the honest resolution signals available.
 */
export const useEntityResolution = (spaceId: string | undefined, enabled = true) => {
  const { data } = useKibana().services;
  const index = spaceId ? `${LOOKUP_INDEX_PREFIX}${spaceId}` : undefined;

  const {
    data: rows,
    isLoading,
    isError,
  } = useQuery(
    ['entityIntelligenceEntitiesResolution', index],
    async ({ signal }) => {
      if (!index) return [] as ResolutionLookupRow[];
      try {
        const response = await lastValueFrom(
          data.search.search<
            { params: Record<string, unknown> },
            IKibanaSearchResponse<LookupResponse>
          >(
            {
              params: {
                index,
                allow_no_indices: true,
                size: MAX_ROWS,
                _source: [
                  'entity_id',
                  'resolution_target_id',
                  'propagation_target_id',
                  'relationship_type',
                ],
                query: { match_all: {} },
              },
            },
            { abortSignal: signal }
          )
        );
        return (response.rawResponse.hits?.hits ?? [])
          .map((hit): ResolutionLookupRow | undefined => {
            const source = hit._source;
            if (!source?.entity_id) return undefined;
            return {
              entityId: source.entity_id,
              resolutionTargetId: source.resolution_target_id ?? null,
              propagationTargetId: source.propagation_target_id ?? null,
              relationshipType: source.relationship_type ?? null,
            };
          })
          .filter((row): row is ResolutionLookupRow => row !== undefined);
      } catch (err) {
        return [] as ResolutionLookupRow[];
      }
    },
    {
      enabled: enabled && !!index,
      retry: false,
      keepPreviousData: true,
      refetchOnWindowFocus: false,
    }
  );

  /** entityId → the resolution lookup rows that resolve/propagate to it. */
  const lookupRowsByTarget = useMemo(() => {
    const map = new Map<string, ResolutionLookupRow[]>();
    for (const row of rows ?? []) {
      for (const target of [row.resolutionTargetId, row.propagationTargetId]) {
        if (target) {
          map.set(target, [...(map.get(target) ?? []), row]);
        }
      }
    }
    return map;
  }, [rows]);

  return { lookupRowsByTarget, isLoading, isError };
};
