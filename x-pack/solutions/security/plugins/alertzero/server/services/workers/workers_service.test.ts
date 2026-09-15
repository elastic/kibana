/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import {
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
  SYSTEM_SECURITY_WORKER_IDS,
} from '@kbn/alertzero-common';
import { getManagedWorkflowDefinition } from '@kbn/workflows/managed';
import type { PluginScopedManagedWorkflowsApi } from '@kbn/workflows/server/types';
import type { WatchWorkflowsManagementClient } from '../watches/watch_workflows_management_client';
import { WorkersService } from './workers_service';

const TRIAGE = SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID;
const ATTACK_DISCOVERY = SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID;
const RULE_TUNING = SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID;
const SPACE = 'default';
const request = {} as KibanaRequest;

interface PersistentWorkerDocument {
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
  const documents = new Map<string, PersistentWorkerDocument>();
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
      managedBy: document ? 'alertzero' : null,
      storedVersion: document ? 1 : null,
      registryVersion: 1,
      storedHash: document ? 'stored' : null,
      registryHash: 'registry',
    };
  });
  const managedWorkflows = {
    install,
    uninstall: jest.fn(),
    execute: jest.fn(),
    ready: jest.fn(),
    getWorkflowStatus,
    getInstalledWorkflowState: jest.fn(async (id: string, spaceId: string) => {
      const document = documents.get(id);
      if (!document) return null;
      return {
        workflowId: id,
        spaceId,
        definitionId: id.replace(`-${spaceId}`, ''),
        templateValues: document.values,
        documentVersion: document.version,
      };
    }),
    listInstalledWorkflowStates: jest.fn(async () => []),
  } as unknown as PluginScopedManagedWorkflowsApi;

  const scheduledTasks = new Map<string, { apiKeyId: string; interval: string | null }>();
  const updateWorkflow = jest.fn(
    async (id: string, { enabled }: { enabled: boolean }, _spaceId: string) => {
      const document = documents.get(id);
      if (!document) throw new Error('not found');
      document.enabled = enabled;
      document.version += 1;
      // Stands in for syncSchedulerAfterSave: the real scheduler re-reads the persisted document
      // and re-registers the task from its scheduled trigger, so read the interval off the YAML
      // rather than off the request.
      scheduledTasks.set(id, {
        apiKeyId: `key-${scheduledTasks.size + 1}`,
        interval: /every:\s*"([^"]+)"/.exec(document.yaml)?.[1] ?? null,
      });
      return {} as never;
    }
  );
  const management = {
    getWorkflow: jest.fn(),
    getWorkflows: jest.fn(),
    getWorkflowExecutions: jest.fn(async () => ({ results: [], page: 1, size: 10, total: 0 })),
    getWorkflowExecution: jest.fn(async () => null),
    cancelAllActiveWorkflowExecutions: jest.fn(async () => undefined),
    updateWorkflow,
  } as unknown as WatchWorkflowsManagementClient;

  return {
    documents,
    install,
    management,
    managedWorkflows,
    scheduledTasks,
    updateWorkflow,
    createService: () =>
      new WorkersService(
        management,
        Promise.resolve(managedWorkflows),
        loggingSystemMock.createLogger() as Logger
      ),
  };
};

