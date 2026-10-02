/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { createAutomationRoute } from './create_automation';
import { createRouteContext } from './test_helpers';

const { handler, params } = createAutomationRoute['POST /internal/nightshift/automations'];

const soClient = { create: jest.fn(), update: jest.fn(), delete: jest.fn() };
const getAutomationsSoClient = jest.fn().mockReturnValue(soClient);
const createWorkflow = jest.fn();
const getWorkflowsManagement = jest.fn().mockReturnValue({
  management: { createWorkflow, deleteWorkflows: jest.fn() },
});

const body = {
  name: 'Triage',
  trigger: { rows: [{ kind: 'alert' as const }] },
  execution: {},
  completion: {},
  runtime: { dailyDispatchLimit: 20 },
};

const call = (overrides: Record<string, unknown> = {}) =>
  handler({
    request: httpServerMock.createKibanaRequest(),
    params: { body: { ...body, ...overrides } },
    getAutomationsSoClient,
    getWorkflowsManagement,
    context: createRouteContext(),
  } as never);

beforeEach(() => {
  jest.clearAllMocks();
  soClient.create.mockResolvedValue({ id: 'automation-1' });
  createWorkflow.mockResolvedValue({ id: 'workflow-1' });
});

it('creates a disabled automation by default', async () => {
  const result = await call();

  expect(soClient.create).toHaveBeenCalledWith(
    'nightshift-automation',
    expect.objectContaining({ name: 'Triage', isEnabled: false, automationType: 'custom' })
  );
  expect(soClient.update).toHaveBeenCalledWith('nightshift-automation', 'automation-1', {
    workflowId: 'workflow-1',
  });
  expect(result).toMatchObject({ id: 'automation-1', workflowId: 'workflow-1', isEnabled: false });
});

it('stores the current user as the author', async () => {
  await call();

  expect(soClient.create).toHaveBeenCalledWith(
    'nightshift-automation',
    expect.objectContaining({ author: 'alice' })
  );
});

it('stores tags and the requested enabled state', async () => {
  const result = await call({ tags: ['oncall'], isEnabled: true });

  expect(soClient.create).toHaveBeenCalledWith(
    'nightshift-automation',
    expect.objectContaining({ tags: ['oncall'], isEnabled: true })
  );
  expect(result).toMatchObject({ tags: ['oncall'], isEnabled: true });
});

it('removes the automation when the workflow cannot be created', async () => {
  createWorkflow.mockRejectedValue(new Error('invalid yaml'));

  await expect(call()).rejects.toThrow('Failed to create backing workflow: invalid yaml');
  expect(soClient.delete).toHaveBeenCalledWith('nightshift-automation', 'automation-1');
});

describe('request validation', () => {
  const slackRow = {
    kind: 'slack',
    event: 'mention',
    channels: ['#oncall'],
    users: ['U123'],
    messageFilter: 'outage',
  };
  const parseRows = (rows: unknown[]) => params.parse({ body: { ...body, trigger: { rows } } });

  it('accepts Slack trigger rows and keeps their fields', () => {
    expect(parseRows([slackRow]).body.trigger.rows).toEqual([slackRow]);
  });

  it('rejects an unknown Slack event', () => {
    expect(() => parseRows([{ ...slackRow, event: 'reaction' }])).toThrow();
  });
});
