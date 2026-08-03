/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { decodeOrThrow } from '@kbn/io-ts-utils';
import createContainer from 'constate';
import type { FetcherResult } from '@kbn/observability-shared-plugin/public';
import { useEffect } from 'react';
import { EMPTY, skip } from 'rxjs';
import type { EntityTypes } from '../../common/http_api/shared/entity_type';
import type { GetTimeRangeMetadataResponse } from '../../common/metrics_sources/get_has_data';
import { getTimeRangeMetadataResponseRT } from '../../common/metrics_sources/get_has_data';
import {
  OBSERVABILITY_INFRA_CPS_ENABLED_DEFAULT,
  OBSERVABILITY_INFRA_CPS_ENABLED_FEATURE_FLAG,
} from '../../common/cps_feature_flag';
import { useFetcher } from './use_fetcher';
import { useKibanaContextForPlugin } from './use_kibana';

export const useTimeRangeMetadata = ({
  dataSource,
  kuery,
  filters,
  start,
  end,
  isInventoryView = false,
}: {
  kuery?: string;
  filters?: string;
  dataSource: EntityTypes;
  start: string;
  end: string;
  isInventoryView?: boolean;
}): FetcherResult<GetTimeRangeMetadataResponse> => {
  const { services } = useKibanaContextForPlugin();
  const infraCpsEnabled = services.featureFlags.getBooleanValue(
    OBSERVABILITY_INFRA_CPS_ENABLED_FEATURE_FLAG,
    OBSERVABILITY_INFRA_CPS_ENABLED_DEFAULT
  );
  const cpsManager = infraCpsEnabled ? services.cps?.cpsManager : undefined;
  const { data, refetch, status } = useFetcher(
    async (callApi) => {
      const response = await callApi('/api/metrics/source/time_range_metadata', {
        method: 'GET',
        query: {
          from: start,
          to: end,
          kuery,
          dataSource,
          filters,
          isInventoryView,
        },
      });

      return decodeOrThrow(getTimeRangeMetadataResponseRT)(response);
    },
    [start, end, kuery, filters, dataSource, isInventoryView],
    {
      reloadRequestTimeUpdateEnabled: false,
    }
  );

  useEffect(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    const subscription = (cpsManager?.getProjectRouting$() ?? EMPTY).pipe(skip(1)).subscribe(() => {
      refetch();
    });
    return () => subscription.unsubscribe();
  }, [cpsManager, refetch]);

  return {
    data,
    status,
  };
};

export const [TimeRangeMetadataProvider, useTimeRangeMetadataContext] =
  createContainer(useTimeRangeMetadata);
