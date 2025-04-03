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
import { ASSET_FIELDS, ASSET_INVENTORY_INDEX_PATTERN, QUERY_KEY_CHART_DATA } from '../constants';
import { getMultiFieldsSort } from './fetch_utils';

interface UseTopAssetsOptions extends BaseEsQuery {
  sort: string[][];
  enabled: boolean;
}

const getTopAssetsQuery = ({ query, sort }: UseTopAssetsOptions) => ({
  size: 0,
  index: ASSET_INVENTORY_INDEX_PATTERN,
  aggs: {
    entityType: {
      terms: {
        field: ASSET_FIELDS.ENTITY_TYPE,
        order: {
          entityId: 'desc',
        },
        size: 10,
      },
      aggs: {
        entitySubType: {
          terms: {
            field: ASSET_FIELDS.ENTITY_SUB_TYPE,
            order: {
              entityId: 'desc',
            },
            size: 10,
          },
          aggs: {
            entityId: {
              value_count: {
                field: ASSET_FIELDS.ENTITY_ID,
              },
            },
          },
        },
        entityId: {
          value_count: {
            field: ASSET_FIELDS.ENTITY_ID,
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
  type: string;
  subType: string;
  count: number;
}

interface SubTypeBucket {
  key: string;
  doc_count: number;
  entityId: {
    value: number;
  };
}

interface TypeBucket {
  key: string;
  doc_count: number;
  entityId: {
    value: number;
  };
  entitySubType: {
    buckets: SubTypeBucket[];
    doc_count_error_upper_bound: number;
    sum_other_doc_count: number;
  };
  doc_count_error_upper_bound: number;
  sum_other_doc_count: number;
}

interface AssetAggs {
  entityType: {
    buckets: TypeBucket[];
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
//   { type: 'cloud-compute', subType: 'gcp-compute', count: 500, },
//   { type: 'cloud-compute', subType: 'aws-security', count: 300, },
//   { type: 'cloud-storage', subType: 'gcp-compute', count: 221, },
//   { type: 'cloud-storage', subType: 'aws-security', count: 117, },
// ];
function transformAggregation(agg: AssetAggs) {
  const result: AggregationResult[] = [];

  for (const typeBucket of agg.entityType.buckets) {
    const { entitySubType } = typeBucket;

    for (const subtypeBucket of entitySubType.buckets) {
      result.push({
        type: typeBucket.key,
        subType: subtypeBucket.key,
        count: subtypeBucket.doc_count,
      });
    }

    if (entitySubType.sum_other_doc_count > 0) {
      result.push({
        type: typeBucket.key,
        subType: `${typeBucket.key} - ${tooltipOtherLabel}`,
        count: entitySubType.sum_other_doc_count,
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
