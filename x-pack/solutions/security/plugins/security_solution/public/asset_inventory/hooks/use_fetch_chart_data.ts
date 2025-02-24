/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { lastValueFrom } from 'rxjs';
import type * as estypes from '@elastic/elasticsearch/lib/api/types';
import { showErrorToast } from '@kbn/cloud-security-posture';
import type { IKibanaSearchResponse, IKibanaSearchRequest } from '@kbn/search-types';
import type { FindingsBaseEsQuery } from '@kbn/cloud-security-posture';
import { useKibana } from '../../common/lib/kibana';
import { ASSET_INVENTORY_INDEX_PATTERN } from '../constants';
import { getRuntimeMappingsFromSort, getMultiFieldsSort } from './fetch_utils';

interface UseTopAssetsOptions extends FindingsBaseEsQuery {
  sort: string[][];
  enabled: boolean;
}

const ASSET_INVENTORY_TABLE_RUNTIME_MAPPING_FIELDS: string[] = [
  'entity.id',
  'entity.category',
  'entity.type',
];

const getTopAssetsQuery = ({ query, sort }: UseTopAssetsOptions) => ({
  size: 0,
  index: ASSET_INVENTORY_INDEX_PATTERN,
  aggs: {
    '0': {
      terms: {
        field: 'entity.category',
        order: {
          '2': 'desc',
        },
        size: 10,
      },
      aggs: {
        '1': {
          terms: {
            field: 'entity.type',
            order: {
              '2': 'desc',
            },
            size: 10,
          },
          aggs: {
            '2': {
              value_count: {
                field: 'entity.id',
              },
            },
          },
        },
        '2': {
          value_count: {
            field: 'entity.id',
          },
        },
      },
    },
  },
  query: {
    ...query,
    bool: {
      ...query?.bool,
      filter: [...(query?.bool?.filter ?? [])],
      should: [...(query?.bool?.should ?? [])],
      must: [...(query?.bool?.must ?? [])],
      must_not: [...(query?.bool?.must_not ?? [])],
    },
  },
  sort: getMultiFieldsSort(sort),
  runtime_mappings: getRuntimeMappingsFromSort(ASSET_INVENTORY_TABLE_RUNTIME_MAPPING_FIELDS, sort),
  ignore_unavailable: true,
});

export interface AggregationResult {
  category: string;
  source: string;
  count: number;
}

interface AssetAggs {
  '0': { buckets: Array<{ key: string; doc_count: number }> };
}

// Example output:
//
// [
//   { category: 'cloud-compute', source: 'gcp-compute', count: 500, },
//   { category: 'cloud-compute', source: 'aws-security', count: 300, },
//   { category: 'cloud-storage', source: 'gcp-compute', count: 221, },
//   { category: 'cloud-storage', source: 'aws-security', count: 117, },
// ];
function transformAggregation(
  buckets: Array<estypes.AggregationsStringRareTermsBucket | undefined>
) {
  const result: AggregationResult[] = [];
  if (!buckets) return result;

  for (const categoryBucket of buckets) {
    if (!categoryBucket) break;

    const category = categoryBucket.key;
    const innerCategory = categoryBucket[
      '1'
    ] as estypes.AggregationsTermsAggregateBase<estypes.AggregationsStringRareTermsBucket>;
    const sources = innerCategory.buckets as estypes.AggregationsStringRareTermsBucketKeys[];

    for (const sourceBucket of sources) {
      result.push({
        category,
        source: sourceBucket.key,
        count: sourceBucket.doc_count,
      });
    }
  }

  return result;
}

type TopAssetsRequest = IKibanaSearchRequest<estypes.SearchRequest>;
type TopAssetsResponse = IKibanaSearchResponse<
  estypes.SearchResponse<AggregationResult, AssetAggs>
>;

export function useFetchChartData(options: UseTopAssetsOptions) {
  const {
    data,
    notifications: { toasts },
  } = useKibana().services;
  return useQuery(
    ['asset_inventory_top_assets_chart', { params: options }],
    async () => {
      const {
        rawResponse: { aggregations },
      } = await lastValueFrom(
        data.search.search<TopAssetsRequest, TopAssetsResponse>({
          params: getTopAssetsQuery(options) as TopAssetsRequest['params'],
        })
      );

      if (!aggregations) {
        throw new Error('expected aggregations to be defined');
      }

      return transformAggregation(aggregations['0'].buckets);
    },
    {
      enabled: options.enabled,
      keepPreviousData: true,
      onError: (err: Error) => showErrorToast(toasts, err),
    }
  );
}
