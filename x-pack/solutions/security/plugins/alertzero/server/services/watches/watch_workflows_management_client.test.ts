/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { ExecutionStatus } from '@kbn/workflows';
import { ALERTZERO_ACTION_WORKFLOW_IDS } from '@kbn/workflows/managed';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { WatchWorkflowsManagementClientImpl } from './watch_workflows_management_client';

describe('WatchWorkflowsManagementClientImpl', () => {
  it('searches failed AlertZero managed executions from the last 24 hours', async () => {
    const searchExecutionsView = jest.fn().mockResolvedValue({ results: [], total: 0 });
    const client = new WatchWorkflowsManagementClientImpl({
      searchExecutionsView,
    } as unknown as NonNullable<WorkflowsServerPluginSetup['management']>);
    const request = httpServerMock.createKibanaRequest();

    await client.searchFailedManagedExecutions({ page: 2, size: 100 }, 'other-space', request);

    expect(searchExecutionsView).toHaveBeenCalledWith(
      {
        request,
        statuses: [ExecutionStatus.FAILED],
        finishedAfter: 'now-24h',
        includeManagedExecutions: true,
        query: {
          bool: {
            filter: [{ term: { managedBy: 'alertzero' } }],
            must_not: [{ terms: { originManagedWorkflowId: [...ALERTZERO_ACTION_WORKFLOW_IDS] } }],
          },
        },
        sortField: 'finishedAt',
        sortOrder: 'desc',
        page: 2,
        size: 100,
      },
      'other-space'
    );
  });
});
