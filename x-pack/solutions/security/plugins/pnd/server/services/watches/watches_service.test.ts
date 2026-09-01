/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { SYSTEM_SECURITY_WATCH_FLOOR_ID } from '@kbn/pnd-common';
import { getManagedWorkflowDefinition } from '@kbn/workflows/managed';
import type { PluginScopedManagedWorkflowsApi } from '@kbn/workflows/server/types';
import { resetWatchStore } from '../watch_store/watch_store';
import type { WatchWorkflowsManagementClient } from './watch_workflows_management_client';
import { WatchesService } from './watches_service';

const FLOOR = SYSTEM_SECURITY_WATCH_FLOOR_ID;
const SPACE = 'default';
const request = {} as KibanaRequest;

interface PersistentWatchDocument {
  id: string;
  enabled: boolean;
  values: Record<string, unknown> | null;
  yaml: string;
  version: number;
}

const renderManagedWorkflowYaml = (id: string, values: Record<string, unknown> | null): string => {
  const definition = getManagedWorkflowDefinition(id);
  if (!definition) throw new Error(`Missing managed workflow definition for "${id}"`);
  if ('yaml' in definition && typeof definition.yaml === 'string') return definition.yaml;
  if ('yamlTemplate' in definition && typeof definition.yamlTemplate === 'function' && values) {
    return (definition.yamlTemplate as (templateValues: Record<string, unknown>) => string)(values);
  }
  throw new Error(`Managed workflow "${id}" cannot be rendered`);
};

const createPersistentHarness = () => {
  const documents = new Map<string, PersistentWatchDocument>();
  const documentId = (id: string, spaceId: string) => `${id}-${spaceId}`;
  const install = jest.fn(
    async (
      id: string,
      options: {
        spaceId: string;
        workflowIdSuffix?: string;
        values?: Record<string, unknown>;
      }
    ) => {
      const idWithSuffix = documentId(id, options.workflowIdSuffix ?? options.spaceId);
      const existing = documents.get(idWithSuffix);
      const values = options.values ?? existing?.values ?? null;
      const yaml = renderManagedWorkflowYaml(id, values);
      documents.set(idWithSuffix, {
        id: idWithSuffix,
        enabled: existing?.enabled ?? false,
        values,
        yaml,
        version: existing?.yaml === yaml ? existing.version : (existing?.version ?? 0) + 1,
      });
    }
  );
  const getWorkflowStatus = jest.fn(async (id: string, options: { spaceId: string }) => {
    const idWithSuffix = documentId(id, options.spaceId);
    const document = documents.get(idWithSuffix);
    return {
      status: document ? (document.enabled ? 'intact' : 'disabled') : 'missing',
      workflowId: idWithSuffix,
      definitionId: id,
      spaceId: options.spaceId,
      installed: Boolean(document),
      enabled: document?.enabled ?? null,
      valid: document ? true : null,
      managedBy: document ? 'pnd' : null,
      storedVersion: document ? 1 : null,
      registryVersion: 1,
      storedHash: document ? 'stored' : null,
      registryHash: 'registry',
    };
  });
  const uninstall = jest.fn(async (_id: string, options: { workflowId?: string }) => {
    if (options.workflowId) documents.delete(options.workflowId);
  });
  const managedWorkflows = {
    install,
    uninstall,
    execute: jest.fn(),
    ready: jest.fn(),
    getWorkflowStatus,
    getInstalledWorkflowState: jest.fn(async (id: string, spaceId: string) => {
      const document = documents.get(id);
      if (!document) return null;
      return {
        workflowId: id,
        spaceId,
        definitionId: FLOOR,
        templateValues: document.values,
        documentVersion: document.version,
      };
    }),
    listInstalledWorkflowStates: jest.fn(async () => []),
  } as unknown as PluginScopedManagedWorkflowsApi;

  const definition = (enabled: boolean) =>
    ({
      version: '1',
      name: 'Watch Floor',
      description: 'Floor watch',
      enabled,
      tags: ['watch', 'watch-floor'],
      triggers: [{ type: 'manual' }],
      consts: { watch_policy: { mandate: 'Frontline triage' } },
      steps: [],
    } as never);
  const getWorkflow = jest.fn(async (id: string) => {
    const document = documents.get(id);
    if (!document) return null;
    return {
      id,
      name: 'Watch Floor',
      description: 'Floor watch',
      enabled: document.enabled,
      managed: true,
      managedBy: 'pnd',
      createdAt: '2026-08-14T00:00:00.000Z',
      createdBy: 'elastic/kibana',
      lastUpdatedAt: '2026-08-14T00:00:00.000Z',
      lastUpdatedBy: 'elastic/kibana',
      definition: definition(document.enabled),
      yaml: document.yaml,
      valid: true,
      version: document.version,
    };
  });
  const management = {
    getWorkflow,
    getWorkflows: jest.fn(async () => ({
      page: 1,
      size: 100,
      total: documents.size,
      results: [...documents.values()].map((document) => ({
        id: document.id,
        name: 'Watch Floor',
        description: 'Floor watch',
        enabled: document.enabled,
        managed: true,
        managedBy: 'pnd',
        definition: definition(document.enabled),
        createdAt: '2026-08-14T00:00:00.000Z',
        tags: ['watch', 'watch-floor'],
        valid: true,
      })),
    })),
    getWorkflowExecutions: jest.fn(async () => ({ results: [], page: 1, size: 10, total: 0 })),
    getWorkflowExecution: jest.fn(async () => null),
    cancelAllActiveWorkflowExecutions: jest.fn(async () => undefined),
    updateWorkflow: jest.fn(async (id: string, { enabled }: { enabled: boolean }) => {
      const document = documents.get(id);
      if (!document) throw new Error('not found');
      document.enabled = enabled;
      document.version += 1;
      return {} as never;
    }),
  } as unknown as WatchWorkflowsManagementClient;

  return {
    documents,
    install,
    uninstall,
    management,
    managedWorkflows,
    createService: (useMockData = false) =>
      new WatchesService(
        management,
        Promise.resolve(managedWorkflows),
        loggingSystemMock.createLogger() as Logger,
        useMockData
      ),
  };
};

