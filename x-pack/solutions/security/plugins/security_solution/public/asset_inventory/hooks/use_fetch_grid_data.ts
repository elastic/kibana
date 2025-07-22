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
import { showErrorToast } from '@kbn/cloud-security-posture';
import type { IKibanaSearchResponse, IKibanaSearchRequest } from '@kbn/search-types';
import type { BaseEsQuery } from '@kbn/cloud-security-posture';
import { useMemo } from 'react';
import { useKibana } from '../../common/lib/kibana';
import { ASSET_FIELDS, MAX_ASSETS_TO_LOAD, QUERY_KEY_GRID_DATA } from '../constants';
import { getRuntimeMappingsFromSort, getMultiFieldsSort } from './fetch_utils';
import { useDataViewContext } from './data_view_context';
import { addEmptyDataFilterQuery } from '../utils/add_empty_data_filter';

interface UseAssetsOptions extends BaseEsQuery {
  sort: string[][];
  enabled: boolean;
  pageSize: number;
}

const ASSET_INVENTORY_TABLE_RUNTIME_MAPPING_FIELDS: string[] = [
  ASSET_FIELDS.ENTITY_ID,
  ASSET_FIELDS.ENTITY_NAME,
];

const getAssetsQuery = (
  { query, sort }: UseAssetsOptions,
  pageParam: unknown,
  indexPattern?: string
) => {
  if (!indexPattern) {
    throw new Error('Index pattern is required');
  }

  return {
    index: indexPattern,
    sort: getMultiFieldsSort(sort),
    runtime_mappings: getRuntimeMappingsFromSort(
      ASSET_INVENTORY_TABLE_RUNTIME_MAPPING_FIELDS,
      sort
    ),
    size: MAX_ASSETS_TO_LOAD,
    ignore_unavailable: true,
    query: {
      ...query,
      bool: {
        ...query?.bool,
        filter: [...(query?.bool?.filter ?? [])],
        must_not: addEmptyDataFilterQuery([...(query?.bool?.must_not ?? [])]),
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

type LatestAssetsRequest = IKibanaSearchRequest<estypes.SearchRequest>;
type LatestAssetsResponse = IKibanaSearchResponse<estypes.SearchResponse<Asset, never>>;

export function useFetchGridData(options: UseAssetsOptions) {
  const {
    data,
    notifications: { toasts },
  } = useKibana().services;

  const { dataView } = useDataViewContext();

  const dataViewIndexPattern = useMemo(() => {
    return dataView?.getIndexPattern();
  }, [dataView]);

  return useInfiniteQuery(
    [QUERY_KEY_GRID_DATA, { params: options }],
    async ({ pageParam }) => {
      const {
        rawResponse: { hits },
      } = await lastValueFrom(
        data.search.search<LatestAssetsRequest, LatestAssetsResponse>({
          params: getAssetsQuery(
            options,
            pageParam,
            dataViewIndexPattern
          ) as LatestAssetsRequest['params'],
        })
      );

      return {
        page: hits.hits.map((hit) => buildDataTableRecord(hit as EsHitRecord)),
        total: number.is(hits.total) ? hits.total : 0,
      };
    },
    {
      enabled: options.enabled && !!dataViewIndexPattern,
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
