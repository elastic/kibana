/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useInfiniteQuery } from '@tanstack/react-query';
import { lastValueFrom } from 'rxjs';
import { number } from 'io-ts';
import type { estypes } from '@elastic/elasticsearch';
import { buildDataTableRecord } from '@kbn/discover-utils';
import type { EsHitRecord } from '@kbn/discover-utils/types';
import type { RuntimePrimitiveTypes } from '@kbn/data-views-plugin/common';
import { showErrorToast } from '@kbn/cloud-security-posture';
import type { IKibanaSearchResponse, IKibanaSearchRequest } from '@kbn/search-types';
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

const getAssetsQuery = ({ query, sort }: UseAssetsOptions, pageParam: unknown) => {
  return {
    index: ASSET_INVENTORY_INDEX_PATTERN,
    sort: getMultiFieldsSort(sort),
    runtime_mappings: getRuntimeMappingsFromSort(sort),
    size: MAX_ASSETS_TO_LOAD,
    ignore_unavailable: true,
    query: {
      ...query,
      bool: {
        ...query?.bool,
        filter: [...(query?.bool?.filter ?? [])],
        must_not: [...(query?.bool?.must_not ?? [])],
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

export function useFetchData(options: UseAssetsOptions) {
  const {
    data,
    notifications: { toasts },
  } = useKibana().services;
  return useInfiniteQuery(
    ['asset_inventory', { params: options }],
    async ({ pageParam }) => {
      const {
        rawResponse: { hits },
      } = await lastValueFrom(
        data.search.search<LatestAssetsRequest, LatestAssetsResponse>({
          params: getAssetsQuery(options, pageParam) as LatestAssetsRequest['params'],
        })
      );

      return {
        page: hits.hits.map((hit) => buildDataTableRecord(hit as EsHitRecord)),
        total: number.is(hits.total) ? hits.total : 0,
      };
    },
    {
      enabled: options.enabled,
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
