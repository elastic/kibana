/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useKibana } from './use_kibana';
import { DEPLOYMENT_STATS_PATH, WORKFLOWS_STATS_PATH } from '../../common/constants';

interface WorkflowsStats {
  workflows?: { enabled?: number; disabled?: number };
}

interface DeploymentStatsResponse {
  indicesCount: number | null;
  vectorDocsCount: number | null;
  storeSizeBytes: number | null;
  dashboardsCount: number | null;
}
interface DeploymentStats extends DeploymentStatsResponse {
  workflowsCount: number | null;
}

const initialStats: DeploymentStats = {
  indicesCount: null,
  vectorDocsCount: null,
  storeSizeBytes: null,
  workflowsCount: null,
  dashboardsCount: null,
};

export const useDeploymentStats = () => {
  const {
    services: { http },
  } = useKibana();

  const { data, isLoading } = useQuery({
    queryKey: ['deploymentStats'],
    queryFn: async () => {
      const [esStats, workflowsResponse] = await Promise.all([
        http.get<DeploymentStatsResponse>(DEPLOYMENT_STATS_PATH).catch(() => null),
        http.get<WorkflowsStats>(WORKFLOWS_STATS_PATH).catch(() => null),
      ]);

      return {
        indicesCount: esStats?.indicesCount ?? null,
        vectorDocsCount: esStats?.vectorDocsCount ?? null,
        storeSizeBytes: esStats?.storeSizeBytes ?? null,
        workflowsCount: workflowsResponse?.workflows
          ? (workflowsResponse.workflows.enabled ?? 0) + (workflowsResponse.workflows.disabled ?? 0)
          : null,
        dashboardsCount: esStats?.dashboardsCount ?? null,
      };
    },
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });

  return { stats: data ?? initialStats, isLoading };
};
