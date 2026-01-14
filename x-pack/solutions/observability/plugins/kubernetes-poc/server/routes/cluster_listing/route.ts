/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import datemath from '@kbn/datemath';
import type { ESQLSearchResponse } from '@kbn/es-types';
import { createKubernetesPocServerRoute } from '../create_kubernetes_poc_server_route';
import type { ClusterData, ClusterListingResponse } from '../../../common/cluster_listing';

/**
 * ES|QL query for cluster listing with performance-optimized WHERE clause.
 *
 * Performance rules applied:
 * - BY clause fields (k8s.cluster.name, cloud.provider) MUST exist in every document (AND IS NOT NULL)
 * - Metric fields are optional and combined with OR since not all metrics exist in every document
 */
const CLUSTER_LISTING_ESQL_QUERY = `
FROM remote_cluster:metrics-*
| WHERE k8s.cluster.name IS NOT NULL
  AND cloud.provider IS NOT NULL
  AND (
    k8s.node.name IS NOT NULL
    OR k8s.namespace.name IS NOT NULL
    OR k8s.pod.uid IS NOT NULL
    OR k8s.pod.phase IS NOT NULL
    OR k8s.node.cpu.usage IS NOT NULL
    OR k8s.node.memory.usage IS NOT NULL
    OR k8s.node.allocatable_cpu IS NOT NULL
    OR k8s.node.allocatable_memory IS NOT NULL
    OR k8s.node.condition_ready IS NOT NULL
    OR k8s.node.filesystem.usage IS NOT NULL
    OR k8s.node.filesystem.capacity IS NOT NULL
  )
| STATS
    total_nodes = COUNT_DISTINCT(k8s.node.name) WHERE k8s.node.condition_ready IS NOT NULL,
    ready_nodes = COUNT_DISTINCT(k8s.node.name) WHERE k8s.node.condition_ready > 0 AND k8s.node.condition_ready IS NOT NULL,
    total_namespaces = COUNT_DISTINCT(k8s.namespace.name),
    total_pods = COUNT_DISTINCT(k8s.pod.uid),
    running_pods = COUNT_DISTINCT(k8s.pod.uid) WHERE k8s.pod.phase == 2,
    failed_pods = COUNT_DISTINCT(k8s.pod.uid) WHERE k8s.pod.phase == 4,
    sum_cpu_usage = SUM(k8s.node.cpu.usage),
    sum_memory_usage = SUM(k8s.node.memory.usage),
    sum_allocatable_cpu = SUM(k8s.node.allocatable_cpu),
    sum_allocatable_memory = SUM(k8s.node.allocatable_memory),
    sum_filesystem_usage = SUM(k8s.node.filesystem.usage),
    sum_filesystem_capacity = SUM(k8s.node.filesystem.capacity)
  BY k8s.cluster.name, cloud.provider
| EVAL health_status = CASE(ready_nodes < total_nodes, "unhealthy", "healthy")
| EVAL cpu_utilization = ROUND(sum_cpu_usage / sum_allocatable_cpu * 100, 2)
| EVAL memory_utilization = ROUND(sum_memory_usage / TO_DOUBLE(sum_allocatable_memory) * 100, 2)
| EVAL volume_utilization = ROUND(sum_filesystem_usage / TO_DOUBLE(sum_filesystem_capacity) * 100, 2)
| KEEP k8s.cluster.name, health_status, cloud.provider, total_nodes, total_namespaces,
       failed_pods, running_pods,
       cpu_utilization, memory_utilization, volume_utilization
`;

interface EsqlColumn {
  name: string;
  type: string;
}

/**
 * Parse a date string using datemath and return ISO timestamp
 */
function parseDateString(dateString: string, roundUp: boolean = false): string {
  const parsed = datemath.parse(dateString, { roundUp });
  if (!parsed || !parsed.isValid()) {
    throw new Error(`Invalid date string: ${dateString}`);
  }
  return parsed.toISOString();
}

const getClusterListingRoute = createKubernetesPocServerRoute({
  endpoint: 'GET /internal/kubernetes_poc/cluster_listing',
  options: { access: 'internal' },
  params: t.type({
    query: t.type({
      from: t.string,
      to: t.string,
    }),
  }),
  security: {
    authz: {
      requiredPrivileges: ['kibana_read'],
    },
  },
  handler: async (resources): Promise<ClusterListingResponse> => {
    const { context, logger, response, params } = resources;
    const { from, to } = params.query;

    logger.info(`Cluster listing endpoint called with time range: ${from} to ${to}`);

    try {
      // Parse date strings to ISO timestamps
      const fromTimestamp = parseDateString(from, false);
      const toTimestamp = parseDateString(to, true);

      const coreContext = await context.core;
      const esClient = coreContext.elasticsearch.client.asCurrentUser;

      const esqlResponse = (await esClient.transport.request({
        method: 'POST',
        path: '/_query',
        body: {
          query: CLUSTER_LISTING_ESQL_QUERY,
          filter: {
            range: {
              '@timestamp': {
                gte: fromTimestamp,
                lte: toTimestamp,
              },
            },
          },
        },
      })) as ESQLSearchResponse;

      const columns = esqlResponse.columns as EsqlColumn[];
      const values = esqlResponse.values as unknown[][];

      // Create a column index map for easy access
      const columnIndex = columns.reduce<Record<string, number>>((acc, col, index) => {
        acc[col.name] = index;
        return acc;
      }, {});

      // Transform ES|QL response into typed ClusterData objects
      const clusters: ClusterData[] = values.map((row) => ({
        clusterName: row[columnIndex['k8s.cluster.name']] as string,
        healthStatus: row[columnIndex.health_status] as 'healthy' | 'unhealthy',
        cloudProvider: row[columnIndex['cloud.provider']] as string | null,
        totalNodes: row[columnIndex.total_nodes] as number,
        totalNamespaces: row[columnIndex.total_namespaces] as number,
        failedPods: row[columnIndex.failed_pods] as number,
        runningPods: row[columnIndex.running_pods] as number,
        cpuUtilization: row[columnIndex.cpu_utilization] as number | null,
        memoryUtilization: row[columnIndex.memory_utilization] as number | null,
        volumeUtilization: row[columnIndex.volume_utilization] as number | null,
      }));

      logger.debug(`Returning ${clusters.length} clusters`);

      return { clusters };
    } catch (error) {
      logger.error(`Error fetching cluster listing: ${error.message}`);
      throw response.customError({
        statusCode: 500,
        body: { message: `Failed to fetch cluster listing: ${error.message}` },
      });
    }
  },
});

export const clusterListingRouteRepository = {
  ...getClusterListingRoute,
};
