/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { listAutomationsRoute } from './list_automations';
import { getAutomationRoute } from './get_automation';
import { createRouteContext } from './test_helpers';

const getWorkflow = jest.fn();
const getWorkflowsManagement = jest.fn().mockReturnValue({ management: { getWorkflow } });
const savedObject = (id: string, workflowId?: string) => ({
  id,
  created_by: 'so-author',
  attributes: { name: id, ...(workflowId ? { workflowId } : {}) },
});

beforeEach(() => jest.clearAllMocks());

describe('list automations', () => {
  const { handler } = listAutomationsRoute['GET /internal/nightshift/automations'];

  it('reads the author from the backing workflow, then the saved object', async () => {
    const find = jest.fn().mockResolvedValue({
      saved_objects: [savedObject('with-workflow', 'workflow-1'), savedObject('without-workflow')],
      total: 2,
    });
    getWorkflow.mockResolvedValue({ createdBy: 'workflow-author' });

    const result = await handler({
      request: httpServerMock.createKibanaRequest(),
      params: {},
      getAutomationsSoClient: jest.fn().mockReturnValue({ find }),
      getWorkflowsManagement,
      context: createRouteContext(),
    } as never);

    expect(getWorkflow).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      automations: [
        expect.objectContaining({ id: 'with-workflow', author: { username: 'workflow-author' } }),
        expect.objectContaining({ id: 'without-workflow', author: { username: 'so-author' } }),
      ],
      total: 2,
    });
  });
});

describe('get automation', () => {
  const { handler } = getAutomationRoute['GET /internal/nightshift/automations/{id}'];

  it('returns the automation with its author', async () => {
    getWorkflow.mockResolvedValue(null);

    const result = await handler({
      request: httpServerMock.createKibanaRequest(),
      params: { path: { id: 'automation-1' } },
      getAutomationsSoClient: jest
        .fn()
        .mockReturnValue({ get: jest.fn().mockResolvedValue(savedObject('automation-1', 'wf')) }),
      getWorkflowsManagement,
      context: createRouteContext(),
    } as never);

    expect(result).toMatchObject({ id: 'automation-1', author: { username: 'so-author' } });
  });
});
