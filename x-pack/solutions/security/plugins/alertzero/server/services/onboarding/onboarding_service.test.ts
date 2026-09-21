/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Logger } from '@kbn/core/server';
import {
  OnboardingService,
  type OnboardingTransactionResult,
  type OnboardingServiceDependencies,
} from './onboarding_service';

describe('OnboardingService', () => {
  const makeClient = (
    overrides: Partial<Record<'install' | 'uninstall' | 'getWorkflowStatus', any>> = {}
  ) => ({
    install: jest.fn().mockResolvedValue(undefined),
    uninstall: jest.fn().mockResolvedValue(undefined),
    getWorkflowStatus: jest.fn().mockResolvedValue({ installed: true, enabled: true }),
    ...overrides,
  });
  const makeDeps = (
    client: any,
    opts: { ensureAgent?: (spaceId: string) => Promise<void> } = {}
  ): OnboardingServiceDependencies => ({
    logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } as unknown as Logger,
    getManagedWorkflows: jest.fn().mockResolvedValue(client),
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
      expect(result.installedWorkerIds.length).toBeGreaterThan(0);
      const firstCall = client.install.mock.calls[0];
      expect(firstCall[1].spaceId).toBe('default');
      expect(firstCall[1].workflowIdSuffix).toBe('default');
      expect(firstCall[1].values.autonomyLevel).toBe('manual');
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
      const registry = await import('../../managed_workflows/worker_registry');
      const ids = registry.workerRegistry.list().map((r) => r.id);
      const client = makeClient({
        install: jest
          .fn()
          .mockResolvedValueOnce(undefined)
          .mockRejectedValueOnce(new Error('es write failed')),
      });
      if (ids.length < 2) {
        client.install = jest.fn().mockRejectedValue(new Error('es write failed'));
      }
      const service = new OnboardingService(makeDeps(client));
      const result = await service.enable('default');
      expect(result.outcome).toBe('failed');
      expect(result.error).toMatch(/es write failed|did not persist/);
      if (ids.length >= 2) {
        // The rollback must target the same suffixed instance that enable installed.
        expect(client.uninstall).toHaveBeenCalledWith(ids[0], {
          spaceId: 'default',
          workflowIdSuffix: 'default',
        });
      }
    });
  });

  describe('disable', () => {
    it('uninstalls installed workers and never touches conversations', async () => {
      const client = makeClient();
      const service = new OnboardingService(makeDeps(client));
      const result = await service.disable('default');
      expect(result.outcome).toBe('disabled');
      expect(client.uninstall.mock.calls.length).toBeGreaterThan(0);
      // Uninstall targets the same space-suffixed instance that enable installed;
      // without the suffix the call removes nothing and the worker keeps running.
      for (const [, options] of client.uninstall.mock.calls) {
        expect(options).toEqual({ spaceId: 'default', workflowIdSuffix: 'default' });
      }
    });

    it('skips workers that are not installed', async () => {
      const client = makeClient({
        getWorkflowStatus: jest.fn().mockResolvedValue({ installed: false }),
      });
      const service = new OnboardingService(makeDeps(client));
      const result = await service.disable('default');
      expect(result.outcome).toBe('disabled');
      expect(client.uninstall).not.toHaveBeenCalled();
    });
  });
});
