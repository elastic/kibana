/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISearchStart } from '@kbn/data-plugin/public';
import type { Filter, Query, TimeRange } from '@kbn/es-query';
import type { RequestAdapter } from '@kbn/inspector-plugin/common';
import { FactoryQueryType } from '../../../../../common/threat_intelligence/constants';
import type { Indicator } from '../../../../../common/threat_intelligence/types/indicator';
import { getIndicatorQueryParams } from '../utils/get_indicator_query_params';
import { search } from '../../../utils/search';

export interface RawIndicatorsResponse {
  hits: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    hits: any[];
    total: number;
  };
}

export interface Pagination {
  pageSize: number;
  pageIndex: number;
  pageSizeOptions: number[];
}

interface FetchIndicatorsDependencies {
  searchService: ISearchStart;
  inspectorAdapter: RequestAdapter;
}

export interface FetchParams {
  pagination: Pagination;
  selectedPatterns: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sorting: any[];
  filters: Filter[];
  timeRange?: TimeRange;
  filterQuery: Query;
}

type ReactQueryKey = [string, FetchParams];

export interface IndicatorsQueryParams {
  signal?: AbortSignal;
  queryKey: ReactQueryKey;
}

export interface IndicatorsResponse {
  indicators: Indicator[];
  total: number;
}

export const createFetchIndicators =
  ({ searchService, inspectorAdapter }: FetchIndicatorsDependencies) =>
  async (
    { pagination, selectedPatterns, timeRange, filterQuery, filters, sorting }: FetchParams,
    signal?: AbortSignal
  ): Promise<IndicatorsResponse> => {
    const sharedParams = getIndicatorQueryParams({ timeRange, filters, filterQuery });

    const searchRequestBody = {
      size: pagination.pageSize,
      from: pagination.pageIndex,
      fields: [{ field: '*', include_unmapped: true } as const],
      sort: sorting.map(({ id, direction }) => ({ [id]: direction })),
      ...sharedParams,
    };

    const {
      hits: { hits: indicators, total },
    } = await search<RawIndicatorsResponse>(
      searchService,
      {
        params: {
          index: selectedPatterns,
          ...searchRequestBody,
        },
        factoryQueryType: FactoryQueryType.IndicatorGrid,
      },
      { inspectorAdapter, requestName: 'Indicators table', signal }
    );

    return { indicators, total };
  };
