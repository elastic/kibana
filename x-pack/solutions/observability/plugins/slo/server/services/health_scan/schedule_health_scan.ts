/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { PostHealthScanResponse } from '@kbn/slo-schema';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import { v7 } from 'uuid';
import {
  HEALTH_SCAN_TASK_TYPE,
  type HealthScanTaskParams,
  type HealthScanTaskState,
} from '../tasks/health_scan_task/health_scan_task';

interface Dependencies {
  taskManager: TaskManagerStartContract;
  request: KibanaRequest;
}

interface Params {
  force?: boolean;
}

export async function scheduleHealthScan(
  params: Params,
  { taskManager, request }: Dependencies
): Promise<PostHealthScanResponse> {
  const { force = false } = params;

  if (!force) {
    const recentTasks = await taskManager.fetch({
      sort: [{ 'task.scheduledAt': 'desc' }],
      size: 1,
      query: {
        bool: {
          filter: [
            { range: { 'task.scheduledAt': { gte: 'now-1h' } } },
            { term: { 'task.taskType': HEALTH_SCAN_TASK_TYPE } },
          ],
        },
      },
    });

    if (recentTasks.docs.length > 0) {
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
}
