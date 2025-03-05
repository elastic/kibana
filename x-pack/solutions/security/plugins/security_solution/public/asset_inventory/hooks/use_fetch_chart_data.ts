/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { lastValueFrom } from 'rxjs';
import { i18n } from '@kbn/i18n';
import type * as estypes from '@elastic/elasticsearch/lib/api/types';
import { showErrorToast } from '@kbn/cloud-security-posture';
import type { IKibanaSearchResponse, IKibanaSearchRequest } from '@kbn/search-types';
import type { BaseEsQuery } from '@kbn/cloud-security-posture';
import { useKibana } from '../../common/lib/kibana';
import { ASSET_INVENTORY_INDEX_PATTERN, QUERY_KEY_CHART_DATA } from '../constants';
import { getMultiFieldsSort } from './fetch_utils';

interface UseTopAssetsOptions extends BaseEsQuery {
  sort: string[][];
  enabled: boolean;
}

const getTopAssetsQuery = ({ query, sort }: UseTopAssetsOptions) => ({
  size: 0,
  index: ASSET_INVENTORY_INDEX_PATTERN,
  aggs: {
    entityCategory: {
      terms: {
        field: 'entity.category',
        order: {
          entityId: 'desc',
        },
        size: 10,
      },
      aggs: {
        entityType: {
          terms: {
            field: 'entity.type',
            order: {
              entityId: 'desc',
            },
            size: 10,
          },
          aggs: {
            entityId: {
              value_count: {
                field: 'entity.id',
              },
            },
          },
        },
        entityId: {
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
  ignore_unavailable: true,
});

export interface AggregationResult {
  category: string;
  source: string;
  count: number;
}

interface TypeBucket {
  key: string;
  doc_count: number;
  entityId: {
    value: number;
  };
}

interface CategoryBucket {
  key: string;
  doc_count: number;
  entityId: {
    value: number;
  };
  entityType: {
    buckets: TypeBucket[];
    doc_count_error_upper_bound: number;
    sum_other_doc_count: number;
  };
  doc_count_error_upper_bound: number;
  sum_other_doc_count: number;
}

interface AssetAggs {
  entityCategory: {
    buckets: CategoryBucket[];
  };
}

const tooltipOtherLabel = i18n.translate(
  'xpack.securitySolution.assetInventory.chart.tooltip.otherLabel',
  {
    defaultMessage: 'Other',
  }
);

// Example output:
//
// [
//   { category: 'cloud-compute', source: 'gcp-compute', count: 500, },
//   { category: 'cloud-compute', source: 'aws-security', count: 300, },
//   { category: 'cloud-storage', source: 'gcp-compute', count: 221, },
//   { category: 'cloud-storage', source: 'aws-security', count: 117, },
// ];
function transformAggregation(agg: AssetAggs) {
  const result: AggregationResult[] = [];

  for (const categoryBucket of agg.entityCategory.buckets) {
    const typeBucket = categoryBucket.entityType;

    for (const sourceBucket of typeBucket.buckets) {
      result.push({
        category: categoryBucket.key,
        source: sourceBucket.key,
        count: sourceBucket.doc_count,
      });
    }

    if (typeBucket.sum_other_doc_count > 0) {
      result.push({
        category: categoryBucket.key,
        source: `${categoryBucket.key} - ${tooltipOtherLabel}`,
        count: typeBucket.sum_other_doc_count,
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
    [QUERY_KEY_CHART_DATA, { params: options }],
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

      return transformAggregation(aggregations);
    },
    {
      enabled: options.enabled,
      keepPreviousData: true,
      onError: (err: Error) => showErrorToast(toasts, err),
    }
  );
}
