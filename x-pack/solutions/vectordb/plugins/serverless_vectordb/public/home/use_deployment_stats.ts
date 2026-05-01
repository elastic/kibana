/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useState } from 'react';
import { useKibana } from '../hooks/use_kibana';

const DEPLOYMENT_STATS_PATH = '/internal/serverless_vectordb/deployment_stats';

export interface DeploymentStats {
  indicesCount: number | null;
  vectorDocsCount: number | null;
  storeSizeBytes: number | null;
  agentsCount: number | null;
  workflowsCount: number | null;
  elasticsearchUrl: string | null;
}

const initialStats: DeploymentStats = {
  indicesCount: null,
  vectorDocsCount: null,
  storeSizeBytes: null,
  agentsCount: null,
  workflowsCount: null,
  elasticsearchUrl: null,
};

export const useDeploymentStats = () => {
  const {
    services: { http, cloud },
  } = useKibana();
  const [stats, setStats] = useState<DeploymentStats>(initialStats);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    const fetchEs = http
      .get<{ indicesCount: number; vectorDocsCount: number; storeSizeBytes: number }>(
        DEPLOYMENT_STATS_PATH
      )
      .catch(() => null);

    const fetchAgents = http
      .get<{ results?: unknown[] } | unknown[]>('/api/agent_builder/agents')
      .catch(() => null);

    const fetchWorkflows = http
      .get<{ workflows?: { enabled?: number; disabled?: number } }>('/api/workflows/stats')
      .catch(() => null);

    const fetchEsUrl = cloud
      ? cloud.fetchElasticsearchConfig().catch(() => null)
      : Promise.resolve(null);

    Promise.all([fetchEs, fetchAgents, fetchWorkflows, fetchEsUrl]).then(
      ([esStats, agentsResponse, workflowsResponse, esConfig]) => {
        if (cancelled) return;
        const agentsCount = Array.isArray(agentsResponse)
          ? agentsResponse.length
          : Array.isArray(agentsResponse?.results)
          ? agentsResponse!.results!.length
          : null;
        setStats({
          indicesCount: esStats?.indicesCount ?? null,
          vectorDocsCount: esStats?.vectorDocsCount ?? null,
          storeSizeBytes: esStats?.storeSizeBytes ?? null,
          agentsCount,
          workflowsCount: workflowsResponse?.workflows
            ? (workflowsResponse.workflows.enabled ?? 0) +
              (workflowsResponse.workflows.disabled ?? 0)
            : null,
          elasticsearchUrl: esConfig?.elasticsearchUrl ?? null,
        });
        setIsLoading(false);
      }
    );

    return () => {
      cancelled = true;
    };
  }, [http, cloud]);

  return { stats, isLoading };
};

export const formatBytes = (bytes: number | null): string => {
  if (bytes === null) return '—';
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(value >= 100 || i === 0 ? 0 : 1)} ${units[i]}`;
};

export const formatNumber = (n: number | null): string =>
  n === null ? '—' : new Intl.NumberFormat().format(n);
