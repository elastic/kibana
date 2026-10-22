/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { parse } from 'yaml';
import { updateAutomationRoute } from './update_automation';
import { createRouteContext } from './test_helpers';

const { handler, params } = updateAutomationRoute['PUT /internal/nightshift/automations/{id}'];

const soClient = { get: jest.fn(), update: jest.fn() };
const getAutomationsSoClient = jest.fn().mockReturnValue(soClient);
const updateWorkflow = jest.fn();
const getWorkflowsManagement = jest.fn().mockReturnValue({ management: { updateWorkflow } });

const existing = {
  name: 'Triage',
  tags: ['oncall'],
  automationType: 'custom',
  isEnabled: true,
  workflowId: 'workflow-1',
  trigger: { rows: [{ kind: 'alert' }] },
  execution: { promptTemplate: 'Find the cause' },
  completions: [],
  runtime: { dailyDispatchLimit: 20 },
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
};

const call = (body: Record<string, unknown>) =>
  handler({
    request: httpServerMock.createKibanaRequest(),
    params: params.parse({ path: { id: 'automation-1' }, body }),
    getAutomationsSoClient,
    getWorkflowsManagement,
    context: createRouteContext(),
  } as never);

beforeEach(() => {
  jest.clearAllMocks();
  soClient.get.mockResolvedValue({ attributes: existing });
});

it('replaces tags and keeps the other attributes', async () => {
  const result = await call({ tags: ['triage'] });

  expect(updateWorkflow).toHaveBeenCalledWith(
    'workflow-1',
    { yaml: expect.any(String) },
    'default',
    expect.anything()
  );
  expect(soClient.update).toHaveBeenCalledWith(
    'nightshift-automation',
    'automation-1',
    expect.objectContaining({ tags: ['triage'], name: 'Triage', isEnabled: true }),
    { mergeAttributes: false }
  );
  expect(result).toMatchObject({ id: 'automation-1', tags: ['triage'] });
});

it('keeps the backing workflow link when saving', async () => {
  await call({ name: 'Triage renamed' });

  expect(soClient.update).toHaveBeenCalledWith(
    'nightshift-automation',
    'automation-1',
    expect.objectContaining({ workflowId: 'workflow-1', name: 'Triage renamed' }),
    { mergeAttributes: false }
  );
});

it('merges partial nested updates', async () => {
  const result = await call({ isEnabled: false, execution: { reasoningMode: 'investigate' } });

  expect(result).toMatchObject({
    tags: ['oncall'],
    isEnabled: false,
    execution: { promptTemplate: 'Find the cause', reasoningMode: 'investigate' },
  });
});

it('clears managed nested values when the request sends null', async () => {
  soClient.get.mockResolvedValue({
    attributes: {
      ...existing,
      completions: [
        {
          action: 'post_to_slack',
          targetMode: 'channel',
          destination: '#oncall',
          connectorId: 'saved-slack',
        },
      ],
    },
  });
  const result = await call({
    description: null,
    execution: { promptTemplate: null },
    completions: [],
    runtime: { dailyDispatchLimit: null },
  });

  expect(result).toMatchObject({
    execution: {},
    completions: [],
    runtime: {},
  });
  expect(result.description).toBeUndefined();
  expect(soClient.update).toHaveBeenCalledWith(
    'nightshift-automation',
    'automation-1',
    expect.objectContaining({ execution: {}, completions: [], runtime: {} }),
    { mergeAttributes: false }
  );
});

it('replaces a non-empty completions array', async () => {
  soClient.get.mockResolvedValue({
    attributes: {
      ...existing,
      completions: [{ action: 'post_to_slack', targetMode: 'channel', destination: '#oncall' }],
    },
  });
  const result = await call({
    completions: [{ action: 'post_to_slack', targetMode: 'thread' }, { action: 'silent' }],
  });

  expect(result).toMatchObject({
    completions: [{ action: 'post_to_slack', targetMode: 'thread' }, { action: 'silent' }],
  });
});

describe('request validation', () => {
  const slackRow = {
    kind: 'slack',
    event: 'message',
    channels: ['#alerts'],
    users: ['U123'],
    messageFilter: 'error',
  };
  const parseRows = (rows: unknown[]) =>
    params.parse({ path: { id: 'automation-1' }, body: { trigger: { rows } } });

  it('accepts Slack trigger rows and keeps their fields', () => {
    expect(parseRows([slackRow]).body.trigger?.rows).toEqual([slackRow]);
  });

  it('rejects Slack events other than message', () => {
    expect(() => parseRows([{ ...slackRow, event: 'mention' }])).toThrow();
  });

  it('rejects a Slack trigger row with no filters', () => {
    expect(() => parseRows([{ kind: 'slack', event: 'message' }])).toThrow(
      'at least one of channels, users, bots or messageFilter'
    );
  });

  it('accepts the action removal payload sent by the edit form', () => {
    expect(
      params.parse({ path: { id: 'automation-1' }, body: { completions: [] } }).body.completions
    ).toEqual([]);
  });

  it('keeps notification connector bounds on partial updates', () => {
    for (const connectorId of ['', 'x'.repeat(501)]) {
      expect(() =>
        params.parse({ path: { id: 'automation-1' }, body: { completions: [{ connectorId }] } })
      ).toThrow();
    }
  });
});

