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
import type { IKibanaSearchRequest, IKibanaSearchResponse } from '@kbn/search-types';
import { useMemo } from 'react';
import { useKibana } from '../../../common/lib/kibana';
import { QUERY_KEY_CHART_DATA } from '../../constants';
import { getTopAssetsQuery } from './get_top_assets_query';
import type { AssetAggs } from './transform_asset_aggregation_to_chart_data';
import { transformAssetAggregationToChartData } from './transform_asset_aggregation_to_chart_data';
import type { AssetInventoryChartData, UseTopAssetsOptions } from './types';
import { useDataViewContext } from '../data_view_context';

type TopAssetsRequest = IKibanaSearchRequest<estypes.SearchRequest>;
type TopAssetsResponse = IKibanaSearchResponse<
  estypes.SearchResponse<AssetInventoryChartData, AssetAggs>
>;

export function useFetchChartData(options: UseTopAssetsOptions) {
  const {
    data,
    notifications: { toasts },
  } = useKibana().services;

  const { dataView } = useDataViewContext();

  const dataViewIndexPattern = useMemo(() => {
    return dataView?.getIndexPattern();
  }, [dataView]);

  return useQuery(
    [QUERY_KEY_CHART_DATA, { params: options }],
    async () => {
      const {
        rawResponse: { aggregations },
      } = await lastValueFrom(
        data.search.search<TopAssetsRequest, TopAssetsResponse>({
          params: getTopAssetsQuery(options, dataViewIndexPattern) as TopAssetsRequest['params'],
        })
      );

      if (!aggregations) {
        throw new Error('expected aggregations to be defined');
      }

      return transformAssetAggregationToChartData(aggregations);
    },
    {
      enabled: options.enabled && !!dataViewIndexPattern,
      keepPreviousData: true,
      onError: (err: Error) => showErrorToast(toasts, err),
    }
  );
}
