/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { parse } from 'yaml';
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
  completions: [],
  runtime: { dailyDispatchLimit: 20 },
};

const call = (overrides: Record<string, unknown> = {}) =>
  handler({
    request: httpServerMock.createKibanaRequest(),
    params: params.parse({ body: { ...body, ...overrides } }),
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

it('turns the UI channel action into an investigation lifecycle destination', async () => {
  const completion = { action: 'post_to_slack', targetMode: 'channel', destination: '#oncall' };
  const result = await call({ completions: [completion] });
  expect(result.completions).toEqual([completion]);
  const workflow = parse(createWorkflow.mock.calls[0][0].yaml);
  expect(workflow.steps[0].with.notificationDestinations).toEqual([
    {
      type: 'slack',
      connector_id: 'elastic-apps-slack',
      params: { channel: '#oncall' },
      automation_id: 'automation-1',
      automation_name: 'Triage',
    },
  ]);
});

it('removes the automation when the workflow cannot be created', async () => {
  createWorkflow.mockRejectedValue(new Error('invalid yaml'));

  await expect(call()).rejects.toThrow('Failed to create backing workflow: invalid yaml');
  expect(soClient.delete).toHaveBeenCalledWith('nightshift-automation', 'automation-1');
});

describe('request validation', () => {
  const slackRow = {
    kind: 'slack',
    event: 'message',
    channels: ['#oncall'],
    users: ['U123'],
    messageFilter: 'outage',
  };
  const parseRows = (rows: unknown[]) => params.parse({ body: { ...body, trigger: { rows } } });

  it('accepts Slack trigger rows and keeps their fields', () => {
    expect(parseRows([slackRow]).body.trigger.rows).toEqual([slackRow]);
  });

  it('rejects Slack events other than message', () => {
    expect(() => parseRows([{ ...slackRow, event: 'mention' }])).toThrow();
  });

  it('rejects oversized instructions during request parsing before writes', () => {
    expect(() =>
      params.parse({
        body: {
          ...body,
          trigger: { rows: [dailySchedule] },
          execution: { promptTemplate: 'x'.repeat(5001) },
        },
      })
    ).toThrow('Too big');
    expect(soClient.create).not.toHaveBeenCalled();
    expect(createWorkflow).not.toHaveBeenCalled();
  });

  it.each([
    ['no filters', {}],
    ['empty filter lists', { channels: [], users: [], bots: [] }],
    ['blank filter values', { channels: [' '], users: [''], messageFilter: '  ' }],
  ])('rejects a Slack trigger row with %s', (_name, filters) => {
    expect(() => parseRows([{ kind: 'slack', event: 'message', ...filters }])).toThrow(
      'at least one of channels, users, bots or messageFilter'
    );
  });

  it.each([
    ['channels', { channels: ['C123'] }],
    ['users', { users: ['U123'] }],
    ['bots', { bots: ['PagerDuty'] }],
    ['messageFilter', { messageFilter: 'outage' }],
  ])('accepts a Slack trigger row with only %s', (_name, filters) => {
    const row = { kind: 'slack', event: 'message', ...filters };
    expect(parseRows([row]).body.trigger.rows).toEqual([row]);
  });

  it.each([
    { kind: 'schedule', schedulePreset: 'hourly', hourWindow: { start: 9, end: 17 } },
    { kind: 'schedule', schedulePreset: 'daily', time: '09:30', timezone: 'Europe/Berlin' },
    { kind: 'schedule', schedulePreset: 'weekly', time: '09:30', daysOfWeek: [0, 1, 5] },
  ])('keeps structured schedule fields: %j', (row) => {
    expect(parseRows([row]).body.trigger.rows).toEqual([row]);
  });

  it.each([
    { kind: 'schedule', schedulePreset: 'daily', time: '25:60' },
    { kind: 'schedule', schedulePreset: 'custom' },
    { kind: 'schedule', schedulePreset: 'weekly', time: '09:00', daysOfWeek: [] },
    { kind: 'schedule', schedulePreset: 'hourly', hourWindow: { start: 17, end: 9 } },
  ])('rejects invalid structured schedules before writes: %j', (row) => {
    expect(() => parseRows([row])).toThrow();
    expect(soClient.create).not.toHaveBeenCalled();
    expect(createWorkflow).not.toHaveBeenCalled();
  });
});

const dailySchedule = {
  kind: 'schedule',
  schedulePreset: 'daily',
  time: '09:00',
  timezone: 'Europe/Berlin',
};

it('creates a scheduled workflow with instructions', async () => {
  await call({
    trigger: { rows: [dailySchedule] },
    execution: { promptTemplate: 'Review errors over the last hour.' },
  });
  const workflow = parse(createWorkflow.mock.calls[0][0].yaml);
  expect(workflow.triggers[0].type).toBe('scheduled');
  expect(workflow.steps[0].with.subject_type).toBe('manual');
  expect(soClient.create.mock.calls[0][1].trigger.rows).toEqual([dailySchedule]);
});

it.each([
  { trigger: { rows: [dailySchedule] }, execution: {} },
  { trigger: { rows: [dailySchedule] }, execution: { promptTemplate: '   ' } },
  { trigger: { rows: [dailySchedule, dailySchedule] } },
  { trigger: { rows: [{ ...dailySchedule, timezone: 'Not/AZone' }] } },
])('rejects unusable scheduled configuration before writes: %j', async (overrides) => {
  await expect(
    call({ execution: { promptTemplate: 'Review health.' }, ...overrides })
  ).rejects.toMatchObject({ output: { statusCode: 400 } });
  expect(soClient.create).not.toHaveBeenCalled();
  expect(createWorkflow).not.toHaveBeenCalled();
});
