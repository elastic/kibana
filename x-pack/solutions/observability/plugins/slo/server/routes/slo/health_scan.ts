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
import { HEALTH_DATA_STREAM_NAME } from '../../../common/constants';
import {
  HEALTH_SCAN_TASK_TYPE,
  type HealthScanTaskParams,
  type HealthScanTaskState,
} from '../../services/tasks/health_scan_task/health_scan_task';
import type { HealthDocument } from '../../services/tasks/health_scan_task/types';
import { createSloServerRoute } from '../create_slo_server_route';
import { assertPlatinumLicense } from './utils/assert_platinum_license';
import { IllegalArgumentError } from '../../errors';

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
          status: 'completed',
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
    const taskManager = await plugins.taskManager.start();

    const { size = 25 } = params?.query ?? {};
    if (size <= 0 || size > 100) {
      throw new IllegalArgumentError('Size must be between 1 and 100');
    }

    const recentTasks = await taskManager
      .fetch({
        sort: [{ 'task.scheduledAt': 'desc' }],
        size,
        query: {
          bool: {
            filter: [
              { range: { 'task.scheduledAt': { gte: 'now-1h' } } },
              { term: { 'task.taskType': HEALTH_SCAN_TASK_TYPE } },
            ],
          },
        },
      })
      .catch(() => ({ docs: [] }));

    try {
      interface ScanBucket {
        key: { scanId: string };
        doc_count: number;
        latest_timestamp: { value: number; value_as_string: string };
        problematic_count: { doc_count: number };
      }

      const result = await scopedClusterClient.asInternalUser.search<
        unknown,
        { scans: { buckets: ScanBucket[] } }
      >({
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
                    'health.isProblematic': true,
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

      const buckets = result.aggregations?.scans.buckets ?? [];
      const scanIds = buckets.map((bucket) => bucket.key.scanId);

      // scans that are still running (if any) and did not produce any document yet
      const scheduledScans = recentTasks.docs.filter((t) => !scanIds.includes(t.id));
      const pendingScans = recentTasks.docs
        .filter((t) => scanIds.includes(t.id) && t.state.isDone === false)
        .map((t) => t.id);

      const scans = buckets.map((bucket) => ({
        scanId: bucket.key.scanId,
        latestTimestamp: bucket.latest_timestamp.value_as_string,
        total: bucket.doc_count,
        problematic: bucket.problematic_count.doc_count,
        status: pendingScans.includes(bucket.key.scanId)
          ? ('pending' as const) // recent task found and not done = pending
          : ('completed' as const), // not recent, considere completed
      }));

      return {
        scans: [
          ...scheduledScans.map((task) => ({
            scanId: task.id,
            latestTimestamp: task.scheduledAt.toISOString(),
            total: 0,
            problematic: 0,
            status: 'pending' as const,
          })),
          ...scans,
        ].slice(0, size),
      };
    } catch (err) {
      if (err.meta && err.meta.statusCode === 404) {
        return {
          scans: recentTasks.docs.map((task) => ({
            scanId: task.id,
            latestTimestamp: task.scheduledAt.toISOString(),
            total: 0,
            problematic: 0,
            status: 'pending' as const,
          })),
        };
      }
      throw err;
    }
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
    const taskManager = await plugins.taskManager.start();
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

    if (size <= 0 || size > 100) {
      throw new IllegalArgumentError('Size must be between 1 and 100');
    }

    const scanTask = await taskManager.get(scanId).catch(() => null);

    try {
      const result = await scopedClusterClient.asInternalUser.search<HealthDocument>({
        index: HEALTH_DATA_STREAM_NAME,
        size,
        query: {
          bool: {
            filter: [
              { term: { scanId } },
              ...(allSpaces ? [] : [{ term: { spaceId } }]),
              ...(problematic ? [{ term: { 'health.isProblematic': problematic } }] : []),
            ],
          },
        },
        sort: [
          { '@timestamp': 'desc' },
          { scanId: 'desc' },
          { spaceId: 'asc' },
          { 'health.isProblematic': 'asc' },
          { 'slo.id': 'asc' },
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
        scan: {
          status: scanTask?.state.isDone === false ? 'pending' : 'completed',
        },
        total,
        searchAfter: nextSearchAfter,
      };
    } catch (err) {
      if (err.meta && err.meta.statusCode === 404) {
        return {
          scan: { status: scanTask?.state.isDone === false ? 'pending' : 'completed' },
          results: [],
          total: 0,
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
