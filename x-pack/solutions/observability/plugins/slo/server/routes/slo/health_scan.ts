/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getHealthScanParamsSchema,
  listHealthScanParamsSchema,
  postHealthScanParamsSchema,
  type GetHealthScanResultsResponse,
  type HealthScanResultResponse,
  type ListHealthScanResponse,
  type PostHealthScanResponse,
} from '@kbn/slo-schema';
import { v7 } from 'uuid';
import { HEALTH_DATA_STREAM_NAME } from '../../services/health_scan/health_index_installer';
import {
  HEALTH_SCAN_TASK_TYPE,
  type HealthScanTaskParams,
  type HealthScanTaskState,
} from '../../services/tasks/health_scan_task/health_scan_task';
import type { HealthDocument } from '../../services/tasks/health_scan_task/types';
import { createSloServerRoute } from '../create_slo_server_route';
import { assertPlatinumLicense } from './utils/assert_platinum_license';

export const postHealthScanRoute = createSloServerRoute({
  endpoint: 'POST /internal/observability/slos/_health/scans',
  options: { access: 'internal' },
  security: {
    authz: {
      requiredPrivileges: ['slo_write'],
    },
  },
  params: postHealthScanParamsSchema,
  handler: async ({ request, params, plugins }): Promise<PostHealthScanResponse> => {
    await assertPlatinumLicense(plugins);
    const taskManager = await plugins.taskManager.start();

    const { force = false } = params.body ?? {};

    const recentTasks = await taskManager.fetch({
      sort: [{ 'task.scheduledAt': 'desc' }],
      query: {
        bool: {
          filter: [
            { range: { 'task.scheduledAt': { gte: 'now-1h' } } },
            { term: { 'task.taskType': HEALTH_SCAN_TASK_TYPE } },
          ],
        },
      },
    });

    if (recentTasks.docs.length > 0 && !force) {
      const recentTask = recentTasks.docs[0];
      const state = recentTask.state as HealthScanTaskState;
      const taskParams = recentTask.params as HealthScanTaskParams;

      if (state.isDone) {
        return {
          scanId: taskParams.scanId,
          scheduledAt: recentTask.scheduledAt.toISOString(),
          status: 'done',
          processed: recentTask.state.processed,
          problematic: recentTask.state.problematic,
          error: recentTask.state.error,
        };
      }

      return {
        scanId: taskParams.scanId,
        scheduledAt: recentTask.scheduledAt.toISOString(),
        status: 'pending',
      };
    }

    const scanId = v7();
    const scheduledAt = new Date(Date.now() + 3 * 1000);
    await taskManager.ensureScheduled(
      {
        id: scanId,
        taskType: HEALTH_SCAN_TASK_TYPE,
        scope: ['observability', 'slo'],
        state: { isDone: false },
        runAt: scheduledAt,
        params: { scanId } satisfies HealthScanTaskParams,
      },
      { request }
    );

    return {
      scanId,
      scheduledAt: scheduledAt.toISOString(),
      status: 'scheduled',
    };
  },
});

