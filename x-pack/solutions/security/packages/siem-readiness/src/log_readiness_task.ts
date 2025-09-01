/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { SiemReadinessTask } from './types';
import { SIEM_READINESS_INDEX } from './constants';

/**
 * Logs a SIEM readiness task to Elasticsearch
 * @param esClient - Elasticsearch client instance from Kibana core
 * @param task - The task object to log
 * @returns Promise that resolves when the task is logged
 */
export async function logReadinessTask(
  esClient: ElasticsearchClient,
  task: SiemReadinessTask
): Promise<void> {
  try {
    await esClient.index({
      index: SIEM_READINESS_INDEX,
      body: {
        ...task,
        '@timestamp': new Date().toISOString(),
      },
      id: task.task_id,
    });
  } catch (error) {
    throw new Error(`Failed to log SIEM readiness task: ${error}`);
  }
}
