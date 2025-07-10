/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from '@kbn/core/public';
import { useKibana } from '@kbn/triggers-actions-ui-plugin/public';
import { GetRelatedDashboardsResponse } from '@kbn/observability-schema';
import { useQuery } from '@tanstack/react-query';
import { ALERTS_API_URLS } from '../../../../common/constants';
import { DashboardMetadata } from '../components/related_dashboards/dashboard_tile';

export const fetchRelatedDashboards = async ({
  alertId,
  http,
}: {
  alertId: string;
  http: HttpSetup;
}): Promise<GetRelatedDashboardsResponse> => {
  return http.get<GetRelatedDashboardsResponse>(ALERTS_API_URLS.INTERNAL_RELATED_DASHBOARDS, {
    query: { alertId },
  });
};

const getDashboardMetadata = <T extends DashboardMetadata>({ description, id, title }: T) => ({
  description,
  id,
  title,
});

export const getRelatedDashboardsQueryKey = (alertId: string) => ['relatedDashboards', alertId];

export const useRelatedDashboards = (alertId: string) => {
  const { http } = useKibana().services;

  const { data, isLoading, refetch } = useQuery<GetRelatedDashboardsResponse>({
    queryKey: getRelatedDashboardsQueryKey(alertId),
    queryFn: () => fetchRelatedDashboards({ alertId, http }),
    refetchOnWindowFocus: false, // Disable window focus refetching
  });

  return {
    isLoadingRelatedDashboards: isLoading,
    suggestedDashboards: data?.suggestedDashboards?.map(getDashboardMetadata),
    linkedDashboards: data?.linkedDashboards?.map(getDashboardMetadata),
    refetchRelatedDashboards: refetch,
  };
};
