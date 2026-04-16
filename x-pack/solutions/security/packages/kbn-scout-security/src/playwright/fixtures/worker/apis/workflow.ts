/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient, ScoutLogger, ScoutParallelWorkerFixtures } from '@kbn/scout';
import { measurePerformanceAsync } from '@kbn/scout';

export interface WorkflowApiService {
  createWorkflow: (params: { yaml: string }) => Promise<string>;
  deleteWorkflow: (workflowId: string) => Promise<void>;
}

export const getWorkflowApiService = ({
  kbnClient,
  log,
  scoutSpace,
}: {
  kbnClient: KbnClient;
  log: ScoutLogger;
  scoutSpace?: ScoutParallelWorkerFixtures['scoutSpace'];
}): WorkflowApiService => {
  const basePath = scoutSpace?.id ? `/s/${scoutSpace.id}` : '';

  return {
    createWorkflow: async ({ yaml }) => {
      return measurePerformanceAsync(log, 'security.workflow.createWorkflow', async () => {
        const response = await kbnClient.request<{ id: string }>({
          method: 'POST',
          path: `${basePath}/api/workflows/workflow`,
          body: { yaml },
          retries: 0,
        });
        return response.data.id;
      });
    },

    deleteWorkflow: async (workflowId: string) => {
      await measurePerformanceAsync(log, 'security.workflow.deleteWorkflow', async () => {
        await kbnClient.request({
          method: 'DELETE',
          path: `${basePath}/api/workflows`,
          body: { ids: [workflowId] },
          ignoreErrors: [404],
          retries: 0,
        });
      });
    },
  };
};
