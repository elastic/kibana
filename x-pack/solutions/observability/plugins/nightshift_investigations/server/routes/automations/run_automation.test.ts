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
import { createRouteContext, createServiceAccountService } from './test_helpers';

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
  isEnabled: false,
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
const call = (spaceId = 'default') => {
  const context = createRouteContext();
  context.core.then(({ savedObjects }) =>
    savedObjects.client.getCurrentNamespace.mockReturnValue(spaceId)
  );
  return handler({
    request: httpServerMock.createKibanaRequest(),
    params: params.parse({ path: { id: 'a1' }, body: null }),
    getAutomationsSoClient: jest.fn().mockReturnValue(soClient),
    getWorkflowsManagement,
    getInvestigatorServiceAccountService: () => serviceAccountService,
    isUniversalAlertingAvailable: () => true,
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

it.each([true, false])(
  'runs the saved workflow for an automation with enabled=%s without rewriting it',
  async (isEnabled) => {
    soClient.get.mockResolvedValue({ attributes: { ...automation, isEnabled } });
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
  }
);

it('upgrades a disabled legacy workflow once and executes the reloaded saved definition', async () => {
  getWorkflow.mockResolvedValueOnce({
    ...workflow,
    enabled: false,
    definition: { ...workflow.definition, enabled: false, consts: undefined },
  });
  expect(await call()).toEqual({ workflowExecutionId: 'exec-1' });
  const [id, { yaml: upgradedYaml }] = updateWorkflow.mock.calls[0];
  const upgraded = parse(upgradedYaml);
  expect(id).toBe('wf-1');
  expect(upgraded.enabled).toBe(true);
  expect(upgraded.triggers).toEqual(workflow.definition.triggers);
  expect(upgraded.settings).toEqual(workflow.definition.settings);
  expect(runWorkflow.mock.calls[0][0].definition).toEqual(workflow.definition);
  expect(automation.isEnabled).toBe(false);
  expect(getWorkflow).toHaveBeenCalledTimes(2);
});

it.each([[], [{ kind: 'alert' }], [{ kind: 'slack' }], [{ kind: 'schedule' }, { kind: 'alert' }]])(
  'rejects unsupported triggers without executing or upgrading: %j',
  async (...rows) => {
    soClient.get.mockResolvedValue({ attributes: { ...automation, trigger: { rows } } });
    await expect(call()).rejects.toMatchObject({ output: { statusCode: 400 } });
    expect(runWorkflow).not.toHaveBeenCalled();
    expect(updateWorkflow).not.toHaveBeenCalled();
  }
);

it.each([
  null,
  { ...workflow, valid: false },
  { ...workflow, enabled: false },
  { ...workflow, definition: null },
  { ...workflow, definition: { ...workflow.definition, settings: { run_as: 'other-account' } } },
])('rejects unusable workflows without silently repairing them: %j', async (savedWorkflow) => {
  getWorkflow.mockResolvedValue(savedWorkflow);
  await expect(call()).rejects.toMatchObject({ output: { statusCode: 400 } });
  expect(runWorkflow).not.toHaveBeenCalled();
  expect(updateWorkflow).not.toHaveBeenCalled();
});

it('does not run when the legacy upgrade fails', async () => {
  getWorkflow.mockResolvedValue({
    ...workflow,
    definition: { ...workflow.definition, consts: undefined },
  });
  updateWorkflow.mockRejectedValue(new Error('Upgrade failed'));
  await expect(call()).rejects.toThrow('Upgrade failed');
  expect(runWorkflow).not.toHaveBeenCalled();
});

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

it('rejects a saved schedule without instructions before upgrading or running it', async () => {
  soClient.get.mockResolvedValue({ attributes: { ...automation, execution: {} } });
  await expect(call()).rejects.toMatchObject({ output: { statusCode: 400 } });
  expect(runWorkflow).not.toHaveBeenCalled();
  expect(updateWorkflow).not.toHaveBeenCalled();
});
