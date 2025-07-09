/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@elastic/elasticsearch';
import { getActiveReindexingTaskId } from '@kbn/observability-ai-assistant-plugin/server/service/knowledge_base_service/reindex_knowledge_base';
import pRetry from 'p-retry';

export async function waitForIndexTaskToComplete(es: Client) {
  await pRetry(
    async () => {
      const taskId = await getActiveReindexingTaskId({ asInternalUser: es });
      if (!taskId) {
        throw new Error('Waiting for reindexing task to start');
      }
    },
    { retries: 50, factor: 1, minTimeout: 500 }
  );

  await pRetry(
    async () => {
      const taskId = await getActiveReindexingTaskId({ asInternalUser: es });
      if (taskId) {
        throw new Error('Waiting for reindexing task to complete');
      }
    },
    { retries: 10, factor: 1, minTimeout: 500 }
  );
}
