/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getHealthDiagnoseParamsSchema,
  postHealthDiagnoseParamsSchema,
  type GetHealthDiagnoseResponse,
  type HealthDiagnoseResultResponse,
  type PostHealthDiagnoseResponse,
} from '@kbn/slo-schema';
import { v4 } from 'uuid';
import { HEALTH_DATA_STREAM_NAME } from '../../services/health_diagnose/health_index_installer';
import {
  HEALTH_DIAGNOSE_TASK_TYPE,
  type HealthDiagnoseTaskParams,
  type HealthDiagnoseTaskState,
} from '../../services/tasks/health_diagnose_task/health_diagnose_task';
import { createSloServerRoute } from '../create_slo_server_route';
import { assertPlatinumLicense } from './utils/assert_platinum_license';

export const postHealthDiagnoseRoute = createSloServerRoute({
  endpoint: 'POST /internal/observability/slos/poc/_health/diagnose',
  options: { access: 'internal' },
  security: {
    authz: {
      requiredPrivileges: ['slo_read'],
    },
  },
  params: postHealthDiagnoseParamsSchema,
  handler: async ({ request, params, plugins }): Promise<PostHealthDiagnoseResponse> => {
    await assertPlatinumLicense(plugins);
    const { force = false } = params.body ?? {};

    const taskManager = await plugins.taskManager.start();

    const existingTasks = await taskManager.fetch({
      query: {
        bool: {
          must: [
            { term: { 'task.taskType': HEALTH_DIAGNOSE_TASK_TYPE } },
            { terms: { 'task.status': ['running', 'idle'] } },
          ],
        },
      },
    });

    if (existingTasks.docs.length > 0 && !force) {
      const existingTask = existingTasks.docs[0];
      const state = existingTask.state as HealthDiagnoseTaskState;
      const taskParams = existingTask.params as HealthDiagnoseTaskParams;

      if (state.isDone) {
        return {
          taskId: taskParams.taskId,
          status: 'done',
          processed: state.processed,
          problematic: state.problematic,
          error: state.error,
        };
      }

      return {
        taskId: taskParams.taskId,
        status: 'pending',
      };
    }

    const taskId = v4();
    await taskManager.ensureScheduled(
      {
        id: `${HEALTH_DIAGNOSE_TASK_TYPE}:${taskId}`,
        taskType: HEALTH_DIAGNOSE_TASK_TYPE,
        scope: ['observability', 'slo'],
        state: { isDone: false },
        runAt: new Date(Date.now() + 3 * 1000), // Run in 3 seconds
        params: { taskId } satisfies HealthDiagnoseTaskParams,
      },
      { request }
    );

    return {
      taskId,
      status: 'scheduled',
    };
  },
});

export const getHealthDiagnoseRoute = createSloServerRoute({
  endpoint: 'GET /internal/observability/slos/poc/_health/diagnose/{taskId}',
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

    const result = await esClient.search<HealthDiagnoseResultResponse>({
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
        { taskId: 'asc' },
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

export const healthDiagnoseRoutes = {
  ...postHealthDiagnoseRoute,
  ...getHealthDiagnoseRoute,
};
