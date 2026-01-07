/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getHealthDiagnoseParamsSchema,
  listHealthDiagnoseParamsSchema,
  postHealthDiagnoseParamsSchema,
  type GetHealthDiagnoseResponse,
  type HealthDiagnoseResultResponse,
  type ListHealthDiagnoseResponse,
  type PostHealthDiagnoseResponse,
} from '@kbn/slo-schema';
import { v7 } from 'uuid';
import { HEALTH_DATA_STREAM_NAME } from '../../services/health_diagnose/health_index_installer';
import {
  HEALTH_DIAGNOSE_TASK_TYPE,
  type HealthDiagnoseTaskParams,
  type HealthDiagnoseTaskState,
} from '../../services/tasks/health_diagnose_task/health_diagnose_task';
import type { HealthDocument } from '../../services/tasks/health_diagnose_task/types';
import { createSloServerRoute } from '../create_slo_server_route';
import { assertPlatinumLicense } from './utils/assert_platinum_license';

export const postHealthDiagnoseRoute = createSloServerRoute({
  endpoint: 'POST /internal/observability/slos/_health/diagnose',
  options: { access: 'internal' },
  security: {
    authz: {
      requiredPrivileges: ['slo_read'],
    },
  },
  params: postHealthDiagnoseParamsSchema,
  handler: async ({ request, params, plugins }): Promise<PostHealthDiagnoseResponse> => {
    await assertPlatinumLicense(plugins);
    const taskManager = await plugins.taskManager.start();

    const { force = false } = params.body ?? {};

    const recentTasks = await taskManager.fetch({
      sort: [{ 'task.scheduledAt': 'desc' }],
      query: {
        bool: {
          filter: [
            { range: { 'task.scheduledAt': { gte: 'now-1h' } } },
            { term: { 'task.taskType': HEALTH_DIAGNOSE_TASK_TYPE } },
          ],
        },
      },
    });

    if (recentTasks.docs.length > 0 && !force) {
      const recentTask = recentTasks.docs[0];
      const state = recentTask.state as HealthDiagnoseTaskState;
      const taskParams = recentTask.params as HealthDiagnoseTaskParams;

      if (state.isDone) {
        return {
          taskId: taskParams.taskId,
          scheduledAt: recentTask.scheduledAt.toISOString(),
          status: 'done',
          processed: recentTask.state.processed,
          problematic: recentTask.state.problematic,
          error: recentTask.state.error,
        };
      }

      return {
        taskId: taskParams.taskId,
        scheduledAt: recentTask.scheduledAt.toISOString(),
        status: 'pending',
      };
    }

    const taskId = v7();
    const scheduledAt = new Date(Date.now() + 3 * 1000);
    await taskManager.ensureScheduled(
      {
        id: taskId,
        taskType: HEALTH_DIAGNOSE_TASK_TYPE,
        scope: ['observability', 'slo'],
        state: { isDone: false },
        runAt: scheduledAt,
        params: { taskId } satisfies HealthDiagnoseTaskParams,
      },
      { request }
    );

    return {
      taskId,
      scheduledAt: scheduledAt.toISOString(),
      status: 'scheduled',
    };
  },
});

export const getHealthDiagnoseRoute = createSloServerRoute({
  endpoint: 'GET /internal/observability/slos/_health/diagnose/{taskId}',
  options: { access: 'internal' },
  security: {
    authz: {
      requiredPrivileges: ['slo_read'],
    },
  },
  params: getHealthDiagnoseParamsSchema,
  handler: async ({
    request,
    params,
    plugins,
    getScopedClients,
    logger,
  }): Promise<GetHealthDiagnoseResponse> => {
    await assertPlatinumLicense(plugins);

    const { scopedClusterClient } = await getScopedClients({ request, logger });
    const esClient = scopedClusterClient.asCurrentUser;

    const { taskId } = params.path;
    const { size = 100, problematic } = params.query ?? {};

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

    const result = await esClient.search<HealthDocument>({
      index: HEALTH_DATA_STREAM_NAME,
      size,
      query: {
        bool: {
          filter: [
            { term: { taskId } },
            ...(problematic ? [{ term: { isProblematic: problematic } }] : []),
          ],
        },
      },
      sort: [
        { '@timestamp': 'desc' },
        { taskId: 'desc' },
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
      .filter((source): source is HealthDiagnoseResultResponse => source !== undefined);

    return {
      results,
      total,
      searchAfter: nextSearchAfter,
    };
  },
});

export const listHealthDiagnoseRoute = createSloServerRoute({
  endpoint: 'GET /internal/observability/slos/_health/diagnose',
  options: { access: 'internal' },
  security: {
    authz: {
      requiredPrivileges: ['slo_read'],
    },
  },
  params: listHealthDiagnoseParamsSchema,
  handler: async ({
    request,
    params,
    plugins,
    getScopedClients,
    logger,
  }): Promise<ListHealthDiagnoseResponse> => {
    await assertPlatinumLicense(plugins);

    const { scopedClusterClient } = await getScopedClients({ request, logger });
    const esClient = scopedClusterClient.asCurrentUser;

    const { size = 10, searchAfter } = params?.query ?? {};

    const result = await esClient.search({
      index: HEALTH_DATA_STREAM_NAME,
      size: 0,
      aggs: {
        tasks: {
          composite: {
            size,
            sources: [
              {
                taskId: {
                  terms: {
                    order: 'desc',
                    field: 'taskId',
                  },
                },
              },
            ],
            after: searchAfter ? { taskId: searchAfter } : undefined,
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

    interface TaskBucket {
      key: { taskId: string };
      doc_count: number;
      latest_timestamp: { value: number; value_as_string: string };
      problematic_count: { doc_count: number };
    }

    const aggs = result.aggregations as
      | {
          tasks: {
            buckets: TaskBucket[];
            after_key?: { taskId: string };
          };
        }
      | undefined;

    const buckets = aggs?.tasks.buckets ?? [];
    const afterKey = aggs?.tasks.after_key;

    const tasks = buckets.map((bucket) => ({
      taskId: bucket.key.taskId,
      latestTimestamp: bucket.latest_timestamp.value_as_string,
      total: bucket.doc_count,
      problematic: bucket.problematic_count.doc_count,
    }));

    return {
      tasks,
      searchAfter: afterKey ? afterKey.taskId : undefined,
    };
  },
});

export const healthDiagnoseRoutes = {
  ...postHealthDiagnoseRoute,
  ...listHealthDiagnoseRoute,
  ...getHealthDiagnoseRoute,
};
