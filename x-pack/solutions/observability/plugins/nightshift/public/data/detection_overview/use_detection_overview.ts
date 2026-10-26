/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAbsoluteTimeRange } from '@kbn/data-plugin/common';
import type { QueryFunctionContext } from '@kbn/react-query';
import { useQuery } from '@kbn/react-query';
import { useFetchErrorToast } from '../../hooks/use_fetch_error_toast';
import { useKibana } from '../../hooks/use_kibana';
import { detectionOverviewQueryKey } from '../query_keys';

export interface DetectionOverviewTimeRange {
  from: string;
  to: string;
}

export const useDetectionOverview = (range: DetectionOverviewTimeRange) => {
  const { significantEventsRepositoryClient } = useKibana().services.significantEvents;
  const showFetchErrorToast = useFetchErrorToast();

  return useQuery({
    queryKey: detectionOverviewQueryKey(range),
    queryFn: ({ signal }: QueryFunctionContext) => {
      const { from, to } = getAbsoluteTimeRange(range, { forceNow: new Date() });

      return significantEventsRepositoryClient.fetch(
        'GET /internal/significant_events/detection/_overview',
        {
          params: { query: { from, to } },
          signal: signal ?? null,
        }
      );
    },
    onError: showFetchErrorToast,
    refetchOnWindowFocus: true,
  });
};