it('rejects a replacement channel completion without a destination before writes', () => {
  soClient.get.mockResolvedValue({
    attributes: {
      ...existing,
      completions: [{ action: 'post_to_slack', targetMode: 'thread', connectorId: 'slack' }],
    },
  });
  expect(() => call({ completions: [{ action: 'post_to_slack', targetMode: 'channel' }] })).toThrow(
    'Slack channel destination'
  );
  expect(updateWorkflow).not.toHaveBeenCalled();
  expect(soClient.update).not.toHaveBeenCalled();
});

it('validates replacement completions and keeps the saved connector supplied by the form', async () => {
  soClient.get.mockResolvedValue({
    attributes: {
      ...existing,
      completions: [{ action: 'post_to_slack', targetMode: 'thread', connectorId: 'slack' }],
    },
  });
  await call({
    completions: [
      {
        action: 'post_to_slack',
        targetMode: 'channel',
        destination: '#alerts',
        connectorId: 'slack',
      },
    ],
  });
  expect(soClient.update).toHaveBeenCalledWith(
    expect.any(String),
    'automation-1',
    expect.objectContaining({
      completions: [
        {
          action: 'post_to_slack',
          targetMode: 'channel',
          destination: '#alerts',
          connectorId: 'slack',
        },
      ],
    }),
    { mergeAttributes: false }
  );
  expect(updateWorkflow).toHaveBeenCalledWith(
    'workflow-1',
    { yaml: expect.stringContaining('notificationDestinations:') },
    'default',
    expect.anything()
  );
});

it('removes notification destinations when the Slack action is removed in the UI', async () => {
  soClient.get.mockResolvedValue({
    attributes: {
      ...existing,
      completions: [
        {
          action: 'post_to_slack',
          targetMode: 'channel',
          destination: '#oncall',
          connectorId: 'saved-slack',
        },
      ],
    },
  });
  const result = await call({ completions: [] });
  expect(result.completions).toEqual([]);
  const workflow = parse(updateWorkflow.mock.calls[0][1].yaml);
  expect(workflow.steps[0].with.notificationDestinations).toBeUndefined();
});

it('returns to the Elastic Slack app when the saved connector is explicitly cleared', async () => {
  soClient.get.mockResolvedValue({
    attributes: {
      ...existing,
      completions: [
        {
          action: 'post_to_slack',
          targetMode: 'channel',
          destination: '#oncall',
          connectorId: 'saved-slack',
        },
      ],
    },
  });
  await call({
    completions: [{ action: 'post_to_slack', targetMode: 'channel', destination: '#oncall' }],
  });
  const workflow = parse(updateWorkflow.mock.calls[0][1].yaml);
  expect(workflow.steps[0].with.notificationDestinations[0]).toMatchObject({
    connector_id: 'elastic-apps-slack',
    params: { channel: '#oncall' },
  });
});

const dailySchedule = { kind: 'schedule', schedulePreset: 'daily', time: '09:00' };

it('validates merged instructions even when a partial update only enables the schedule', async () => {
  soClient.get.mockResolvedValue({
    attributes: { ...existing, trigger: { rows: [dailySchedule] }, execution: {} },
  });
  await expect(call({ isEnabled: true })).rejects.toMatchObject({ output: { statusCode: 400 } });
  expect(updateWorkflow).not.toHaveBeenCalled();
  expect(soClient.update).not.toHaveBeenCalled();
});

it('rejects clearing instructions on a saved scheduled automation', async () => {
  soClient.get.mockResolvedValue({
    attributes: { ...existing, trigger: { rows: [dailySchedule] } },
  });
  await expect(call({ execution: { promptTemplate: null } })).rejects.toMatchObject({
    output: { statusCode: 400 },
  });
  expect(updateWorkflow).not.toHaveBeenCalled();
  expect(soClient.update).not.toHaveBeenCalled();
});

it('disables a scheduled automation through the normal workflow update', async () => {
  soClient.get.mockResolvedValue({
    attributes: {
      ...existing,
      trigger: { rows: [dailySchedule] },
    },
  });
  await call({ isEnabled: false });
  expect(updateWorkflow).toHaveBeenCalledWith(
    'workflow-1',
    { yaml: expect.any(String) },
    'default',
    expect.anything()
  );
  expect(parse(updateWorkflow.mock.calls[0][1].yaml).enabled).toBe(false);
  expect(soClient.update).toHaveBeenCalledWith(
    'nightshift-automation',
    'automation-1',
    expect.objectContaining({ isEnabled: false }),
    { mergeAttributes: false }
  );
});

it.each([{ name: 'Changed' }, { isEnabled: false }])(
  'rejects unsupported schedules on update %j without changing the workflow or saved object',
  async (body) => {
    soClient.get.mockResolvedValue({
      attributes: {
        ...existing,
        trigger: { rows: [{ ...dailySchedule, schedulePreset: 'custom' }] },
      },
    });
    await expect(call(body)).rejects.toMatchObject({ output: { statusCode: 400 } });
    expect(updateWorkflow).not.toHaveBeenCalled();
    expect(soClient.update).not.toHaveBeenCalled();
  }
);
