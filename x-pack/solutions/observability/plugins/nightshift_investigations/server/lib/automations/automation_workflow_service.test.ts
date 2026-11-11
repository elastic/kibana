/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { LockAcquisitionError } from '@kbn/lock-manager';
import { parse } from 'yaml';
import { createAutomationWorkflowService } from './automation_workflow_service';
import type { NightshiftAutomationAttributes } from './types';
import { createServiceAccountService } from '../../routes/automations/test_helpers';

const request = httpServerMock.createKibanaRequest();
const attributes: NightshiftAutomationAttributes = {
  name: 'Checkout health',
  automationType: 'custom',
  isEnabled: true,
  workflowId: 'deleted-workflow',
  trigger: { rows: [{ kind: 'schedule', schedulePreset: 'daily', time: '09:00' }] },
  execution: { promptTemplate: 'Review checkout health.' },
  completions: [],
  runtime: { dailyDispatchLimit: 7 },
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
};

const setup = (overrides: Partial<NightshiftAutomationAttributes> = {}) => {
  let stored = { ...attributes, ...overrides };
  let version = 1;
  const states = new Map<string, boolean>();
  const soClient = {
    get: jest.fn(async () => ({ attributes: structuredClone(stored), version: String(version) })),
    update: jest.fn(
      async (
        _type: string,
        _id: string,
        next: NightshiftAutomationAttributes,
        options: { version: string }
      ) => {
        if (options.version !== String(version)) throw new Error('Version conflict');
        stored = structuredClone(next);
        version++;
        return { attributes: stored };
      }
    ),
  };
  const workflows = {
    getWorkflowStates: jest.fn(async (ids: string[]) =>
      ids.flatMap((id) => (states.has(id) ? [{ id, enabled: states.get(id) === true }] : []))
    ),
    createWorkflow: jest.fn(async ({ yaml }: { yaml: string }) => {
      const id = `replacement-${states.size + 1}`;
      states.set(id, parse(yaml).enabled);
      return { id };
    }),
    updateWorkflow: jest.fn(async (id: string, update: { yaml?: string; enabled?: boolean }) => {
      states.set(id, update.yaml ? parse(update.yaml).enabled : update.enabled === true);
    }),
    deleteWorkflows: jest.fn(async (ids: string[]) => {
      ids.forEach((id) => states.delete(id));
      const failures: Array<{ id: string; error: string }> = [];
      return { failures, total: ids.length, deleted: ids.length };
    }),
  };
  const serviceAccount = createServiceAccountService();
  let pending = Promise.resolve();
  const acquireLock = jest.fn(async () => {});
  const lockManager = {
    withLock: async <T>(_id: string, callback: () => Promise<T>): Promise<T> => {
      await acquireLock();
      const result = pending.then(callback);
      pending = result.then(
        () => {},
        () => {}
      );
      return result;
    },
  };
  const logger = loggingSystemMock.createLogger();
  const service = createAutomationWorkflowService({
    getAutomationsSoClient: () => soClient as never,
    getWorkflowsManagement: () => ({ management: workflows } as never),
    getInvestigatorServiceAccountService: () => serviceAccount as never,
    isUniversalAlertingAvailable: () => true,
    lockManager,
    logger,
  });
  return {
    service,
    soClient,
    workflows,
    states,
    serviceAccount,
    acquireLock,
    logger,
    stored: () => stored,
  };
};

it.each([
  { name: 'save', changes: { name: 'Updated health' } },
  { name: 'pause', changes: { isEnabled: false } },
  { name: 'enable', changes: { isEnabled: true } },
])(
  'requires explicit repair before $name when the workflow is deleted or out of sync',
  async ({ changes }) => {
    for (const enabled of [undefined, false]) {
      const { service, stored, workflows, states, soClient } = setup();
      if (enabled !== undefined) states.set('deleted-workflow', enabled);
      await expect(service.update(request, 'default', 'automation', changes)).rejects.toMatchObject(
        {
          output: { statusCode: 409 },
          message: expect.stringContaining('Repair'),
        }
      );
      expect(stored()).toEqual(attributes);
      expect(workflows.createWorkflow).not.toHaveBeenCalled();
      expect(workflows.updateWorkflow).not.toHaveBeenCalled();
      expect(soClient.update).not.toHaveBeenCalled();
    }
  }
);

it.each([true, false])(
  'repairs a missing workflow with desired enabled=%s, preserving its history and identity',
  async (isEnabled) => {
    const { service, stored, workflows, states } = setup({
      isEnabled,
      previousWorkflowIds: ['older-workflow'],
    });
    const result = await service.repair(request, 'default', 'automation');
    expect(result).toMatchObject({
      id: 'automation',
      isEnabled,
      backingWorkflow: { state: 'available' },
    });
    expect(stored()).toMatchObject({
      workflowId: 'replacement-1',
      previousWorkflowIds: ['older-workflow', 'deleted-workflow'],
      runtime: { dailyDispatchLimit: 7 },
    });
    const generated = parse(workflows.createWorkflow.mock.calls[0][0].yaml);
    expect(generated.enabled).toBe(false);
    expect(generated.settings.run_as).toBe('kibana/nightshift_automations');
    expect(states.get('replacement-1')).toBe(isEnabled);
    await service.repair(request, 'default', 'automation');
    expect(workflows.createWorkflow).toHaveBeenCalledTimes(1);
  }
);