export const getHealthScanRoute = createSloServerRoute({
  endpoint: 'GET /internal/observability/slos/_health/scans/{scanId}',
  options: { access: 'internal' },
  security: {
    authz: {
      requiredPrivileges: ['slo_read'],
    },
  },
  params: getHealthScanParamsSchema,
  handler: async ({
    request,
    params,
    plugins,
    getScopedClients,
    logger,
  }): Promise<GetHealthScanResultsResponse> => {
    await assertPlatinumLicense(plugins);

    const { scopedClusterClient, spaceId } = await getScopedClients({ request, logger });

    const { scanId } = params.path;
    const { size = 100, problematic, allSpaces } = params.query ?? {};

    let searchAfter;
    if (params.query?.searchAfter) {
      try {
        const decoded = JSON.parse(params.query.searchAfter);
        if (Array.isArray(decoded)) {
          searchAfter = decoded;
        }
      } catch (e) {
        // ignore invalid searchAfter
      }
    }

    try {
      const result = await scopedClusterClient.asCurrentUser.search<HealthDocument>({
        index: HEALTH_DATA_STREAM_NAME,
        size,
        query: {
          bool: {
            filter: [
              { term: { scanId } },
              ...(allSpaces ? [] : [{ term: { spaceId } }]),
              ...(problematic ? [{ term: { isProblematic: problematic } }] : []),
            ],
          },
        },
        sort: [
          { '@timestamp': 'desc' },
          { scanId: 'desc' },
          { spaceId: 'asc' },
          { isProblematic: 'asc' },
          { sloId: 'asc' },
        ],
        search_after: searchAfter,
      });

      const hits = result.hits.hits;
      const total =
        typeof result.hits.total === 'number' ? result.hits.total : result.hits.total?.value ?? 0;
      const lastHit = hits[hits.length - 1];
      const nextSearchAfter = lastHit && hits.length === size ? lastHit.sort : undefined;

      const results = hits
        .map((hit) => hit._source)
        .filter((source): source is HealthScanResultResponse => source !== undefined);

      return {
        results,
        total,
        searchAfter: nextSearchAfter,
      };
    } catch (err) {
      if (err.meta && err.meta.statusCode === 404) {
        return {
          results: [],
          total: 0,
        };
      }
      throw err;
    }
  },
});

export const listHealthScanRoute = createSloServerRoute({
  endpoint: 'GET /internal/observability/slos/_health/scans',
  options: { access: 'internal' },
  security: {
    authz: {
      requiredPrivileges: ['slo_read'],
    },
  },
  params: listHealthScanParamsSchema,
  handler: async ({
    request,
    params,
    plugins,
    getScopedClients,
    logger,
  }): Promise<ListHealthScanResponse> => {
    await assertPlatinumLicense(plugins);

    const { scopedClusterClient } = await getScopedClients({ request, logger });

    const { size = 10, searchAfter } = params?.query ?? {};

    try {
      const result = await scopedClusterClient.asCurrentUser.search({
        index: HEALTH_DATA_STREAM_NAME,
        size: 0,
        aggs: {
          scans: {
            composite: {
              size,
              sources: [
                {
                  scanId: {
                    terms: {
                      order: 'desc',
                      field: 'scanId',
                    },
                  },
                },
              ],
              after: searchAfter ? { scanId: searchAfter } : undefined,
            },
            aggs: {
              latest_timestamp: {
                max: {
                  field: '@timestamp',
                },
              },
              problematic_count: {
                filter: {
                  term: {
                    isProblematic: true,
                  },
                },
              },
              sorted: {
                bucket_sort: {
                  sort: [{ latest_timestamp: { order: 'desc' } }],
                },
              },
            },
          },
        },
      });

      interface ScanBucket {
        key: { scanId: string };
        doc_count: number;
        latest_timestamp: { value: number; value_as_string: string };
        problematic_count: { doc_count: number };
      }

      const aggs = result.aggregations as
        | {
            scans: {
              buckets: ScanBucket[];
              after_key?: { scanId: string };
            };
          }
        | undefined;

      const buckets = aggs?.scans.buckets ?? [];
      const afterKey = aggs?.scans.after_key;

      const scans = buckets.map((bucket) => ({
        scanId: bucket.key.scanId,
        latestTimestamp: bucket.latest_timestamp.value_as_string,
        total: bucket.doc_count,
        problematic: bucket.problematic_count.doc_count,
      }));

      return {
        scans,
        searchAfter: afterKey ? afterKey.scanId : undefined,
      };
    } catch (err) {
      if (err.meta && err.meta.statusCode === 404) {
        return {
          scans: [],
        };
      }
      throw err;
    }
  },
});

export const healthScanRoutes = {
  ...postHealthScanRoute,
  ...listHealthScanRoute,
  ...getHealthScanRoute,
};
