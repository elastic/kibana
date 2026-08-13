/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { SYSTEM_SECURITY_WATCH_FLOOR_ID } from '@kbn/pnd-common';
import { resetWatchStore } from '../watch_store/watch_store';
import type { WatchWorkflowsManagementClient } from './watch_workflows_management_client';
import { WatchesService } from './watches_service';

const FLOOR = SYSTEM_SECURITY_WATCH_FLOOR_ID;
const SPACE = 'default';
const request = {} as KibanaRequest;

interface FakeClient {
  client: WatchWorkflowsManagementClient;
  updateWorkflow: jest.Mock;
  /** Enablement the fake workflow store reports back on subsequent reads. */
  workflowEnabled: Map<string, boolean>;
}

const createFakeClient = ({ failUpdate = false } = {}): FakeClient => {
  const workflowEnabled = new Map<string, boolean>();

  const updateWorkflow = jest.fn(async (id: string, { enabled }: { enabled: boolean }) => {
    if (failUpdate) {
      throw new Error('ManagedWorkflowUpdateForbiddenError');
    }
    workflowEnabled.set(id, enabled);
    return {} as never;
  });

  const client = {
    updateWorkflow,
    getWorkflows: jest.fn(async () => ({
      results: [...workflowEnabled].map(([id, enabled]) => ({ id, enabled })),
    })),
    getWorkflow: jest.fn(async () => null),
    getWorkflowExecutions: jest.fn(),
    getWorkflowExecution: jest.fn(),
    createWorkflow: jest.fn(),
    deleteWorkflows: jest.fn(),
  } as unknown as WatchWorkflowsManagementClient;

  return { client, updateWorkflow, workflowEnabled };
};

const createService = (
  management: WatchWorkflowsManagementClient | undefined,
  useMockData = true
) => new WatchesService(management, loggingSystemMock.createLogger() as Logger, useMockData);

describe('WatchesService', () => {
  beforeEach(() => {
    resetWatchStore();
  });

  describe('enabled — written to the real workflow', () => {
    it('sends an enablement-only update to the workflow', async () => {
      const { client, updateWorkflow } = createFakeClient();

      const result = await createService(client).update(FLOOR, { enabled: false }, SPACE, request);

      expect(result.outcome).toBe('updated');
      // Only `enabled` may be sent: anything more is forbidden on a managed workflow.
      expect(updateWorkflow).toHaveBeenCalledWith(FLOOR, { enabled: false }, SPACE, request);
    });

    it('reads enablement back from the workflow, not the seed', async () => {
      const { client } = createFakeClient();
      const service = createService(client);

      await service.update(FLOOR, { enabled: false }, SPACE, request);

      const detail = await service.get(FLOOR, SPACE);
      expect(detail?.watch.enabled).toBe(false);

      const { watches } = await service.list(SPACE);
      expect(watches.find(({ id }) => id === FLOOR)?.enabled).toBe(false);
    });

    it('still reports the change when the workflow write fails', async () => {
      const { client, updateWorkflow } = createFakeClient({ failUpdate: true });
      const service = createService(client);

      const result = await service.update(FLOOR, { enabled: false }, SPACE, request);

      expect(updateWorkflow).toHaveBeenCalled();
      expect(result.outcome).toBe('updated');
      // Falls back to the store so the UI does not silently disagree with itself.
      expect((await service.get(FLOOR, SPACE))?.watch.enabled).toBe(false);
    });

    it('falls back to the store when Workflows is unavailable', async () => {
      const service = createService(undefined);

      const result = await service.update(FLOOR, { enabled: false }, SPACE, request);

      expect(result.outcome).toBe('updated');
      expect((await service.get(FLOOR, SPACE))?.watch.enabled).toBe(false);
    });

    it('reports not-found for an unknown watch', async () => {
      const { client } = createFakeClient();

      const result = await createService(client).update('nope', { enabled: false }, SPACE, request);

      expect(result.outcome).toBe('not-found');
    });
  });

  describe('settings — written to the store', () => {
    it('returns the updated settings alongside the watch', async () => {
      const service = createService(createFakeClient().client);

      const result = await service.update(FLOOR, { autonomyLevel: 'supervised' }, SPACE, request);

      expect(result.outcome).toBe('updated');
      expect(result.outcome === 'updated' && result.response.settings?.autonomy).toBe('supervised');
    });

    it('does not touch the workflow for a settings-only patch', async () => {
      const { client, updateWorkflow } = createFakeClient();

      await createService(client).update(FLOOR, { autonomyLevel: 'assisted' }, SPACE, request);

      expect(updateWorkflow).not.toHaveBeenCalled();
    });

    it('applies enabled and settings together in one patch', async () => {
      const { client, updateWorkflow } = createFakeClient();

      const result = await createService(client).update(
        FLOOR,
        { enabled: false, autonomyLevel: 'assisted' },
        SPACE,
        request
      );

      expect(updateWorkflow).toHaveBeenCalledWith(FLOOR, { enabled: false }, SPACE, request);
      expect(result.outcome === 'updated' && result.response.watch.enabled).toBe(false);
      expect(result.outcome === 'updated' && result.response.settings?.autonomy).toBe('assisted');
    });

    it('rejects a patch the watch does not offer', async () => {
      const service = createService(createFakeClient().client);

      const gate = await service.update(
        FLOOR,
        { approvalGate: { gateId: 'host-isolation', requirement: 'in-scope' } },
        SPACE,
        request
      );
      expect(gate).toEqual({ outcome: 'rejected', what: 'approval gate "host-isolation"' });

      const schedule = await service.update(
        FLOOR,
        { triggers: { scheduleId: 'every-century' } },
        SPACE,
        request
      );
      expect(schedule).toEqual({ outcome: 'rejected', what: 'trigger settings' });
    });

    it('leaves the workflow untouched when a settings patch in the same body is rejected', async () => {
      const { client, updateWorkflow } = createFakeClient();
      const service = createService(client);

      const result = await service.update(
        FLOOR,
        { enabled: false, triggers: { scheduleId: 'every-century' } },
        SPACE,
        request
      );

      expect(result).toEqual({ outcome: 'rejected', what: 'trigger settings' });
      // `enabled` is the one field with a real persisted side effect, so settings must validate first:
      // a rejected patch has to leave the workflow alone rather than disable it and report 400.
      expect(updateWorkflow).not.toHaveBeenCalled();
      expect((await service.get(FLOOR, SPACE))?.watch.enabled).toBe(true);
    });

    it('refuses settings writes when not backed by the store', async () => {
      const service = createService(createFakeClient().client, false);

      const result = await service.update(FLOOR, { autonomyLevel: 'assisted' }, SPACE, request);

      expect(result.outcome).toBe('unavailable');
    });
  });

  describe('catalogs', () => {
    it('exposes workers and skills without routes reaching into the store', async () => {
      const service = createService(undefined);

      expect(service.listWorkers().length).toBeGreaterThan(0);
      expect(service.listSkills().length).toBeGreaterThan(0);

      expect(service.setWorkerEnabled('containment', false)?.enabled).toBe(false);
      // The identically named skill is a different thing and must be untouched.
      expect(service.listSkills().find(({ id }) => id === 'containment')?.enabled).toBe(true);

      expect(service.setWorkerEnabled('nope', false)).toBeUndefined();
      expect(service.setSkillEnabled('nope', false)).toBeUndefined();
    });
  });
});
