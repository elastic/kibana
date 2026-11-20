/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAbsoluteTimeRange } from '@kbn/data-plugin/common';
import { useQuery, type UseQueryResult } from '@kbn/react-query';
import type { ChangePointType, Detection } from '@kbn/significant-events-schema';
import type { PaginatedResponse } from '@kbn/significant-events-plugin/common';
import { useFetchErrorToast } from '../../hooks/use_fetch_error_toast';
import { useKibana } from '../../hooks/use_kibana';
import { detectionsListQueryKey } from '../query_keys';

export interface DetectionsListParams {
  from: string;
  to: string;
  page: number;
  perPage: number;
  search: string;
  change_point_type: ChangePointType[];
  entityIds: string[];
  unassignedEntities: boolean;
}

export const useDetectionsList = (
  params: DetectionsListParams
): UseQueryResult<PaginatedResponse<Detection>, Error> => {
  const { significantEventsRepositoryClient } = useKibana().services.significantEvents;
  const showFetchErrorToast = useFetchErrorToast();
  const {
    from,
    to,
    search,
    change_point_type: changePointType,
    entityIds,
    unassignedEntities,
    ...rest
  } = params;

  return useQuery<PaginatedResponse<Detection>, Error>({
    queryKey: detectionsListQueryKey(params),
    queryFn: ({ signal }) => {
      const absoluteTimeRange = getAbsoluteTimeRange({ from, to }, { forceNow: new Date() });

      return significantEventsRepositoryClient.fetch(
        'GET /internal/significant_events/detections',
        {
          params: {
            query: {
              ...rest,
              ...absoluteTimeRange,
              search: search || undefined,
              change_point_type: changePointType.length ? changePointType : undefined,
              entityIds: entityIds.length ? entityIds : undefined,
              unassignedEntities: unassignedEntities || undefined,
            },
          },
          signal: signal ?? null,
        }
      );
    },
    keepPreviousData: true,
    onError: showFetchErrorToast,
  });
};
