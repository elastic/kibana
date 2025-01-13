/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { SavedObjectsClientContract } from '@kbn/core/server';
import { GetSLOSuggestionsResponse } from '@kbn/slo-schema';
import { SO_SLO_TYPE } from '../saved_objects';
type Buckets = Array<{
  key: string;
  doc_count: number;
}>;

interface AggsResponse {
  tagsAggs: {
    buckets: Buckets;
  };
}
export class GetSLOSuggestions {
  constructor(private soClient: SavedObjectsClientContract) {}

  public async execute(): Promise<GetSLOSuggestionsResponse> {
    const findResponse = await this.soClient.find({
      type: SO_SLO_TYPE,
      perPage: 0,
      aggs: {
        tagsAggs: {
          terms: {
            field: `${SO_SLO_TYPE}.attributes.tags`,
            size: 10000,
          },
        },
      },
    });
    const { tagsAggs } = (findResponse?.aggregations as AggsResponse) ?? {};

    return {
      tags:
        tagsAggs?.buckets?.map(({ key, doc_count: count }) => ({
          label: key,
          value: key,
          count,
        })) ?? [],
    };
  }
}
