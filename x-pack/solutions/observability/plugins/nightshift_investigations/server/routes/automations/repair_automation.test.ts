/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { conflict, forbidden, serverUnavailable } from '@hapi/boom';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { WorkflowNotFoundError } from '@kbn/workflows/common/errors';
import { parse } from 'yaml';
import { repairAutomationRoute } from './repair_automation';
import { getAutomationRoute } from './get_automation';
import { createRouteContext, createServiceAccountService } from './test_helpers';

const repair = repairAutomationRoute['POST /internal/nightshift/automations/{id}/repair'];
const detail = getAutomationRoute['GET /internal/nightshift/automations/{id}'];
const attributes = {
  name: 'Health check',
  automationType: 'custom',
  isEnabled: true,
  workflowId: 'old',
  trigger: { rows: [{ kind: 'schedule', schedulePreset: 'hourly' }] },
  execution: { promptTemplate: 'Review health.' },
  completions: [],
  runtime: { dailyDispatchLimit: 3 },
  createdAt: '2026-11-01T00:00:00Z',
  updatedAt: '2026-11-01T00:00:00Z',
};
const soClient = { get: jest.fn(), update: jest.fn() };
const assertWorkflowAccess = jest.fn();
const createWorkflow = jest.fn();
const deleteWorkflows = jest.fn();
const logger = loggingSystemMock.createLogger();
let serviceAccountService = createServiceAccountService();
const resources = () => ({
  request: httpServerMock.createKibanaRequest(),
  getAutomationsSoClient: () => soClient,
  getWorkflowsManagement: () => ({
    management: { assertWorkflowAccess, createWorkflow, deleteWorkflows },
  }),
  getInvestigatorServiceAccountService: () => serviceAccountService,
  isUniversalAlertingAvailable: () => true,
  context: createRouteContext(),
  logger,
});
const callRepair = () =>
  repair.handler({
    ...resources(),
    params: repair.params.parse({ path: { id: 'automation' }, body: null }),
  } as never);
const callDetail = () =>
  detail.handler({
    ...resources(),
    params: detail.params.parse({ path: { id: 'automation' } }),
  } as never);

beforeEach(() => {
  jest.resetAllMocks();
  serviceAccountService = createServiceAccountService();
  soClient.get.mockResolvedValue({ id: 'automation', attributes, version: 'v1' });
  assertWorkflowAccess.mockRejectedValue(new WorkflowNotFoundError('old'));
  createWorkflow.mockResolvedValue({ id: 'new' });
  deleteWorkflows.mockResolvedValue({ failures: [] });
});

it.each([true, false])(
  'reports missing=%s only from a verified workflow lookup',
  async (missing) => {
    if (!missing) assertWorkflowAccess.mockResolvedValue(undefined);
    expect(await callDetail()).toMatchObject({ id: 'automation', isWorkflowMissing: missing });
    expect(soClient.update).not.toHaveBeenCalled();
    expect(createWorkflow).not.toHaveBeenCalled();
  }
);

it('recreates a deleted workflow disabled and links it with the saved version', async () => {
  const result = await callRepair();
  const generated = parse(createWorkflow.mock.calls[0][0].yaml);
  expect(generated.enabled).toBe(false);
  expect(generated.settings.run_as).toBe('kibana/nightshift_automations');
  expect(JSON.stringify(generated.steps)).toContain('automation');
  expect(soClient.update).toHaveBeenCalledWith(
    'nightshift-automation',
    'automation',
    { workflowId: 'new', isEnabled: false, updatedAt: expect.any(String) },
    { version: 'v1' }
  );
  expect(result).toMatchObject({
    id: 'automation',
    workflowId: 'new',
    isEnabled: false,
    execution: attributes.execution,
  });
});

it('returns an existing workflow unchanged without pausing or replacing it', async () => {
  assertWorkflowAccess.mockResolvedValue(undefined);
  expect(await callRepair()).toEqual({ id: 'automation', ...attributes });
  expect(createWorkflow).not.toHaveBeenCalled();
  expect(soClient.update).not.toHaveBeenCalled();
});

it.each([
  { error: Object.assign(new Error('Denied'), { statusCode: 403 }), status: 403 },
  { error: serverUnavailable('Workflows unavailable'), status: 503 },
])('does not treat lookup failure as deletion: $status', async ({ error, status }) => {
  assertWorkflowAccess.mockRejectedValue(error);
  await expect(callDetail()).rejects.toMatchObject({ output: { statusCode: status } });
  await expect(callRepair()).rejects.toThrow(error.message);
  expect(createWorkflow).not.toHaveBeenCalled();
  expect(soClient.update).not.toHaveBeenCalled();
});

it('requires bound-workflow authorization before creating a replacement', async () => {
  serviceAccountService.resolveAutomationRunAs.mockRejectedValue(
    forbidden('manage_security required')
  );
  await expect(callRepair()).rejects.toMatchObject({ output: { statusCode: 403 } });
  expect(createWorkflow).not.toHaveBeenCalled();
});

it('removes the disabled replacement if linking fails', async () => {
  const error = conflict('Changed');
  soClient.update.mockRejectedValue(error);
  await expect(callRepair()).rejects.toBe(error);
  expect(deleteWorkflows).toHaveBeenCalledWith(['new'], 'default', expect.anything());
});

it('logs a failed cleanup without replacing the linking error', async () => {
  const error = conflict('Changed');
  soClient.update.mockRejectedValue(error);
  deleteWorkflows.mockResolvedValue({ failures: [{ id: 'new' }] });
  await expect(callRepair()).rejects.toBe(error);
  expect(logger.warn).toHaveBeenCalledWith(
    expect.stringContaining('new for automation automation')
  );
});

it('links only one replacement when two repairs race, cleaning up the loser', async () => {
  let savedVersion = 'v1';
  let linkedId: string | undefined;
  createWorkflow
    .mockResolvedValueOnce({ id: 'replacement-a' })
    .mockResolvedValueOnce({ id: 'replacement-b' });
  soClient.update.mockImplementation(async (_type, _id, changes, { version }) => {
    if (version !== savedVersion) throw conflict('Changed');
    savedVersion = 'v2';
    linkedId = changes.workflowId;
  });
  const results = await Promise.allSettled([callRepair(), callRepair()]);
  expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
  expect(linkedId).toBe('replacement-a');
  expect(deleteWorkflows).toHaveBeenCalledWith(['replacement-b'], 'default', expect.anything());
});