describe('WatchesService', () => {
  beforeEach(() => {
    resetWatchStore();
  });

  describe('list', () => {
    it('projects uninstalled live catalog entries without fixture runtime data', async () => {
      const response = await createPersistentHarness().createService().list(request, SPACE);
      const floor = response.watches.find(({ id }) => id === FLOOR);

      expect(floor).toEqual(
        expect.objectContaining({
          id: FLOOR,
          name: 'Watch Floor',
          enabled: false,
          mandate: '',
          description: '',
          skills: [],
          coverage: [],
          scopes: [],
          recentRuns: [],
          metrics: { lastRun: null },
        })
      );
      expect(floor?.schedule.set).toBe(false);
    });

    it('still lists installed catalog watches when workflow search returns none', async () => {
      const harness = createPersistentHarness();
      const service = harness.createService();
      await service.update(FLOOR, { enabled: true }, SPACE, request);
      jest.mocked(harness.management.getWorkflows).mockResolvedValue({
        page: 1,
        size: 100,
        total: 0,
        results: [],
      });

      const response = await service.list(request, SPACE);
      const floor = response.watches.find(({ id }) => id === FLOOR);

      expect(response.watches).toHaveLength(5);
      expect(floor).toEqual(
        expect.objectContaining({
          id: FLOOR,
          enabled: true,
        })
      );
    });

    it('reads managed enablement while retaining the mock catalog presentation', async () => {
      const harness = createPersistentHarness();
      const service = harness.createService(true);
      await service.update(FLOOR, { enabled: true }, SPACE, request);

      const response = await service.list(request, SPACE);

      expect(response.watches.find(({ id }) => id === FLOOR)?.enabled).toBe(true);
    });
  });

  describe('managed settings persistence', () => {
    it('uses managed template values in mock presentation mode too', async () => {
      const harness = createPersistentHarness();
      const service = harness.createService(true);

      const result = await service.update(
        FLOOR,
        { autonomyLevel: 'supervised', settingsRevision: null },
        SPACE,
        request
      );

      expect(result.outcome === 'updated' && result.response.settings?.autonomy).toBe('supervised');
      expect(harness.documents.get(`${FLOOR}-${SPACE}`)?.values).toEqual(
        expect.objectContaining({ autonomyLevel: 'supervised' })
      );
    });

    it('survives service recreation and keeps spaces isolated', async () => {
      const harness = createPersistentHarness();

      const first = await harness
        .createService()
        .update(FLOOR, { autonomyLevel: 'supervised', settingsRevision: null }, 'space-a', request);
      const second = await harness
        .createService()
        .update(FLOOR, { autonomyLevel: 'assisted', settingsRevision: null }, 'space-b', request);

      expect(first.outcome).toBe('updated');
      expect(second.outcome).toBe('updated');
      expect(
        (await harness.createService().get(request, FLOOR, 'space-a'))?.settings?.autonomy
      ).toBe('supervised');
      expect(
        (await harness.createService().get(request, FLOOR, 'space-b'))?.settings?.autonomy
      ).toBe('assisted');
    });

    it('omits settings when durable workflow state cannot be read', async () => {
      const harness = createPersistentHarness();
      const service = harness.createService();
      await service.update(
        FLOOR,
        { autonomyLevel: 'assisted', settingsRevision: null },
        SPACE,
        request
      );
      jest
        .mocked(harness.managedWorkflows.getInstalledWorkflowState)
        .mockRejectedValueOnce(new Error('state unavailable'));

      const body = await service.get(request, FLOOR, SPACE);

      expect(body?.watch.id).toBe(FLOOR);
      expect(body?.settings).toBeUndefined();
      expect(body?.settingsRevision).toBeNull();
    });

    it('accepts consecutive settings saves', async () => {
      const harness = createPersistentHarness();
      const service = harness.createService();

      const first = await service.update(
        FLOOR,
        { autonomyLevel: 'assisted', settingsRevision: null },
        SPACE,
        request
      );
      expect(first.outcome).toBe('updated');
      if (first.outcome !== 'updated') throw new Error('Expected first update to succeed');
      expect(first.response.settingsRevision).toBe(1);

      const second = await service.update(
        FLOOR,
        { autonomyLevel: 'supervised', settingsRevision: first.response.settingsRevision },
        SPACE,
        request
      );

      expect(second.outcome).toBe('updated');
      expect(second.outcome === 'updated' ? second.response.settings?.autonomy : undefined).toBe(
        'supervised'
      );
      expect(second.outcome === 'updated' ? second.response.settingsRevision : undefined).toBe(2);
    });

    it('rejects a settings revision that was stale before the patch began', async () => {
      const harness = createPersistentHarness();
      const service = harness.createService();

      await service.update(
        FLOOR,
        { autonomyLevel: 'assisted', settingsRevision: null },
        SPACE,
        request
      );

      await expect(
        service.update(
          FLOOR,
          { autonomyLevel: 'supervised', settingsRevision: null },
          SPACE,
          request
        )
      ).resolves.toEqual({ outcome: 'conflict' });
    });

    it('rejects a settings update that omits its revision', async () => {
      const harness = createPersistentHarness();

      await expect(
        harness.createService().update(FLOOR, { autonomyLevel: 'assisted' }, SPACE, request)
      ).resolves.toEqual({
        outcome: 'rejected',
        what: 'a settings update without its revision',
      });
    });

    it('reports failed when a best-effort install skips an existing document update', async () => {
      const harness = createPersistentHarness();
      const service = harness.createService();
      const first = await service.update(
        FLOOR,
        { autonomyLevel: 'assisted', settingsRevision: null },
        SPACE,
        request
      );
      if (first.outcome !== 'updated') throw new Error('Expected first update to succeed');
      harness.install.mockResolvedValueOnce(undefined);

      await expect(
        service.update(
          FLOOR,
          { autonomyLevel: 'supervised', settingsRevision: first.response.settingsRevision },
          SPACE,
          request
        )
      ).resolves.toEqual({ outcome: 'failed' });
    });

    it('confirms a settings write when stored template values use a different key order', async () => {
      const harness = createPersistentHarness();
      jest
        .mocked(harness.managedWorkflows.getInstalledWorkflowState)
        .mockImplementation(async (id, spaceId) => {
          const document = harness.documents.get(id);
          if (!document?.values) return null;
          const { settingsVersion, autonomyLevel } = document.values;
          return {
            workflowId: id,
            spaceId,
            definitionId: FLOOR,
            templateValues: { autonomyLevel, settingsVersion },
            documentVersion: document.version,
          };
        });

      await expect(
        harness
          .createService()
          .update(FLOOR, { autonomyLevel: 'assisted', settingsRevision: null }, SPACE, request)
      ).resolves.toEqual(expect.objectContaining({ outcome: 'updated' }));
    });

    it('installs on enable and leaves the per-space document in place on disable', async () => {
      const harness = createPersistentHarness();
      const service = harness.createService();

      await service.update(FLOOR, { enabled: true }, 'space-a', request);
      const disabled = await service.update(FLOOR, { enabled: false }, 'space-a', request);

      expect(harness.install).toHaveBeenCalledWith(
        FLOOR,
        expect.objectContaining({ workflowIdSuffix: 'space-a' })
      );
      expect(disabled.outcome).toBe('updated');
      if (disabled.outcome !== 'updated') throw new Error('Expected disable to succeed');
      expect(disabled.response.watch.enabled).toBe(false);
      expect(harness.documents.has(`${FLOOR}-space-a`)).toBe(true);
      expect(harness.managedWorkflows.uninstall).not.toHaveBeenCalled();
    });
  });

  describe('catalogs', () => {
    it('exposes workers and skills without routes reaching into the store', async () => {
      const service = new WatchesService(
        undefined,
        undefined,
        loggingSystemMock.createLogger() as Logger,
        true
      );

      expect(service.listWorkers().length).toBeGreaterThan(0);
      expect((await service.listSkills(request, SPACE)).length).toBeGreaterThan(0);

      expect(service.setWorkerEnabled('containment', false)?.enabled).toBe(false);

      expect(service.setWorkerEnabled('nope', false)).toBeUndefined();
    });
  });
});
