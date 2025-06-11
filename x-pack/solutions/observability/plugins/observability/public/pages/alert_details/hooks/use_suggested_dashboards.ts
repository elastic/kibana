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
import { DashboardMetadata } from '../components/related_dashboards/dashboard';

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

interface SuggestedDashboardResponse {
  isLoadingSuggestedDashboards: boolean;
  suggestedDashboards?: DashboardMetadata[];
}

export const useSuggestedDashboards = (alertId: string): SuggestedDashboardResponse => {
  const { http } = useKibana().services;

  const { data, isLoading } = useQuery<GetRelatedDashboardsResponse>({
    queryKey: ['relatedDashboards', alertId],
    queryFn: () => fetchRelatedDashboards({ alertId, http }),
  });

  return {
    isLoadingSuggestedDashboards: isLoading,
    suggestedDashboards: data?.suggestedDashboards
      ? data.suggestedDashboards.map(({ id, title, description }) => ({ id, title, description }))
      : undefined,
  };
};
