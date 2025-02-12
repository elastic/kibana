/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useInfiniteQuery } from '@tanstack/react-query';
import { lastValueFrom } from 'rxjs';
import { number } from 'io-ts';
import type * as estypes from '@elastic/elasticsearch/lib/api/types';
import { buildDataTableRecord } from '@kbn/discover-utils';
import type { EsHitRecord } from '@kbn/discover-utils/types';
import type { RuntimePrimitiveTypes } from '@kbn/data-views-plugin/common';
import type { CspBenchmarkRulesStates } from '@kbn/cloud-security-posture-common/schema/rules/latest';
import type { QueryDslQueryContainer } from '@kbn/data-views-plugin/common/types';
import { showErrorToast } from '@kbn/cloud-security-posture';
import type { IKibanaSearchResponse, IKibanaSearchRequest } from '@kbn/search-types';
import { useGetCspBenchmarkRulesStatesApi } from '@kbn/cloud-security-posture/src/hooks/use_get_benchmark_rules_state_api';
import type { FindingsBaseEsQuery } from '@kbn/cloud-security-posture';
import { useKibana } from '../../common/lib/kibana';
import { MAX_ASSETS_TO_LOAD, ASSET_INVENTORY_INDEX_PATTERN } from '../constants';

interface UseAssetsOptions extends FindingsBaseEsQuery {
  sort: string[][];
  enabled: boolean;
  pageSize: number;
}

const ASSET_INVENTORY_TABLE_RUNTIME_MAPPING_FIELDS: string[] = ['entity.id', 'entity.name'];

const getRuntimeMappingsFromSort = (sort: string[][]) => {
  return sort
    .filter(([field]) => ASSET_INVENTORY_TABLE_RUNTIME_MAPPING_FIELDS.includes(field))
    .reduce((acc, [field]) => {
      const type: RuntimePrimitiveTypes = 'keyword';

      return {
        ...acc,
        [field]: {
          type,
        },
      };
    }, {});
};

const buildMutedRulesFilter = (rulesStates: CspBenchmarkRulesStates): QueryDslQueryContainer[] => {
  const mutedRules = Object.fromEntries(
    Object.entries(rulesStates).filter(([_key, value]) => value.muted === true)
  );

  const mutedRulesFilterQuery = Object.keys(mutedRules).map((key) => {
    // const rule = mutedRules[key];
    return {
      bool: {
        must: [
          // TODO Determine which rules are mutable
          // { term: { 'rule.benchmark.id': rule.benchmark_id } },
          // { term: { 'rule.benchmark.version': rule.benchmark_version } },
          // { term: { 'rule.benchmark.rule_number': rule.rule_number } },
        ],
      },
    };
  });

  return mutedRulesFilterQuery;
};

const getMultiFieldsSort = (sort: string[][]) => {
  return sort.map(([id, direction]) => {
    return {
      ...getSortField({ field: id, direction }),
    };
  });
};

/**
 * By default, ES will sort keyword fields in case-sensitive format, the
 * following fields are required to have a case-insensitive sorting.
 */
const fieldsRequiredSortingByPainlessScript = ['entity.name']; // TODO TBD

/**
 * Generates Painless sorting if the given field is matched or returns default sorting
 * This painless script will sort the field in case-insensitive manner
 */
const getSortField = ({ field, direction }: { field: string; direction: string }) => {
  if (fieldsRequiredSortingByPainlessScript.includes(field)) {
    return {
      _script: {
        type: 'string',
        order: direction,
        script: {
          source: `doc["${field}"].value.toLowerCase()`,
          lang: 'painless',
        },
      },
    };
  }
  return { [field]: direction };
};

const getAssetsQuery = (
  { query, sort }: UseAssetsOptions,
  rulesStates: CspBenchmarkRulesStates,
  pageParam: unknown
) => {
  const mutedRulesFilterQuery = buildMutedRulesFilter(rulesStates);

  return {
    index: ASSET_INVENTORY_INDEX_PATTERN,
    sort: getMultiFieldsSort(sort),
    runtime_mappings: getRuntimeMappingsFromSort(sort),
    size: MAX_ASSETS_TO_LOAD,
    aggs: {
      count: {
        terms: {
          field: 'entity.id',
        },
      },
    },
    ignore_unavailable: true,
    query: {
      ...query,
      bool: {
        ...query?.bool,
        filter: [...(query?.bool?.filter ?? [])],
        must_not: [...(query?.bool?.must_not ?? []), ...mutedRulesFilterQuery],
      },
    },
    ...(pageParam ? { from: pageParam } : {}),
  };
};

interface Asset {
  '@timestamp': string;
  name: string;
  risk: number;
  criticality: string;
  category: string;
}

interface AssetsAggs {
  count: estypes.AggregationsMultiBucketAggregateBase<estypes.AggregationsStringRareTermsBucketKeys>;
}

type LatestAssetsRequest = IKibanaSearchRequest<estypes.SearchRequest>;
type LatestAssetsResponse = IKibanaSearchResponse<estypes.SearchResponse<Asset, AssetsAggs>>;

const getAggregationCount = (
  buckets: Array<estypes.AggregationsStringRareTermsBucketKeys | undefined>
) => {
  const passed = buckets.find((bucket) => bucket?.key === 'passed');
  const failed = buckets.find((bucket) => bucket?.key === 'failed');

  return {
    passed: passed?.doc_count || 0,
    failed: failed?.doc_count || 0,
  };
};

export function useFetchData(options: UseAssetsOptions) {
  const {
    data,
    notifications: { toasts },
  } = useKibana().services;
  const { data: rulesStates } = useGetCspBenchmarkRulesStatesApi();

  return useInfiniteQuery(
    ['asset_inventory', { params: options }, rulesStates],
    async ({ pageParam }) => {
      const {
        rawResponse: { hits, aggregations },
      } = await lastValueFrom(
        data.search.search<LatestAssetsRequest, LatestAssetsResponse>({
          // ruleStates always exists since it under the `enabled` dependency.
          params: getAssetsQuery(options, rulesStates!, pageParam) as LatestAssetsRequest['params'], // eslint-disable-line @typescript-eslint/no-non-null-assertion
        })
      );
      if (!aggregations) throw new Error('expected aggregations to be an defined');
      if (!Array.isArray(aggregations.count.buckets))
        throw new Error('expected buckets to be an array');

      return {
        page: hits.hits.map((hit) => buildDataTableRecord(hit as EsHitRecord)),
        total: number.is(hits.total) ? hits.total : 0,
        count: getAggregationCount(aggregations.count.buckets),
      };
    },
    {
      enabled: options.enabled && !!rulesStates,
      keepPreviousData: true,
      onError: (err: Error) => showErrorToast(toasts, err),
      getNextPageParam: (lastPage, allPages) => {
        if (lastPage.page.length < options.pageSize) {
          return undefined;
        }
        return allPages.length * options.pageSize;
      },
    }
  );
}
