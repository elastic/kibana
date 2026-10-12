/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Logger } from '@kbn/core/server';
import type { PluginScopedManagedWorkflowsApi } from '@kbn/workflows/server/types';
import { workerRegistry } from '../../managed_workflows/worker_registry';
import {
  OnboardingService,
  type OnboardingTransactionResult,
  type OnboardingServiceDependencies,
} from './onboarding_service';

interface StatusReport {
  installed: boolean;
  enabled?: boolean;
  workflowId?: string;
}

type InstallArgs = [
  id: string,
  options?: { spaceId: string; workflowIdSuffix: string; values?: { autonomyLevel?: string } }
];
type UninstallArgs = InstallArgs;

interface MockClient {
  persisted: Set<string>;
  install: jest.Mock<Promise<void>, InstallArgs>;
  uninstall: jest.Mock<Promise<void>, UninstallArgs>;
  getWorkflowStatus: jest.Mock<Promise<StatusReport>, [id: string]>;
  getInstalledWorkflowState: jest.Mock;
}

describe('OnboardingService', () => {
  const workerIds = workerRegistry.list().map((registration) => registration.id);
  const firstWorkerId = workerIds[0];

  /**
   * Models a real managed-workflows store: `install` persists, `uninstall` removes, and
   * `getWorkflowStatus` reflects what is actually persisted — so a clean space reports
   * `installed: false` before the install and `true` after it.
   */
  const makeClient = (overrides: Partial<Record<string, unknown>> = {}): MockClient => {
    const persisted = new Set<string>();
    const client: MockClient = {
      persisted,
      install: jest.fn().mockImplementation(async (id: string) => {
        persisted.add(id);
      }),
      uninstall: jest.fn().mockImplementation(async (id: string) => {
        persisted.delete(id);
      }),
      getWorkflowStatus: jest.fn().mockImplementation(async (id: string) => ({
        installed: persisted.has(id),
        enabled: persisted.has(id),
        workflowId: `wf-${id}`,
      })),
      getInstalledWorkflowState: jest.fn().mockResolvedValue(null),
      ...overrides,
    };
    return client;
  };
  const makeDeps = (
    client: unknown,
    opts: { ensureAgent?: (spaceId: string) => Promise<void> } = {}
  ): OnboardingServiceDependencies => ({
    logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } as unknown as Logger,
    getManagedWorkflows: jest.fn().mockResolvedValue(client as PluginScopedManagedWorkflowsApi),
    ensureAgentForSpace:
      opts.ensureAgent ??
      (jest.fn().mockResolvedValue(undefined) as (spaceId: string) => Promise<void>),
  });

  describe('enable', () => {
    it('installs every registered worker with default values (autonomy=manual) and ensures the agent', async () => {
      const client = makeClient();
      const ensureAgent = jest.fn().mockResolvedValue(undefined);
      const service = new OnboardingService(makeDeps(client, { ensureAgent }));
      const result: OnboardingTransactionResult = await service.enable('default');
      expect(result.outcome).toBe('enabled');
      expect(result.spaceId).toBe('default');
      expect(result.installedWorkerIds).toEqual(workerIds);
      const firstCall = client.install.mock.calls[0];
      expect(firstCall?.[1]?.spaceId).toBe('default');
      expect(firstCall?.[1]?.workflowIdSuffix).toBe('default');
      expect(firstCall?.[1]?.values?.autonomyLevel).toBe('manual');
      expect(ensureAgent).toHaveBeenCalledWith('default');
    });

    it('fails without installing when managed workflows are unavailable', async () => {
      const deps = makeDeps(undefined);
      const service = new OnboardingService(deps);
      const result = await service.enable('default');
      expect(result.outcome).toBe('failed');
      expect(result.error).toMatch(/unavailable/i);
    });

    it('rolls back installed workers when a later worker fails', async () => {
      const client = makeClient({
        install: jest
          .fn()
          .mockResolvedValueOnce(undefined)
          .mockRejectedValueOnce(new Error('es write failed')),
      });
      if (workerIds.length < 2) {
        client.install = jest.fn().mockRejectedValue(new Error('es write failed'));
      }
      const service = new OnboardingService(makeDeps(client));
      const result = await service.enable('default');
      expect(result.outcome).toBe('failed');
      expect(result.error).toMatch(/es write failed|did not persist/);
      if (workerIds.length >= 2) {
        // The rollback must target the same suffixed instance that enable installed.
        expect(client.uninstall).toHaveBeenCalledWith(firstWorkerId, {
          spaceId: 'default',
          workflowIdSuffix: 'default',
        });
      }
    });

    it('reuses the persisted template values of an already-installed worker', async () => {
      const client = makeClient();
      await new OnboardingService(makeDeps(client)).enable('default');

      // A worker the space already runs, with settings the user has since edited. Install is
      // also the settings-write path, so re-enabling must not re-seed the defaults over them.
      const edited = { autonomyLevel: 'supervised', extras: { schedule: '4h' } };
      client.getInstalledWorkflowState.mockResolvedValue({
        workflowId: `wf-${firstWorkerId}`,
        spaceId: 'default',
        definitionId: firstWorkerId,
        templateValues: edited,
        documentVersion: 7,
      });
      client.install.mockClear();

      const result = await new OnboardingService(makeDeps(client)).enable('default');
      expect(result.outcome).toBe('enabled');
      expect(client.install).toHaveBeenCalled();
      for (const [, options] of client.install.mock.calls) {
        expect(options?.values).toBe(edited);
      }
    });

    it('rolls back only workers this attempt created, never pre-existing ones', async () => {
      const client = makeClient();
      const [, secondWorkerId, thirdWorkerId] = workerIds;
      // firstWorkerId is already installed in this space; the third install attempt fails.
      client.persisted.add(firstWorkerId);
      client.install.mockImplementation(async (id: string) => {
        if (id === thirdWorkerId) {
          throw new Error('es write failed');
        }
        client.persisted.add(id);
      });

      const result = await new OnboardingService(makeDeps(client)).enable('default');
      expect(result.outcome).toBe('failed');
      expect(client.uninstall).toHaveBeenCalledWith(secondWorkerId, {
        spaceId: 'default',
        workflowIdSuffix: 'default',
      });
      // The pre-existing worker is not ours to delete: its workflow and settings survive.
      expect(client.uninstall).not.toHaveBeenCalledWith(firstWorkerId, expect.anything());
      expect(client.persisted.has(firstWorkerId)).toBe(true);
    });

    it('rolls back a worker whose install landed but whose verification read rejected', async () => {
      const client = makeClient({
        getWorkflowStatus: jest
          .fn()
          .mockResolvedValueOnce({ installed: false })
          .mockRejectedValueOnce(new Error('status read failed')),
      });
      const result = await new OnboardingService(makeDeps(client)).enable('default');
      expect(result.outcome).toBe('failed');
      expect(result.error).toMatch(/status read failed/);
      expect(client.uninstall).toHaveBeenCalledWith(firstWorkerId, {
        spaceId: 'default',
        workflowIdSuffix: 'default',
      });
    });

    it('compensates the installs when the source-of-truth commit is rejected', async () => {
      const client = makeClient();
      const commit = jest.fn().mockRejectedValue(new Error('uiSettings write rejected'));
      const result = await new OnboardingService(makeDeps(client)).enable('default', commit);
      expect(commit).toHaveBeenCalledTimes(1);
      expect(result.outcome).toBe('failed');
      expect(result.error).toMatch(/uiSettings write rejected/);
      expect(client.uninstall).toHaveBeenCalledWith(firstWorkerId, {
        spaceId: 'default',
        workflowIdSuffix: 'default',
      });
      expect(client.persisted.size).toBe(0);
    });

    it('runs the commit after every install, and reports enabled once it resolves', async () => {
      const client = makeClient();
      const commit = jest.fn().mockResolvedValue(undefined);
      const result = await new OnboardingService(makeDeps(client)).enable('default', commit);
      expect(result.outcome).toBe('enabled');
      expect(client.install).toHaveBeenCalledTimes(workerIds.length);
      expect(commit).toHaveBeenCalledTimes(1);
      expect(client.uninstall).not.toHaveBeenCalled();
    });
  });

  describe('disable', () => {
    it('uninstalls installed workers and never touches conversations', async () => {
      const client = makeClient();
      for (const id of workerIds) {
        client.persisted.add(id);
      }
      const service = new OnboardingService(makeDeps(client));
      const result = await service.disable('default');
      expect(result.outcome).toBe('disabled');
      expect(client.uninstall.mock.calls.length).toBe(workerIds.length);
      // Uninstall targets the same space-suffixed instance that enable installed;
      // without the suffix the call removes nothing and the worker keeps running.
      for (const [, options] of client.uninstall.mock.calls) {
        expect(options).toEqual({ spaceId: 'default', workflowIdSuffix: 'default' });
      }
    });

    it('skips workers that are not installed', async () => {
      const client = makeClient();
      const service = new OnboardingService(makeDeps(client));
      const result = await service.disable('default');
      expect(result.outcome).toBe('disabled');
      expect(client.uninstall).not.toHaveBeenCalled();
    });

    it('reports a failed disable, with the partial result, when a worker cannot be removed', async () => {
      const client = makeClient({
        uninstall: jest.fn().mockRejectedValue(new Error('es down')),
      });
      for (const id of workerIds) {
        client.persisted.add(id);
      }
      const result = await new OnboardingService(makeDeps(client)).disable('default');
      expect(result.outcome).toBe('failed');
      expect(result.error).toMatch(/not removed/i);
      // Nothing was removed, so the partial result is empty rather than a claimed success.
      expect(result.installedWorkerIds).toEqual([]);
    });
  });
});
