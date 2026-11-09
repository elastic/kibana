/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { httpServerMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { deleteAutomationRoute } from './delete_automation';
import { createRouteContext, createServiceAccountService } from './test_helpers';

const { handler } = deleteAutomationRoute['DELETE /internal/nightshift/automations/{id}'];
const soClient = savedObjectsClientMock.create();
const deleteWorkflows = jest.fn();
const getWorkflow = jest.fn();
const serviceAccountService = createServiceAccountService();
const call = () =>
  handler({
    request: httpServerMock.createKibanaRequest(),
    params: { path: { id: 'auto-1' } },
    getAutomationsSoClient: () => soClient,
    getWorkflowsManagement: () => ({ management: { deleteWorkflows, getWorkflow } }),
    getInvestigatorServiceAccountService: () => serviceAccountService,
    context: createRouteContext(),
  } as never);

beforeEach(() => {
  jest.clearAllMocks();
  soClient.get.mockResolvedValue({
    id: 'auto-1',
    type: 'nightshift-automation',
    references: [],
    attributes: { workflowId: 'wf-1' },
  });
  soClient.delete.mockResolvedValue({});
  getWorkflow.mockResolvedValue({ id: 'wf-1', definition: { settings: {} } });
});

it('deletes the backing workflow and daily budget with the automation', async () => {
  expect(await call()).toEqual({});
  expect(deleteWorkflows).toHaveBeenCalledWith(['wf-1'], 'default', expect.any(Object));
  expect(soClient.delete.mock.calls.map(([type, id]) => [type, id])).toEqual([
    ['nightshift-automation-budget', 'auto-1'],
    ['nightshift-automation', 'auto-1'],
  ]);
});

it('also deletes automations which have never dispatched', async () => {
  soClient.delete.mockRejectedValueOnce(
    SavedObjectsErrorHelpers.createGenericNotFoundError('nightshift-automation-budget', 'auto-1')
  );
  await expect(call()).resolves.toEqual({});
  expect(soClient.delete).toHaveBeenCalledWith('nightshift-automation', 'auto-1');
});

it('still deletes the automation when deleting its unbound workflow fails', async () => {
  deleteWorkflows.mockRejectedValueOnce(new Error('Workflow unavailable'));
  await expect(call()).resolves.toEqual({});
  expect(soClient.delete).toHaveBeenCalledWith('nightshift-automation', 'auto-1');
});

it('keeps the automation when deleting its workflow bound to a service account fails', async () => {
  const error = new Error('Forbidden');
  getWorkflow.mockResolvedValue({
    id: 'wf-1',
    definition: { settings: { run_as: 'kibana/nightshift_automations' } },
  });
  deleteWorkflows.mockRejectedValueOnce(error);
  await expect(call()).rejects.toBe(error);
  expect(soClient.delete).not.toHaveBeenCalled();
});

it('refuses to delete an automation bound to a service account without manage_security', async () => {
  getWorkflow.mockResolvedValue({
    id: 'wf-1',
    definition: { settings: { run_as: 'kibana/nightshift_automations' } },
  });
  serviceAccountService.assertCanModifyBoundAutomations.mockRejectedValueOnce(
    new Error('manage_security')
  );
  await expect(call()).rejects.toThrow('manage_security');
  expect(deleteWorkflows).not.toHaveBeenCalled();
  expect(soClient.delete).not.toHaveBeenCalled();
});

it.each([
  ['the workflow lookup fails', () => getWorkflow.mockRejectedValue(new Error('unavailable'))],
  ['the workflow cannot be read', () => getWorkflow.mockResolvedValue(null)],
])('keeps the automation when deleting its workflow fails and %s', async (_, arrangeLookup) => {
  arrangeLookup();
  const error = new Error('Forbidden');
  deleteWorkflows.mockRejectedValueOnce(error);
  await expect(call()).rejects.toBe(error);
  expect(soClient.delete).not.toHaveBeenCalled();
});

it('propagates budget cleanup failures', async () => {
  const error = new Error('Storage unavailable');
  soClient.delete.mockRejectedValueOnce(error);
  await expect(call()).rejects.toBe(error);
});
