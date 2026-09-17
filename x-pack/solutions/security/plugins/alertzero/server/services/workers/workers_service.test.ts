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

  it('lists a Worker whose stored settings no longer match the current shape as unavailable', async () => {
    const harness = createPersistentHarness();
    const service = harness.createService();
    await service.update(RULE_TUNING, { enabled: true }, SPACE, request);
    // A document from an older development shape: no interval, no extras. It stays in the
    // persistent store, so every read (list and get) sees it.
    const document = harness.documents.get(`${RULE_TUNING}-${SPACE}`);
    if (!document) throw new Error('Expected the Rule Tuning document to be installed');
    document.values = { settingsVersion: 1, autonomyLevel: 'manual' };

    const { workers } = await service.list(request, SPACE);
    const ruleTuning = workers.find(({ id }) => id === RULE_TUNING);

    expect(workers.map(({ id }) => id)).toEqual([...SYSTEM_SECURITY_WORKER_IDS]);
    expect(ruleTuning).toMatchObject({
      state: 'unavailable',
      stateReason: 'Worker settings could not be read from durable storage',
      settingsRevision: null,
      enabled: true,
      settings: {
        workerId: RULE_TUNING,
        autonomy: 'manual',
        scheduleInterval: '2h',
        extras: { analysisWindowDays: 14 },
      },
    });
    expect(
      workers.filter(({ id }) => id !== RULE_TUNING).every(({ state }) => state !== 'unavailable')
    ).toBe(true);
  });

  it('installs on enable and leaves the per-space document in place on disable', async () => {
    const harness = createPersistentHarness();
    const service = harness.createService();

    await service.update(TRIAGE, { enabled: true }, 'space-a', request);
    const disabled = await service.update(TRIAGE, { enabled: false }, 'space-a', request);

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

  describe('Worker-specific settings under extras', () => {
    const enableRuleTuning = async () => {
      const harness = createPersistentHarness();
      const service = harness.createService();
      const enabled = await service.update(RULE_TUNING, { enabled: true }, SPACE, request);
      if (enabled.outcome !== 'updated') throw new Error('Expected enable to succeed');
      return { harness, service, revision: enabled.response.worker.settingsRevision };
    };

    it('persists an extras-only save and forwards the window into the rendered YAML', async () => {
      const { harness, service, revision } = await enableRuleTuning();

      const result = await service.update(
        RULE_TUNING,
        { settings: { extras: { analysisWindowDays: 7 } }, settingsRevision: revision },
        SPACE,
        request
      );

      expect(result.outcome).toBe('updated');
      if (result.outcome !== 'updated') throw new Error('Expected extras save to succeed');
      expect(result.response.worker.settings).toEqual({
        workerId: RULE_TUNING,
        autonomy: 'manual',
        scheduleInterval: '2h',
        extras: { analysisWindowDays: 7 },
      });
      const yaml = harness.documents.get(`${RULE_TUNING}-${SPACE}`)?.yaml;
      expect(yaml).toContain('analysis_window_days: 7');
      expect(yaml).not.toContain('__WORKER_ANALYSIS_WINDOW_DAYS__');
    });

    it('keeps the saved extras when a shared-field patch omits them', async () => {
      const { service, revision } = await enableRuleTuning();
      const withWindow = await service.update(
        RULE_TUNING,
        { settings: { extras: { analysisWindowDays: 7 } }, settingsRevision: revision },
        SPACE,
        request
      );
      if (withWindow.outcome !== 'updated') throw new Error('Expected extras save to succeed');

      const result = await service.update(
        RULE_TUNING,
        {
          settings: { autonomy: 'assisted' },
          settingsRevision: withWindow.response.worker.settingsRevision,
        },
        SPACE,
        request
      );

      expect(result.outcome).toBe('updated');
      if (result.outcome !== 'updated') throw new Error('Expected autonomy save to succeed');
      expect(result.response.worker.settings).toEqual(
        expect.objectContaining({ autonomy: 'assisted', extras: { analysisWindowDays: 7 } })
      );
    });

    it('refuses a stale extras-only save and leaves the stored settings alone', async () => {
      const { service, revision } = await enableRuleTuning();
      const first = await service.update(
        RULE_TUNING,
        { settings: { extras: { analysisWindowDays: 7 } }, settingsRevision: revision },
        SPACE,
        request
      );
      if (first.outcome !== 'updated') throw new Error('Expected first save to succeed');

      // Same pre-save revision again: someone else's write landed in between.
      await expect(
        service.update(
          RULE_TUNING,
          { settings: { extras: { analysisWindowDays: 21 } }, settingsRevision: revision },
          SPACE,
          request
        )
      ).resolves.toEqual({ outcome: 'conflict' });
      expect((await service.get(RULE_TUNING, request, SPACE))?.settings.extras).toEqual({
        analysisWindowDays: 7,
      });
    });

    it('rejects an extras replacement missing a required field, naming it', async () => {
      const { service, revision } = await enableRuleTuning();

      const result = await service.update(
        RULE_TUNING,
        { settings: { extras: {} }, settingsRevision: revision },
        SPACE,
        request
      );

      expect(result.outcome).toBe('invalid');
      if (result.outcome !== 'invalid') throw new Error('Expected an invalid outcome');
      expect(result.message).toContain('extras.analysisWindowDays');
    });

    it("rejects another Worker's extras field, naming it", async () => {
      const result = await createPersistentHarness()
        .createService()
        .update(
          TRIAGE,
          { settings: { extras: { analysisWindowDays: 7 } }, settingsRevision: null },
          SPACE,
          request
        );

      expect(result.outcome).toBe('invalid');
      if (result.outcome !== 'invalid') throw new Error('Expected an invalid outcome');
      expect(result.message).toMatch(/extras/);
    });

    it('rejects a schedule interval on a Worker that owns no schedule, naming it', async () => {
      const result = await createPersistentHarness()
        .createService()
        .update(
          TRIAGE,
          { settings: { scheduleInterval: '15m' }, settingsRevision: null },
          SPACE,
          request
        );

      expect(result.outcome).toBe('invalid');
      if (result.outcome !== 'invalid') throw new Error('Expected an invalid outcome');
      expect(result.message).toContain('scheduleInterval');
    });
  });

  describe('alert triage worker opts', () => {
    const makeAttachmentService = (
      opts: { notAttachedIds?: string[]; attachedIds?: string[] } = {}
    ) => {
      const { notAttachedIds = ['rule-1', 'rule-2'], attachedIds = [] } = opts;
      return {
        getRuleAttachmentSelection: jest.fn(
          async ({ attachmentFilter }: { search: string; attachmentFilter: string }) =>
            attachmentFilter === 'not_attached'
              ? { ruleIds: notAttachedIds, attachedRuleIds: [] }
              : { ruleIds: [], attachedRuleIds: attachedIds }
        ),
        updateRuleAttachments: jest.fn(async () => undefined),
      };
    };

    const makeService = (
      harness: ReturnType<typeof createPersistentHarness>,
      attachment: ReturnType<typeof makeAttachmentService> | null,
      alertTriageWorkerEnabled = true,
      isAlertAnalysisRuntimeEnabled?: () => Promise<boolean>
    ) =>
      new WorkersService(
        harness.management,
        Promise.resolve(harness.managedWorkflows),
        loggingSystemMock.createLogger() as Logger,
        {},
        {
          alertTriageWorkerEnabled,
          getAttachmentService: attachment ? (jest.fn(async () => attachment) as any) : undefined,
          isAlertAnalysisRuntimeEnabled,
        }
      );

    it('flag off: enable does not attach rules to any detection rule', async () => {
      const harness = createPersistentHarness();
      const attachment = makeAttachmentService();
      const service = makeService(harness, attachment, false);

      await service.update(TRIAGE, { enabled: true }, SPACE, request);

      expect(attachment.getRuleAttachmentSelection).not.toHaveBeenCalled();
      expect(attachment.updateRuleAttachments).not.toHaveBeenCalled();
    });

    it('preflight fail: rejects with named message and does not enable the Worker', async () => {
      const harness = createPersistentHarness();
      (harness.management.getWorkflow as jest.Mock).mockResolvedValueOnce({ enabled: false });
      const attachment = makeAttachmentService();
      const service = makeService(harness, attachment);

      const result = await service.update(TRIAGE, { enabled: true }, SPACE, request);

      expect(result).toMatchObject({
        outcome: 'rejected',
        what: expect.stringContaining('Alert Analysis workflow'),
      });
      expect(harness.updateWorkflow).not.toHaveBeenCalled();
    });

    // The preflight check must not be gated on getAttachmentService being present.
    // In environments where securitySolution plugin is absent the attachment service
    // is undefined, but the runtime config guard must still block the enable.
    it('runtime config off: rejects even when attachment service is absent', async () => {
      const harness = createPersistentHarness();
      const service = makeService(harness, undefined, true, async () => false);

      const result = await service.update(TRIAGE, { enabled: true }, SPACE, request);

      expect(result).toMatchObject({
        outcome: 'rejected',
        what: expect.stringContaining('alert analysis'),
      });
      expect(harness.updateWorkflow).not.toHaveBeenCalled();
    });

    // The workflow's `enabled` flag is not sufficient on its own. It installs enabled, but
    // `securitySolution:alertAnalysisWorkflowEnabled` now defaults to false, and with that off
    // the workflow's own guard short-circuits: it completes having classified nothing, so the
    // Worker reports success while triaging no alerts. Enabling into that state is worse than
    // refusing, because nothing anywhere reports a problem.
    it('runtime config off: rejects even though the workflow itself is enabled', async () => {
      const harness = createPersistentHarness();
      const attachment = makeAttachmentService();
      const service = makeService(harness, attachment, true, async () => false);

      const result = await service.update(TRIAGE, { enabled: true }, SPACE, request);

      expect(result).toMatchObject({
        outcome: 'rejected',
        what: expect.stringContaining('alert analysis'),
      });
      expect(harness.updateWorkflow).not.toHaveBeenCalled();
      expect(attachment.updateRuleAttachments).not.toHaveBeenCalled();
    });

    // An unreadable setting must not make the Worker permanently un-enableable: a failed read
    // is not evidence that analysis is off.
    it('runtime config unreadable: falls through to the remaining checks', async () => {
      const harness = createPersistentHarness();
      const attachment = makeAttachmentService();
      const service = makeService(harness, attachment, true, async () => {
        throw new Error('uiSettings unavailable');
      });

      expect((await service.update(TRIAGE, { enabled: true }, SPACE, request)).outcome).toBe(
        'updated'
      );
    });

    it('attach-then-enable: attaches rules and enables Worker when preflight passes', async () => {
      const harness = createPersistentHarness();
      const attachment = makeAttachmentService();
      const service = makeService(harness, attachment);

      const result = await service.update(TRIAGE, { enabled: true }, SPACE, request);

      expect(result.outcome).toBe('updated');
      expect(attachment.updateRuleAttachments).toHaveBeenCalledWith({
        attachRuleIds: ['rule-1', 'rule-2'],
        detachRuleIds: [],
      });
      expect(harness.updateWorkflow).toHaveBeenCalledWith(
        `${TRIAGE}-${SPACE}`,
        { enabled: true },
        SPACE,
        request
      );
    });

    it('attach fails: Worker stays disabled (updateWorkflow not called)', async () => {
      const harness = createPersistentHarness();
      const attachment = makeAttachmentService();
      attachment.updateRuleAttachments.mockRejectedValueOnce(new Error('bulk edit failed'));
      const service = makeService(harness, attachment);

      await expect(service.update(TRIAGE, { enabled: true }, SPACE, request)).rejects.toThrow(
        'bulk edit failed'
      );
      expect(harness.updateWorkflow).not.toHaveBeenCalled();
    });

    it('disable: detaches all attached rules after disabling the Worker', async () => {
      const harness = createPersistentHarness();
      const attachment = makeAttachmentService({ notAttachedIds: ['r1'], attachedIds: ['r1'] });
      const service = makeService(harness, attachment);
      await service.update(TRIAGE, { enabled: true }, SPACE, request);
      attachment.updateRuleAttachments.mockClear();
      attachment.getRuleAttachmentSelection.mockClear();

      const result = await service.update(TRIAGE, { enabled: false }, SPACE, request);

      expect(result.outcome).toBe('updated');
      expect(attachment.getRuleAttachmentSelection).toHaveBeenCalledWith({
        search: '',
        attachmentFilter: 'attached',
      });
      expect(attachment.updateRuleAttachments).toHaveBeenCalledWith({
        attachRuleIds: [],
        detachRuleIds: ['r1'],
      });
    });

    it('idempotent enable: skips attachment when all rules are already attached', async () => {
      const harness = createPersistentHarness();
      const attachment = makeAttachmentService({ notAttachedIds: [] });
      const service = makeService(harness, attachment);

      const result = await service.update(TRIAGE, { enabled: true }, SPACE, request);

      expect(result.outcome).toBe('updated');
      expect(attachment.getRuleAttachmentSelection).toHaveBeenCalledWith({
        search: '',
        attachmentFilter: 'not_attached',
      });
      expect(attachment.updateRuleAttachments).not.toHaveBeenCalled();
    });

    it('detach error does not fail the disable operation', async () => {
      const harness = createPersistentHarness();
      const attachment = makeAttachmentService({ notAttachedIds: ['r1'], attachedIds: ['r1'] });
      const service = makeService(harness, attachment);
      await service.update(TRIAGE, { enabled: true }, SPACE, request);
      attachment.updateRuleAttachments.mockRejectedValueOnce(new Error('network error'));

      const result = await service.update(TRIAGE, { enabled: false }, SPACE, request);

      expect(result.outcome).toBe('updated');
      if (result.outcome !== 'updated') throw new Error();
      expect(result.response.worker.enabled).toBe(false);
    });
  });
});