describe('WorkersService', () => {
  it('lists every registered Worker with default settings before install', async () => {
    const response = await createPersistentHarness().createService().list(request, SPACE);

    expect(response.workers.map(({ id }) => id)).toEqual([...SYSTEM_SECURITY_WORKER_IDS]);
    expect(
      response.workers.every(
        ({ enabled, settingsRevision }) => !enabled && settingsRevision === null
      )
    ).toBe(true);
  });

  it('installs disabled defaults when settings are saved before enablement', async () => {
    const harness = createPersistentHarness();
    const result = await harness
      .createService()
      .update(
        TRIAGE,
        { settings: { autonomy: 'assisted' }, settingsRevision: null },
        SPACE,
        request
      );

    expect(result.outcome).toBe('updated');
    if (result.outcome !== 'updated')
      throw new Error('Expected configure-before-enable to succeed');
    expect(result.response.worker.enabled).toBe(false);
    expect(result.response.worker.settings.autonomy).toBe('assisted');
    expect(harness.documents.get(`${TRIAGE}-${SPACE}`)?.enabled).toBe(false);
  });

  it('keeps spaces isolated', async () => {
    const harness = createPersistentHarness();

    await harness
      .createService()
      .update(
        TRIAGE,
        { settings: { autonomy: 'supervised' }, settingsRevision: null },
        'space-a',
        request
      );
    await harness
      .createService()
      .update(
        TRIAGE,
        { settings: { autonomy: 'assisted' }, settingsRevision: null },
        'space-b',
        request
      );

    expect((await harness.createService().get(TRIAGE, request, 'space-a'))?.settings.autonomy).toBe(
      'supervised'
    );
    expect((await harness.createService().get(TRIAGE, request, 'space-b'))?.settings.autonomy).toBe(
      'assisted'
    );
  });

  it('rejects a stale settings revision', async () => {
    const harness = createPersistentHarness();
    const service = harness.createService();
    await service.update(
      TRIAGE,
      { settings: { autonomy: 'assisted' }, settingsRevision: null },
      SPACE,
      request
    );

    await expect(
      service.update(
        TRIAGE,
        { settings: { autonomy: 'supervised' }, settingsRevision: null },
        SPACE,
        request
      )
    ).resolves.toEqual({ outcome: 'conflict' });
  });

  it('reports failed when a best-effort install skips an existing document update', async () => {
    const harness = createPersistentHarness();
    const service = harness.createService();
    const first = await service.update(
      TRIAGE,
      { settings: { autonomy: 'assisted' }, settingsRevision: null },
      SPACE,
      request
    );
    if (first.outcome !== 'updated') throw new Error('Expected first update to succeed');
    harness.install.mockResolvedValueOnce(undefined);

    await expect(
      service.update(
        TRIAGE,
        {
          settings: { autonomy: 'supervised' },
          settingsRevision: first.response.worker.settingsRevision,
        },
        SPACE,
        request
      )
    ).resolves.toEqual({ outcome: 'failed' });
  });

  it('resyncs Task Manager after a settings-only save', async () => {
    const harness = createPersistentHarness();
    const service = harness.createService();
    const enabled = await service.update(TRIAGE, { enabled: true }, SPACE, request);
    if (enabled.outcome !== 'updated') throw new Error('Expected enable to succeed');
    harness.updateWorkflow.mockClear();
    harness.scheduledTasks.clear();

    const result = await service.update(
      TRIAGE,
      {
        settings: { autonomy: 'assisted' },
        settingsRevision: enabled.response.worker.settingsRevision,
      },
      SPACE,
      request
    );

    expect(result.outcome).toBe('updated');
    expect(harness.updateWorkflow).toHaveBeenCalledWith(
      `${TRIAGE}-${SPACE}`,
      { enabled: true },
      SPACE,
      request
    );
    expect(harness.scheduledTasks.get(`${TRIAGE}-${SPACE}`)?.apiKeyId).toEqual(expect.any(String));
  });

  it('re-registers the schedule at the new interval after a schedule-only save', async () => {
    const harness = createPersistentHarness();
    const service = harness.createService();
    const enabled = await service.update(ATTACK_DISCOVERY, { enabled: true }, SPACE, request);
    if (enabled.outcome !== 'updated') throw new Error('Expected enable to succeed');
    const workflowId = `${ATTACK_DISCOVERY}-${SPACE}`;

    expect(enabled.response.worker.settings.scheduleInterval).toBe('24h');
    expect(harness.scheduledTasks.get(workflowId)?.interval).toBe('24h');
    harness.updateWorkflow.mockClear();

    const result = await service.update(
      ATTACK_DISCOVERY,
      {
        settings: { scheduleInterval: '15m' },
        settingsRevision: enabled.response.worker.settingsRevision,
      },
      SPACE,
      request
    );

    expect(result.outcome).toBe('updated');
    if (result.outcome !== 'updated') throw new Error('Expected schedule save to succeed');
    expect(result.response.worker.settings.scheduleInterval).toBe('15m');
    // The install rewrites the YAML but never touches Task Manager; this resync is the only thing
    // that re-registers the task, so without it the Worker would keep firing every 24h.
    expect(harness.updateWorkflow).toHaveBeenCalledWith(
      workflowId,
      { enabled: true },
      SPACE,
      request
    );
    expect(harness.documents.get(workflowId)?.yaml).toContain('every: "15m"');
    expect(harness.scheduledTasks.get(workflowId)?.interval).toBe('15m');
  });

  it('treats a schedule-only patch as a settings write that needs its revision', async () => {
    const harness = createPersistentHarness();
    const service = harness.createService();
    const enabled = await service.update(ATTACK_DISCOVERY, { enabled: true }, SPACE, request);
    if (enabled.outcome !== 'updated') throw new Error('Expected enable to succeed');

    await expect(
      service.update(ATTACK_DISCOVERY, { settings: { scheduleInterval: '15m' } }, SPACE, request)
    ).resolves.toEqual({
      outcome: 'rejected',
      what: 'a settings update without its revision',
    });
    await expect(
      service.update(
        ATTACK_DISCOVERY,
        { settings: { scheduleInterval: '15m' }, settingsRevision: 999 },
        SPACE,
        request
      )
    ).resolves.toEqual({ outcome: 'conflict' });
  });

  it('treats an extras-only patch as a settings write that persists', async () => {
    const harness = createPersistentHarness();
    const service = harness.createService();
    const enabled = await service.update(RULE_TUNING, { enabled: true }, SPACE, request);
    if (enabled.outcome !== 'updated') throw new Error('Expected enable to succeed');

    // Without treating extras as a settings-touching field, this patch would be silently dropped:
    // touchesSettings would stay false and update() would fall straight through to the enabled-only
    // branch, never calling applyPatch/install for the extras value.
    const result = await service.update(
      RULE_TUNING,
      {
        settings: { extras: { analysisWindowDays: 21 } },
        settingsRevision: enabled.response.worker.settingsRevision,
      },
      SPACE,
      request
    );

    expect(result.outcome).toBe('updated');
    if (result.outcome !== 'updated') throw new Error('Expected extras save to succeed');
    expect(result.response.worker.settings.extras).toEqual({ analysisWindowDays: 21 });

    await expect(
      service.update(
        RULE_TUNING,
        { settings: { extras: { analysisWindowDays: 7 } } },
        SPACE,
        request
      )
    ).resolves.toEqual({
      outcome: 'rejected',
      what: 'a settings update without its revision',
    });
  });

  it('rejects an enabled-only patch without its revision once the Worker is installed', async () => {
    // decisions item 15: the enabled toggle is a concurrent-write surface too. Once the document
    // exists, toggling enabled without settingsRevision must be rejected; a stale revision must
    // conflict. The first enable (no document) is exempt — see the install-defaults test below.
    const harness = createPersistentHarness();
    const service = harness.createService();
    const enabled = await service.update(TRIAGE, { enabled: true }, SPACE, request);
    if (enabled.outcome !== 'updated') throw new Error('Expected first enable to succeed');

    await expect(service.update(TRIAGE, { enabled: false }, SPACE, request)).resolves.toEqual({
      outcome: 'rejected',
      what: 'a settings update without its revision',
    });

    await expect(
      service.update(TRIAGE, { enabled: false, settingsRevision: 999 }, SPACE, request)
    ).resolves.toEqual({ outcome: 'conflict' });
  });

  it('rejects a PATCH whose autonomy level the Worker does not allow', async () => {
    const harness = createPersistentHarness();
    const service = harness.createService();
    const enabled = await service.update(RULE_TUNING, { enabled: true }, SPACE, request);
    if (enabled.outcome !== 'updated') throw new Error('Expected enable to succeed');

    // The route schema bounds autonomy to the global enum; the service must ALSO enforce the
    // per-Worker allowed set (schema-derived) so a narrowed schema cannot be bypassed by a
    // direct PATCH. 'bogus' stands in for any level outside the Worker's allowed set.
    const result = await service.update(
      RULE_TUNING,
      {
        settings: { autonomy: 'bogus' as never },
        settingsRevision: enabled.response.worker.settingsRevision,
      },
      SPACE,
      request
    );

    expect(result).toEqual({
      outcome: 'rejected',
      what: "autonomy level 'bogus' (this Worker allows manual, assisted, supervised)",
    });
  });

  it('installs defaults when disabling a Worker that has no document yet', async () => {
    const harness = createPersistentHarness();
    const result = await harness.createService().update(TRIAGE, { enabled: false }, SPACE, request);

    expect(result.outcome).toBe('updated');
    if (result.outcome !== 'updated') throw new Error('Expected disable-on-missing to succeed');
    expect(harness.install).toHaveBeenCalledWith(
      TRIAGE,
      expect.objectContaining({ workflowIdSuffix: SPACE })
    );
    expect(result.response.worker.enabled).toBe(false);
    expect(harness.documents.has(`${TRIAGE}-${SPACE}`)).toBe(true);
    expect(harness.documents.get(`${TRIAGE}-${SPACE}`)?.enabled).toBe(false);
  });

  it('projects unavailable when installed settings cannot be read', async () => {
    const harness = createPersistentHarness();
    const service = harness.createService();
    await service.update(TRIAGE, { enabled: true }, SPACE, request);
    (harness.managedWorkflows.getInstalledWorkflowState as jest.Mock).mockRejectedValueOnce(
      new Error('storage down')
    );

    const worker = await service.get(TRIAGE, request, SPACE);

    expect(worker?.state).toBe('unavailable');
    expect(worker?.stateReason).toBe('Worker settings could not be read from durable storage');
    expect(worker?.settingsRevision).toBeNull();
    expect(worker?.enabled).toBe(true);
  });

  it('projects unavailable when the installed document has no template values', async () => {
    const harness = createPersistentHarness();
    const service = harness.createService();
    await service.update(TRIAGE, { enabled: true }, SPACE, request);
    (harness.managedWorkflows.getInstalledWorkflowState as jest.Mock).mockResolvedValueOnce({
      workflowId: `${TRIAGE}-${SPACE}`,
      spaceId: SPACE,
      definitionId: TRIAGE,
      templateValues: null,
      documentVersion: 2,
    });

    const worker = await service.get(TRIAGE, request, SPACE);

    expect(worker?.state).toBe('unavailable');
    expect(worker?.stateReason).toBe('Worker settings could not be read from durable storage');
    expect(worker?.settingsRevision).toBeNull();
  });

  it('installs on enable and leaves the per-space document in place on disable', async () => {
    const harness = createPersistentHarness();
    const service = harness.createService();

    const enableResult = await service.update(TRIAGE, { enabled: true }, 'space-a', request);
    if (enableResult.outcome !== 'updated') throw new Error('Expected enable to succeed');
    const disabled = await service.update(
      TRIAGE,
      { enabled: false, settingsRevision: enableResult.response.worker.settingsRevision },
      'space-a',
      request
    );

    expect(harness.install).toHaveBeenCalledWith(
      TRIAGE,
      expect.objectContaining({ workflowIdSuffix: 'space-a' })
    );
    expect(disabled.outcome).toBe('updated');
    if (disabled.outcome !== 'updated') throw new Error('Expected disable to succeed');
    expect(disabled.response.worker.enabled).toBe(false);
    expect(harness.documents.has(`${TRIAGE}-space-a`)).toBe(true);
  });

  it('projects skills from the installed workflow definition when the worker is installed', async () => {
    const harness = createPersistentHarness();
    const service = harness.createService();
    await service.update(TRIAGE, { enabled: true }, SPACE, request);

    const mockDefinition = {
      steps: [
        {
          name: 'invoke-agent',
          type: 'ai.agent',
          with: { configuration_overrides: { skill_ids: ['test.installed.skill'] } },
        },
      ],
    };
    (harness.management.getWorkflow as jest.Mock).mockResolvedValueOnce({
      id: `${TRIAGE}-${SPACE}`,
      definition: mockDefinition,
    });

    const { workers } = await service.list(request, SPACE);
    const triage = workers.find((w) => w.id === TRIAGE);

    expect(harness.management.getWorkflow).toHaveBeenCalledWith(`${TRIAGE}-${SPACE}`, SPACE);
    expect(triage?.skills?.some((s) => s.id === 'test.installed.skill')).toBe(true);
  });

  it('projects skills from the template definition when the worker is not installed', async () => {
    const harness = createPersistentHarness();

    const { workers } = await harness.createService().list(request, SPACE);
    const triage = workers.find((w) => w.id === TRIAGE);

    expect(harness.management.getWorkflow).not.toHaveBeenCalled();
    expect(Array.isArray(triage?.skills)).toBe(true);
  });

  it('persists a custom-only analysis window and forwards it into rendered YAML', async () => {
    const harness = createPersistentHarness();
    const service = harness.createService();
    const enabled = await service.update(RULE_TUNING, { enabled: true }, SPACE, request);
    if (enabled.outcome !== 'updated') throw new Error('Expected enable to succeed');

    const result = await service.update(
      RULE_TUNING,
      {
        settings: { extras: { analysisWindowDays: 7 } },
        settingsRevision: enabled.response.worker.settingsRevision,
      },
      SPACE,
      request
    );

    expect(result.outcome).toBe('updated');
    if (result.outcome !== 'updated') throw new Error('Expected analysis window save to succeed');
    expect(result.response.worker.settings).toEqual({
      workerId: RULE_TUNING,
      autonomy: 'manual',
      scheduleInterval: '2h',
      extras: { analysisWindowDays: 7 },
    });
    expect(harness.documents.get(`${RULE_TUNING}-${SPACE}`)?.yaml).toContain(
      'analysis_window_days: 7'
    );
    expect(harness.documents.get(`${RULE_TUNING}-${SPACE}`)?.yaml).not.toContain(
      '__WORKER_ANALYSIS_WINDOW_DAYS__'
    );
  });

  it('rejects an unknown settings field and a wrong-Worker analysis window', async () => {
    const harness = createPersistentHarness();
    const service = harness.createService();

    await expect(
      service.update(
        TRIAGE,
        { settings: { extras: { analysisWindowDays: 7 } }, settingsRevision: null },
        SPACE,
        request
      )
    ).resolves.toEqual({ outcome: 'rejected', what: 'an analysis window' });
  });
});
