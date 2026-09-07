/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { HttpStart } from '@kbn/core/public';
import { useQuery } from '@kbn/react-query';
import { FavoritesClient } from '@kbn/content-management-favorites-public';
import { useKibana } from './use_kibana';
import {
  DEPLOYMENT_STATS_PATH,
  STARRED_DASHBOARDS_COUNT_PATH,
  VECTORDB_APP_ID,
  WORKFLOWS_STATS_PATH,
} from '../../common/constants';
import type { NewIndexDetails } from '../../common/types';

interface WorkflowsStats {
  workflows?: { enabled?: number; disabled?: number };
}

interface StarredDashboardsCountResponse {
  count: number | null;
}

interface DeploymentStatsResponse {
  indicesCount: number | null;
  vectorCount: number | null;
  storeSizeBytes: number | null;
  dashboardsCount: number | null;
  documentsCount: number | null;
  apiKeysCount: number | null;
  expiringApiKeysCount: number | null;
  newIndex: NewIndexDetails | null;
}

export interface DeploymentStats extends DeploymentStatsResponse {
  workflowsCount: number | null;
  workflowsRunningCount: number | null;
  starredDashboardsCount: number | null;
}

const initialStats: DeploymentStats = {
  indicesCount: null,
  vectorCount: null,
  storeSizeBytes: null,
  workflowsCount: null,
  workflowsRunningCount: null,
  dashboardsCount: null,
  documentsCount: null,
  apiKeysCount: null,
  expiringApiKeysCount: null,
  starredDashboardsCount: null,
  newIndex: null,
};

/**
 * Resolves the favorited dashboard IDs against the dashboards that still exist. Deleting a
 * dashboard does not unfavorite it, so the stored IDs on their own overcount the starred total.
 */
const countStarredDashboards = async (
  http: HttpStart,
  favoriteIds: string[] | undefined
): Promise<number | null> => {
  if (!favoriteIds) {
    return null;
  }

  if (favoriteIds.length === 0) {
    return 0;
  }

  const starredDashboards = await http
    .post<StarredDashboardsCountResponse>(STARRED_DASHBOARDS_COUNT_PATH, {
      body: JSON.stringify({ dashboardIds: favoriteIds }),
    })
    .catch(() => null);

  return starredDashboards?.count ?? null;
};

export const useDeploymentStats = () => {
  const {
    services: { http, userProfile },
  } = useKibana();

  const favoritesClient = useMemo(
    () => new FavoritesClient(VECTORDB_APP_ID, 'dashboard', { http, userProfile }),
    [http, userProfile]
  );

  const { data, isLoading } = useQuery({
    queryKey: ['deploymentStats'],
    queryFn: async () => {
      const [esStats, workflowsResponse, starredDashboardsCount] = await Promise.all([
        http.get<DeploymentStatsResponse>(DEPLOYMENT_STATS_PATH).catch(() => null),
        http.get<WorkflowsStats>(WORKFLOWS_STATS_PATH).catch(() => null),
        favoritesClient
          .getFavorites()
          .catch(() => null)
          .then((favoritesResponse) =>
            countStarredDashboards(http, favoritesResponse?.favoriteIds)
          ),
      ]);

      return {
        indicesCount: esStats?.indicesCount ?? null,
        vectorCount: esStats?.vectorCount ?? null,
        storeSizeBytes: esStats?.storeSizeBytes ?? null,
        documentsCount: esStats?.documentsCount ?? null,
        apiKeysCount: esStats?.apiKeysCount ?? null,
        expiringApiKeysCount: esStats?.expiringApiKeysCount ?? null,
        workflowsCount: workflowsResponse?.workflows
          ? (workflowsResponse.workflows.enabled ?? 0) + (workflowsResponse.workflows.disabled ?? 0)
          : null,
        workflowsRunningCount: workflowsResponse?.workflows?.enabled ?? null,
        dashboardsCount: esStats?.dashboardsCount ?? null,
        starredDashboardsCount,
        newIndex: esStats?.newIndex ?? null,
      };
    },
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    staleTime: 60_000,
  });

  return { stats: data ?? initialStats, isLoading };
};