it('serializes repair, save and pause and re-reads the latest saved configuration', async () => {
  const { service, stored, workflows, states } = setup();
  await Promise.all([
    service.repair(request, 'default', 'automation'),
    service.update(request, 'default', 'automation', { name: 'Updated health' }),
    service.update(request, 'default', 'automation', { isEnabled: false }),
  ]);
  expect(workflows.createWorkflow).toHaveBeenCalledTimes(1);
  expect(stored()).toMatchObject({
    name: 'Updated health',
    isEnabled: false,
    workflowId: 'replacement-1',
  });
  expect(states.get('replacement-1')).toBe(false);
});

it('removes the disabled replacement if linking conflicts and leaves the original automation unchanged', async () => {
  const { service, soClient, stored, states } = setup();
  soClient.update.mockRejectedValueOnce(new Error('Version conflict'));
  await expect(service.repair(request, 'default', 'automation')).rejects.toThrow(
    'Version conflict'
  );
  expect(states.size).toBe(0);
  expect(stored()).toEqual(attributes);
});

it('keeps a linked disabled replacement after activation fails and retries that workflow', async () => {
  const { service, workflows, states, stored } = setup();
  workflows.updateWorkflow.mockImplementationOnce(async (id) => {
    states.set(id, true);
    throw new Error('Unavailable after activation was written');
  });
  await expect(service.repair(request, 'default', 'automation')).rejects.toThrow(
    'could not be enabled'
  );
  expect(stored().workflowId).toBe('replacement-1');
  expect(states.get('replacement-1')).toBe(false);
  expect(await service.getStates([{ id: 'automation', ...stored() }], 'default')).toEqual(
    new Map([['automation', { state: 'out_of_sync' }]])
  );
  await service.repair(request, 'default', 'automation');
  expect(workflows.createWorkflow).toHaveBeenCalledTimes(1);
  expect(states.get('replacement-1')).toBe(true);
});

it('does not classify an unavailable lookup or permissions failure as deletion', async () => {
  const { service, workflows, soClient, serviceAccount } = setup();
  workflows.getWorkflowStates.mockRejectedValueOnce(new Error('Search unavailable'));
  expect(await service.getStates([{ id: 'automation', ...attributes }], 'default')).toEqual(
    new Map([['automation', { state: 'unknown' }]])
  );
  workflows.getWorkflowStates.mockRejectedValueOnce(new Error('Search unavailable'));
  await expect(service.repair(request, 'default', 'automation')).rejects.toThrow(
    'Unable to verify'
  );
  serviceAccount.resolveAutomationRunAs.mockRejectedValueOnce(new Error('manage_security'));
  await expect(
    service.update(request, 'default', 'automation', { isEnabled: false })
  ).rejects.toThrow('manage_security');
  expect(workflows.createWorkflow).not.toHaveBeenCalled();
  expect(soClient.update).not.toHaveBeenCalled();
});

it('blocks other mutations on missing or mismatched workflows and fails closed on unavailable verification', async () => {
  const { service, states, workflows } = setup();
  const automation = { id: 'automation', ...attributes };
  await expect(service.assertAvailable(automation, 'default')).rejects.toMatchObject({
    output: { statusCode: 409 },
  });
  states.set('deleted-workflow', false);
  await expect(service.assertAvailable(automation, 'default')).rejects.toThrow('Repair');
  workflows.getWorkflowStates.mockRejectedValueOnce(new Error('Unavailable'));
  await expect(service.assertAvailable(automation, 'default')).rejects.toMatchObject({
    output: { statusCode: 503 },
  });
  states.set('deleted-workflow', true);
  await expect(service.assertAvailable(automation, 'default')).resolves.toBeUndefined();
});

it('requires Repair after an external deletion races an update and preserves the saved configuration', async () => {
  const { service, workflows, states } = setup();
  states.set('deleted-workflow', true);
  workflows.updateWorkflow.mockImplementationOnce(async () => {
    states.delete('deleted-workflow');
    throw new Error('Not found');
  });
  await expect(
    service.update(request, 'default', 'automation', { name: 'Updated' })
  ).rejects.toThrow('Repair');
  expect(workflows.createWorkflow).not.toHaveBeenCalled();
  const result = await service.repair(request, 'default', 'automation');
  expect(result).toMatchObject({ name: attributes.name, workflowId: 'replacement-1' });
});

it('propagates an update failure when the original workflow still exists', async () => {
  const { service, workflows, states } = setup();
  states.set('deleted-workflow', true);
  workflows.updateWorkflow.mockRejectedValueOnce(new Error('Forbidden'));
  await expect(
    service.update(request, 'default', 'automation', { name: 'Updated' })
  ).rejects.toThrow('Forbidden');
  expect(workflows.createWorkflow).not.toHaveBeenCalled();
});

it('returns a retryable conflict when another process holds the automation lock', async () => {
  const { service, acquireLock, soClient } = setup();
  acquireLock.mockRejectedValueOnce(new LockAcquisitionError('Held'));
  await expect(service.repair(request, 'default', 'automation')).rejects.toMatchObject({
    output: { statusCode: 409 },
  });
  expect(soClient.get).not.toHaveBeenCalled();
});

it('logs failed cleanup responses with identifiers while retaining the original linking error', async () => {
  const { service, workflows, soClient, states, logger } = setup();
  soClient.update.mockRejectedValueOnce(new Error('Version conflict'));
  workflows.deleteWorkflows.mockResolvedValueOnce({
    failures: [{ id: 'replacement-1', error: 'Deletion refused' }],
    total: 1,
    deleted: 0,
  });
  await expect(service.repair(request, 'default', 'automation')).rejects.toThrow(
    'Version conflict'
  );
  expect(states.get('replacement-1')).toBe(false);
  expect(logger.warn).toHaveBeenCalledWith(
    expect.stringContaining('replacement-1 for automation automation in space default')
  );
});
