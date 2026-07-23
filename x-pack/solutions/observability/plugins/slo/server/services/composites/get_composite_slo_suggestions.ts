/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { GetCompositeSLOSuggestionsResponse } from '@kbn/slo-schema';
import type { StoredCompositeSLODefinition } from '../../domain/models';
import { SO_SLO_COMPOSITE_TYPE } from '../../saved_objects';

interface AggsResponse {
  tagsAggs: {
    buckets: Array<{
      key: string;
      doc_count: number;
    }>;
  };
}

export async function getCompositeSloSuggestions(
  soClient: SavedObjectsClientContract
): Promise<GetCompositeSLOSuggestionsResponse> {
  const response = await soClient.find<StoredCompositeSLODefinition, AggsResponse>({
    type: SO_SLO_COMPOSITE_TYPE,
    perPage: 0,
    aggs: {
      tagsAggs: {
        terms: {
          field: `${SO_SLO_COMPOSITE_TYPE}.attributes.tags`,
          size: 1000,
        },
      },
    },
  });

  const { tagsAggs } = response.aggregations ?? {};

  return {
    tags:
      tagsAggs?.buckets?.map(({ key, doc_count: count }) => ({
        label: key,
        value: key,
        count,
      })) ?? [],
  };
}
