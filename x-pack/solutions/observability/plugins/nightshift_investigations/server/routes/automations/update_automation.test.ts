/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { updateAutomationRoute } from './update_automation';
import type { NightshiftAutomationCompletion } from '../../lib/automations/types';

const { handler } = updateAutomationRoute['PUT /internal/nightshift/automations/{id}'];
const request = httpServerMock.createKibanaRequest();
const get = jest.fn();
const update = jest.fn();
const updateWorkflow = jest.fn();
const call = (completion: NightshiftAutomationCompletion) =>
  handler({
    request,
    params: { path: { id: 'auto-1' }, body: { completion } },
    getAutomationsSoClient: () => ({ get, update }),
    getWorkflowsManagement: () => ({ management: { updateWorkflow } }),
    context: {
      core: Promise.resolve({ savedObjects: { client: { getCurrentNamespace: () => 'ops' } } }),
    },
  } as never);

beforeEach(() => {
  jest.clearAllMocks();
  get.mockResolvedValue({
    attributes: {
      name: 'Test',
      automationType: 'custom',
      isEnabled: true,
      workflowId: 'wf-1',
      trigger: { rows: [{ kind: 'schedule', schedulePreset: 'hourly' }] },
      execution: {},
      completion: { action: 'post_to_slack', targetMode: 'thread', connectorId: 'slack' },
      runtime: {},
      createdAt: '2026-10-01',
      updatedAt: '2026-10-01',
    },
  });
});

it('rejects a partial change to channel mode without a merged destination before writes', async () => {
  await expect(call({ targetMode: 'channel' })).rejects.toThrow('Slack channel destination');
  expect(updateWorkflow).not.toHaveBeenCalled();
  expect(update).not.toHaveBeenCalled();
});

it('validates merged completion and preserves omitted connector and action fields', async () => {
  await call({ targetMode: 'channel', destination: '#alerts' });
  expect(update).toHaveBeenCalledWith(
    expect.any(String),
    'auto-1',
    expect.objectContaining({
      completion: {
        action: 'post_to_slack',
        targetMode: 'channel',
        destination: '#alerts',
        connectorId: 'slack',
      },
    })
  );
  expect(updateWorkflow).toHaveBeenCalledWith(
    'wf-1',
    { yaml: expect.stringContaining('notificationDestinations:') },
    'ops',
    request
  );
});
