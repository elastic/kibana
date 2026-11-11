/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { forbidden, notFound } from '@hapi/boom';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { parse } from 'yaml';
import { generateWorkflowYaml } from '../../lib/automations/generate_workflow_yaml';
import { runAutomationRoute } from './run_automation';
import {
  createRouteContext,
  createServiceAccountService,
  createWorkflowService,
} from './test_helpers';

const { handler, params } = runAutomationRoute['POST /internal/nightshift/automations/{id}/run'];
const soClient = { get: jest.fn() };
const getWorkflow = jest.fn();
const updateWorkflow = jest.fn();
const runWorkflow = jest.fn();
const getWorkflowsManagement = jest.fn();
let serviceAccountService = createServiceAccountService();
const automation = {
  name: 'Health review',
  automationType: 'custom' as const,
  isEnabled: true,
  workflowId: 'wf-1',
  trigger: { rows: [{ kind: 'schedule' as const, schedulePreset: 'hourly' as const }] },
  execution: { promptTemplate: 'Review health.' },
  completions: [],
  runtime: { dailyDispatchLimit: 1 },
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
};
const yaml = generateWorkflowYaml({
  automationId: 'a1',
  automation,
  serviceAccountId: 'kibana/nightshift_automations',
});
const workflow = { id: 'wf-1', enabled: true, valid: true, yaml, definition: parse(yaml) };
const call = async (spaceId = 'default') => {
  const context = createRouteContext();
  const { savedObjects } = await context.core;
  savedObjects.client.getCurrentNamespace.mockReturnValue(spaceId);
  return handler({
    request: httpServerMock.createKibanaRequest(),
    params: params.parse({ path: { id: 'a1' }, body: null }),
    getAutomationsSoClient: jest.fn().mockReturnValue(soClient),
    getWorkflowsManagement,
    getInvestigatorServiceAccountService: () => serviceAccountService,
    getAutomationWorkflowService: createWorkflowService,
    context,
  } as never);
};

beforeEach(() => {
  jest.resetAllMocks();
  serviceAccountService = createServiceAccountService();
  soClient.get.mockResolvedValue({ attributes: automation });
  getWorkflow.mockResolvedValue(workflow);
  runWorkflow.mockResolvedValue('exec-1');
  getWorkflowsManagement.mockReturnValue({
    management: { getWorkflow, updateWorkflow, runWorkflow },
  });
});

it('runs the enabled saved workflow without rewriting it', async () => {
  expect(await call('operations')).toEqual({ workflowExecutionId: 'exec-1' });
  const [model, spaceId, inputs, , source] = runWorkflow.mock.calls[0];
  expect(model.definition).toEqual(workflow.definition);
  expect({ spaceId, inputs, source }).toEqual({
    spaceId: 'operations',
    inputs: {},
    source: 'nightshift-automation-manual',
  });
  expect(getWorkflow).toHaveBeenCalledWith('wf-1', 'operations', expect.anything());
  expect(updateWorkflow).not.toHaveBeenCalled();
});

it('rejects a disabled automation even if its backing workflow is enabled', async () => {
  soClient.get.mockResolvedValue({ attributes: { ...automation, isEnabled: false } });
  await expect(call()).rejects.toMatchObject({
    output: { statusCode: 400 },
    message: 'Enable the automation before running it manually.',
  });
  expect(getWorkflow).not.toHaveBeenCalled();
  expect(runWorkflow).not.toHaveBeenCalled();
  expect(updateWorkflow).not.toHaveBeenCalled();
});

it.each([[], [{ kind: 'alert' }], [{ kind: 'slack' }], [{ kind: 'schedule' }, { kind: 'alert' }]])(
  'rejects unsupported triggers without executing: %j',
  async (...rows) => {
    soClient.get.mockResolvedValue({ attributes: { ...automation, trigger: { rows } } });
    await expect(call()).rejects.toMatchObject({ output: { statusCode: 400 } });
    expect(runWorkflow).not.toHaveBeenCalled();
    expect(updateWorkflow).not.toHaveBeenCalled();
  }
);

it.each([
  { savedWorkflow: null, message: 'If it was deleted, use Repair' },
  { savedWorkflow: { ...workflow, valid: false }, message: 'Save the automation' },
  { savedWorkflow: { ...workflow, enabled: false }, message: 'Repair and enable' },
  { savedWorkflow: { ...workflow, definition: null }, message: 'Save the automation' },
  {
    savedWorkflow: {
      ...workflow,
      definition: { ...workflow.definition, settings: { run_as: 'other-account' } },
    },
    message: 'Set up Nightshift service accounts and save',
  },
])(
  'rejects unusable workflows with actionable guidance without silently repairing them: %j',
  async ({ savedWorkflow, message }) => {
    getWorkflow.mockResolvedValue(savedWorkflow);
    await expect(call()).rejects.toMatchObject({
      output: { statusCode: 400 },
      message: expect.stringContaining(message),
    });
    expect(runWorkflow).not.toHaveBeenCalled();
    expect(updateWorkflow).not.toHaveBeenCalled();
  }
);

it('preserves a missing automation error from the current space', async () => {
  soClient.get.mockRejectedValue(notFound('Automation not found'));
  await expect(call('other-space')).rejects.toMatchObject({ output: { statusCode: 404 } });
  expect(getWorkflow).not.toHaveBeenCalled();
});

it('refuses callers without bound-workflow management permission', async () => {
  serviceAccountService.resolveAutomationRunAs.mockRejectedValue(
    forbidden('manage_security required')
  );
  await expect(call()).rejects.toMatchObject({ output: { statusCode: 403 } });
  expect(runWorkflow).not.toHaveBeenCalled();
  expect(updateWorkflow).not.toHaveBeenCalled();
});

it('reports unavailable Workflows', async () => {
  getWorkflowsManagement.mockReturnValue(undefined);
  await expect(call()).rejects.toMatchObject({ output: { statusCode: 503 } });
  expect(runWorkflow).not.toHaveBeenCalled();
});

it('rejects caller-supplied inputs and metadata', () => {
  expect(() =>
    params.parse({
      path: { id: 'a1' },
      body: { metadata: { triggeredBy: 'nightshift-automation-manual' } },
    })
  ).toThrow();
});

it('rejects a saved schedule without instructions before running it', async () => {
  soClient.get.mockResolvedValue({ attributes: { ...automation, execution: {} } });
  await expect(call()).rejects.toMatchObject({ output: { statusCode: 400 } });
  expect(runWorkflow).not.toHaveBeenCalled();
  expect(updateWorkflow).not.toHaveBeenCalled();
});
