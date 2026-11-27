/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { getAutomationsLastRunsRoute } from './get_automations_last_runs';
import { createRouteContext } from './test_helpers';

const { handler } = getAutomationsLastRunsRoute['GET /internal/nightshift/automations/last_runs'];

describe('get automations last runs', () => {
  it('requests every linked workflow in one search and maps readable starts back to automations', async () => {
    const startedAt = '2026-11-10T10:00:00.000Z';
    const linkedAutomations = Array.from({ length: 110 }, (_, index) => ({
      id: `automation-${index}`,
      attributes: { workflowId: `workflow-${index}` },
    }));
    const automations = [...linkedAutomations, { id: 'unlinked' }];
    const find = jest.fn().mockResolvedValue({ saved_objects: automations });
    const searchExecutionsView = jest.fn().mockResolvedValue({
      results: [{ workflowId: 'workflow-109', startedAt }],
    });
    const request = httpServerMock.createKibanaRequest();

    const result = await handler({
      request,
      params: {},
      getAutomationsSoClient: () => ({ find }),
      getWorkflowsManagement: () => ({ management: { searchExecutionsView } }),
      context: createRouteContext(),
    } as never);

    expect(result).toEqual({ lastRuns: { 'automation-109': startedAt } });
    expect(searchExecutionsView).toHaveBeenCalledTimes(1);
    expect(searchExecutionsView).toHaveBeenCalledWith(
      {
        request,
        size: linkedAutomations.length,
        sortField: 'startedAt',
        sortOrder: 'desc',
        collapse: 'workflowId',
        includeManagedExecutions: true,
        query: {
          bool: {
            filter: [
              {
                terms: {
                  workflowId: linkedAutomations.map(({ attributes }) => attributes.workflowId),
                },
              },
              { exists: { field: 'startedAt' } },
            ],
          },
        },
      },
      'default'
    );
  });

  it('returns service unavailable when workflow history cannot be queried', async () => {
    await expect(
      handler({
        getWorkflowsManagement: () => undefined,
      } as never)
    ).rejects.toMatchObject({ output: { statusCode: 503 } });
  });
});
