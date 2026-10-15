/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse } from 'yaml';
import type { KibanaRequest, Logger } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { createAnalytics } from '@elastic/ebt/client';
import { loggerMock } from '@kbn/logging-mocks';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import {
  RULE_TUNING_DEFAULT_EXTRAS,
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
  SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID,
  SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID,
  SYSTEM_SECURITY_WORKER_IDS,
} from '@kbn/alertzero-common';
import {
  getManagedWorkflowDefinition,
  SECURITY_ALERT_ANALYSIS_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import type { PluginScopedManagedWorkflowsApi } from '@kbn/workflows/server/types';
import type { ThreatIntelSupplyService } from '../threat_intel_supply';
import {
  ThreatIntelSupplyHardGateError,
  ThreatIntelSupplyNotInstalledError,
} from '../threat_intel_supply';
import type { AlertZeroTelemetryReporter } from '../../telemetry';
import {
  ALERTZERO_TELEMETRY_EVENTS,
  createAlertZeroTelemetryReporter,
  registerAlertZeroTelemetryEvents,
} from '../../telemetry';
import type { WatchWorkflowsManagementClient } from '../watches/watch_workflows_management_client';
import { WorkersService } from './workers_service';
import type { GetWorkerBlockingReasons } from './worker_blocking_reasons';

const TRIAGE = SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID;
const ATTACK_DISCOVERY = SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID;
const RULE_TUNING = SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID;
const FORENSICS = SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID;
const HUNT = SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID;
const SPACE = 'default';
const request = {} as KibanaRequest;
const WORKERS_WITHOUT_FORENSIC_SKILL = SYSTEM_SECURITY_WORKER_IDS.filter((id) => id !== FORENSICS);

const agentBuilderWithSkill = (present: boolean): AgentBuilderPluginStart =>
  ({
    skills: {
      getRegistry: jest.fn(async () => ({
        has: jest.fn(
          async (skillId: string) => present && skillId === 'endpoint-forensic-analysis'
        ),
      })),
    },
  } as unknown as AgentBuilderPluginStart);

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

/** Not `<workerId>-<spaceId>`, so a projection that rebuilds that convention fails. */
const reportedWorkflowId = (workerId: string, spaceId: string) => `opaque:${workerId}:${spaceId}`;
const storedIdFromReport = (workflowId: string) =>
  workflowId.startsWith('opaque:')
    ? workflowId.slice('opaque:'.length).replace(':', '-')
    : workflowId;

const createPersistentHarness = () => {
  const documents = new Map<string, PersistentWorkerDocument>();
  const documentId = (id: string, spaceId: string) => `${id}-${spaceId}`;
  const findDocument = (workflowId: string) => documents.get(storedIdFromReport(workflowId));
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
      workflowId: reportedWorkflowId(id, options.spaceId),
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
      const document = findDocument(id);
      if (!document) return null;
      return {
        workflowId: id,
        spaceId,
        definitionId: storedIdFromReport(id).replace(`-${spaceId}`, ''),
        templateValues: document.values,
        documentVersion: document.version,
      };
    }),
    listInstalledWorkflowStates: jest.fn(async () => []),
  } as unknown as PluginScopedManagedWorkflowsApi;

  const scheduledTasks = new Map<string, { apiKeyId: string; interval: string | null }>();
  const updateWorkflow = jest.fn(
    async (id: string, { enabled }: { enabled: boolean }, _spaceId: string) => {
      const document = findDocument(id);
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
    // Present-and-enabled by default, representing a healthy deployment; tests that exercise
    // the Alert Analysis preflight check override this per-call to cover the blocked cases.
    getWorkflow: jest.fn(async () => ({ enabled: true })),
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
    createService: (
      agentBuilder?: AgentBuilderPluginStart,
      getBlockingReasons: GetWorkerBlockingReasons = async () => [],
      telemetryReporter?: AlertZeroTelemetryReporter
    ) => {
      return new WorkersService(
        management,
        Promise.resolve(managedWorkflows),
        loggingSystemMock.createLogger() as Logger,
        { agentBuilder, telemetryReporter },
        async (_request, registration, options) => {
          await install(registration.id, options);
        },
        getBlockingReasons
      );
    },
  };
};

describe('WorkersService', () => {
  it('lists every registered Worker with default settings before install', async () => {
    const response = await createPersistentHarness().createService().list(request, SPACE);

    // Endpoint analysis stays hidden until its skill is registered.
    expect(response.workers.map(({ id }) => id)).toEqual([...WORKERS_WITHOUT_FORENSIC_SKILL]);
    expect(
      response.workers.every(
        ({ enabled, settingsRevision, workflowId }) =>
          !enabled && settingsRevision === null && workflowId === null
      )
    ).toBe(true);
  });

  it('does not check Alert Analysis dependencies while listing Workers', async () => {
    const harness = createPersistentHarness();
    const service = harness.createService();

    const response = await service.list(request, SPACE);
    expect(response.workers.find(({ id }) => id === TRIAGE)?.enabled).toBe(false);
    expect(harness.management.getWorkflow).not.toHaveBeenCalled();
  });

  it('rejects enabling a worker that has no service account', async () => {
    const harness = createPersistentHarness();
    const result = await harness.createService().update(TRIAGE, { enabled: true }, SPACE, request);

    expect(result).toEqual({
      outcome: 'rejected',
      what: 'a worker that is enabled without a service account',
    });
    expect(harness.install).not.toHaveBeenCalled();
  });

  describe('an already-enabled worker with no stored account', () => {
    const installEnabledWithoutAccount = async () => {
      const harness = createPersistentHarness();
      const service = harness.createService();
      const saved = await service.update(
        ATTACK_DISCOVERY,
        { settings: { scheduleInterval: '24h' }, settingsRevision: null },
        SPACE,
        request
      );
      if (saved.outcome !== 'updated') throw new Error('Expected the worker to install');
      const document = harness.documents.get(`${ATTACK_DISCOVERY}-${SPACE}`);
      if (!document) throw new Error('Expected an installed worker');
      document.enabled = true;
      harness.install.mockClear();
      harness.updateWorkflow.mockClear();
      return { harness, service, revision: saved.response.worker.settingsRevision };
    };

    it('rejects a settings save that would leave it on', async () => {
      const { harness, service, revision } = await installEnabledWithoutAccount();

      const result = await service.update(
        ATTACK_DISCOVERY,
        { settings: { scheduleInterval: '15m' }, settingsRevision: revision },
        SPACE,
        request
      );

      expect(result).toEqual({
        outcome: 'rejected',
        what: 'a worker that is enabled without a service account',
      });
      expect(harness.install).not.toHaveBeenCalled();
      expect(harness.updateWorkflow).not.toHaveBeenCalled();
    });

    it('rejects a save that keeps it enabled', async () => {
      const { harness, service } = await installEnabledWithoutAccount();

      const result = await service.update(ATTACK_DISCOVERY, { enabled: true }, SPACE, request);

      expect(result).toEqual({
        outcome: 'rejected',
        what: 'a worker that is enabled without a service account',
      });
      expect(harness.install).not.toHaveBeenCalled();
      expect(harness.updateWorkflow).not.toHaveBeenCalled();
    });

    it('allows turning it off without an account', async () => {
      const { harness, service } = await installEnabledWithoutAccount();

      const result = await service.update(ATTACK_DISCOVERY, { enabled: false }, SPACE, request);

      expect(result.outcome).toBe('updated');
      if (result.outcome !== 'updated') throw new Error('Expected disable to succeed');
      expect(result.response.worker.enabled).toBe(false);
      expect(harness.install).not.toHaveBeenCalled();
      expect(harness.documents.get(`${ATTACK_DISCOVERY}-${SPACE}`)?.enabled).toBe(false);
    });

    it('accepts an account at the current revision and resynchronizes the worker', async () => {
      const { harness, service, revision } = await installEnabledWithoutAccount();
      const workflowId = reportedWorkflowId(ATTACK_DISCOVERY, SPACE);

      const result = await service.update(
        ATTACK_DISCOVERY,
        { settings: { serviceAccountId: 'sa-1' }, settingsRevision: revision },
        SPACE,
        request
      );

      expect(result.outcome).toBe('updated');
      expect(harness.install).toHaveBeenCalledWith(
        ATTACK_DISCOVERY,
        expect.objectContaining({
          values: expect.objectContaining({ serviceAccountId: 'sa-1' }),
        })
      );
      expect(harness.updateWorkflow).toHaveBeenCalledWith(
        workflowId,
        { enabled: true },
        SPACE,
        request
      );
      expect(harness.scheduledTasks.get(workflowId)?.apiKeyId).toEqual(expect.any(String));
    });
  });

  it('installs a user save through the request-scoped client', async () => {
    const harness = createPersistentHarness();
    const installWorkerForRequest = jest.fn(async (_request, registration, options) => {
      await harness.managedWorkflows.install(registration.id, options);
    });
    const service = new WorkersService(
      harness.management,
      Promise.resolve(harness.managedWorkflows),
      loggingSystemMock.createLogger() as Logger,
      {},
      installWorkerForRequest,
      async () => []
    );

    const result = await service.update(
      TRIAGE,
      {
        enabled: true,
        settings: { serviceAccountId: 'sa-1' },
        settingsRevision: null,
      },
      SPACE,
      request
    );

    expect(result.outcome).toBe('updated');
    expect(installWorkerForRequest).toHaveBeenCalledWith(
      request,
      expect.objectContaining({ id: TRIAGE }),
      expect.objectContaining({
        spaceId: SPACE,
        values: expect.objectContaining({ serviceAccountId: 'sa-1' }),
      })
    );
  });

  it('installs disabled defaults when settings are saved before enablement', async () => {
    const harness = createPersistentHarness();
    const result = await harness
      .createService()
      .update(
        TRIAGE,
        { settings: { autonomy: 'supervised' }, settingsRevision: null },
        SPACE,
        request
      );

    expect(result.outcome).toBe('updated');
    if (result.outcome !== 'updated')
      throw new Error('Expected configure-before-enable to succeed');
    expect(result.response.worker.enabled).toBe(false);
    expect(result.response.worker.settings.autonomy).toBe('supervised');
    expect(result.response.worker.workflowId).toBe(reportedWorkflowId(TRIAGE, SPACE));
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
        { settings: { autonomy: 'manual' }, settingsRevision: null },
        'space-b',
        request
      );

    expect((await harness.createService().get(TRIAGE, request, 'space-a'))?.settings.autonomy).toBe(
      'supervised'
    );
    expect((await harness.createService().get(TRIAGE, request, 'space-b'))?.settings.autonomy).toBe(
      'manual'
    );
  });

  it('rejects a stale settings revision', async () => {
    const harness = createPersistentHarness();
    const service = harness.createService();
    await service.update(
      TRIAGE,
      { settings: { autonomy: 'supervised' }, settingsRevision: null },
      SPACE,
      request
    );

    await expect(
      service.update(
        TRIAGE,
        { settings: { autonomy: 'manual' }, settingsRevision: null },
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
      { settings: { autonomy: 'supervised' }, settingsRevision: null },
      SPACE,
      request
    );
    if (first.outcome !== 'updated') throw new Error('Expected first update to succeed');
    harness.install.mockResolvedValueOnce(undefined);

    await expect(
      service.update(
        TRIAGE,
        {
          settings: { autonomy: 'manual' },
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
    const enabled = await service.update(
      TRIAGE,
      {
        enabled: true,
        settings: { serviceAccountId: 'sa-1' },
        settingsRevision: null,
      },
      SPACE,
      request
    );
    if (enabled.outcome !== 'updated') throw new Error('Expected enable to succeed');
    harness.updateWorkflow.mockClear();
    harness.scheduledTasks.clear();

    const result = await service.update(
      TRIAGE,
      {
        settings: { autonomy: 'supervised' },
        settingsRevision: enabled.response.worker.settingsRevision,
      },
      SPACE,
      request
    );

    expect(result.outcome).toBe('updated');
    expect(harness.updateWorkflow).toHaveBeenCalledWith(
      reportedWorkflowId(TRIAGE, SPACE),
      { enabled: true },
      SPACE,
      request
    );
    expect(harness.scheduledTasks.get(reportedWorkflowId(TRIAGE, SPACE))?.apiKeyId).toEqual(
      expect.any(String)
    );
  });

  it('re-registers the schedule at the new interval after a schedule-only save', async () => {
    const harness = createPersistentHarness();
    const service = harness.createService();
    const enabled = await service.update(
      ATTACK_DISCOVERY,
      {
        enabled: true,
        settings: { serviceAccountId: 'sa-1' },
        settingsRevision: null,
      },
      SPACE,
      request
    );
    if (enabled.outcome !== 'updated') throw new Error('Expected enable to succeed');
    const storedId = `${ATTACK_DISCOVERY}-${SPACE}`;
    const workflowId = reportedWorkflowId(ATTACK_DISCOVERY, SPACE);

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
    expect(harness.documents.get(storedId)?.yaml).toContain('every: "15m"');
    expect(harness.scheduledTasks.get(workflowId)?.interval).toBe('15m');
  });

  it('treats a schedule-only patch as a settings write that needs its revision', async () => {
    const harness = createPersistentHarness();
    const service = harness.createService();
    const enabled = await service.update(
      ATTACK_DISCOVERY,
      {
        enabled: true,
        settings: { serviceAccountId: 'sa-1' },
        settingsRevision: null,
      },
      SPACE,
      request
    );
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
    await service.update(
      TRIAGE,
      {
        enabled: true,
        settings: { serviceAccountId: 'sa-1' },
        settingsRevision: null,
      },
      SPACE,
      request
    );
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
    await service.update(
      TRIAGE,
      {
        enabled: true,
        settings: { serviceAccountId: 'sa-1' },
        settingsRevision: null,
      },
      SPACE,
      request
    );
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
    await service.update(
      RULE_TUNING,
      {
        enabled: true,
        settings: { serviceAccountId: 'sa-1' },
        settingsRevision: null,
      },
      SPACE,
      request
    );
    // A present value outside its bounds is not repaired, so the Worker stays unavailable.
    const document = harness.documents.get(`${RULE_TUNING}-${SPACE}`);
    if (!document) throw new Error('Expected the Rule Tuning document to be installed');
    document.values = {
      settingsVersion: 1,
      autonomyLevel: 'manual',
      scheduleInterval: '2h',
      extras: { ...RULE_TUNING_DEFAULT_EXTRAS, analysisWindowDays: 0 },
    };

    const { workers } = await service.list(request, SPACE);
    const ruleTuning = workers.find(({ id }) => id === RULE_TUNING);

    expect(workers.map(({ id }) => id)).toEqual([...WORKERS_WITHOUT_FORENSIC_SKILL]);
    expect(ruleTuning).toMatchObject({
      state: 'unavailable',
      stateReason: 'Worker settings could not be read from durable storage',
      settingsRevision: null,
      enabled: true,
      settings: {
        workerId: RULE_TUNING,
        autonomy: 'manual',
        scheduleInterval: '2h',
        extras: { analysisWindowDays: 7, fpCountThreshold: 10, fpRateThresholdPct: 50 },
      },
    });
    expect(
      workers.filter(({ id }) => id !== RULE_TUNING).every(({ state }) => state !== 'unavailable')
    ).toBe(true);
  });

  it('lists a Worker whose stored settings contain an unknown key as unavailable', async () => {
    const harness = createPersistentHarness();
    const service = harness.createService();
    await service.update(
      RULE_TUNING,
      {
        enabled: true,
        settings: { serviceAccountId: 'sa-1' },
        settingsRevision: null,
      },
      SPACE,
      request
    );
    const document = harness.documents.get(`${RULE_TUNING}-${SPACE}`);
    if (!document) throw new Error('Expected the Rule Tuning document to be installed');
    document.values = {
      settingsVersion: 1,
      autonomyLevel: 'manual',
      scheduleInterval: '2h',
      extras: { ...RULE_TUNING_DEFAULT_EXTRAS, retiredField: 1 },
    };

    const { workers } = await service.list(request, SPACE);
    const ruleTuning = workers.find(({ id }) => id === RULE_TUNING);

    expect(ruleTuning).toMatchObject({
      state: 'unavailable',
      stateReason: 'Worker settings could not be read from durable storage',
      settingsRevision: null,
    });
  });

  it('installs on enable and leaves the per-space document in place on disable', async () => {
    const harness = createPersistentHarness();
    const service = harness.createService();

    await service.update(
      TRIAGE,
      {
        enabled: true,
        settings: { serviceAccountId: 'sa-1' },
        settingsRevision: null,
      },
      'space-a',
      request
    );
    const disabled = await service.update(TRIAGE, { enabled: false }, 'space-a', request);

    expect(harness.install).toHaveBeenCalledWith(
      TRIAGE,
      expect.objectContaining({ workflowIdSuffix: 'space-a' })
    );
    expect(disabled.outcome).toBe('updated');
    if (disabled.outcome !== 'updated') throw new Error('Expected disable to succeed');
    expect(disabled.response.worker.enabled).toBe(false);
    expect(disabled.response.worker.workflowId).toBe(reportedWorkflowId(TRIAGE, 'space-a'));
    expect(harness.documents.has(`${TRIAGE}-space-a`)).toBe(true);
  });

  it('does not project a workflow id when a non-managed document occupies that id', async () => {
    const harness = createPersistentHarness();
    const service = harness.createService();
    (harness.managedWorkflows.getWorkflowStatus as jest.Mock).mockResolvedValue({
      status: 'not_managed',
      workflowId: 'opaque:foreign-workflow',
      definitionId: TRIAGE,
      spaceId: SPACE,
      installed: true,
      enabled: true,
      valid: true,
      managedBy: null,
      storedVersion: null,
      registryVersion: 1,
      storedHash: null,
      registryHash: 'registry',
    });

    const worker = await service.get(TRIAGE, request, SPACE);

    expect(worker?.workflowId).toBeNull();
  });

  it('projects skills from the installed workflow definition when the worker is installed', async () => {
    const harness = createPersistentHarness();
    const service = harness.createService();
    await service.update(
      TRIAGE,
      {
        enabled: true,
        settings: { serviceAccountId: 'sa-1' },
        settingsRevision: null,
      },
      SPACE,
      request
    );

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

    expect(harness.management.getWorkflow).toHaveBeenCalledWith(
      reportedWorkflowId(TRIAGE, SPACE),
      SPACE,
      request
    );
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
    /** A complete extras replacement, every field away from its default. */
    const SAVED_EXTRAS = {
      analysisWindowDays: 21,
      fpCountThreshold: 4,
      fpRateThresholdPct: 80,
    };

    const version4Values = {
      settingsVersion: 1,
      autonomyLevel: 'manual',
      scheduleInterval: '2h',
    };

    it('reads a document stored before extras existed and keeps its revision', async () => {
      const harness = createPersistentHarness();
      const service = harness.createService();
      await service.update(
        RULE_TUNING,
        {
          enabled: true,
          settings: { serviceAccountId: 'sa-1' },
          settingsRevision: null,
        },
        SPACE,
        request
      );
      const document = harness.documents.get(`${RULE_TUNING}-${SPACE}`);
      if (!document) throw new Error('Expected the Rule Tuning document to be installed');
      document.values = version4Values;

      const worker = await service.get(RULE_TUNING, request, SPACE);

      expect(worker).toMatchObject({
        state: 'ok',
        settingsRevision: document.version,
        settings: {
          workerId: RULE_TUNING,
          autonomy: 'manual',
          scheduleInterval: '2h',
          extras: RULE_TUNING_DEFAULT_EXTRAS,
        },
      });
    });

    it('persists default extras when a document stored without them is updated', async () => {
      const harness = createPersistentHarness();
      const service = harness.createService();
      await service.update(
        RULE_TUNING,
        {
          enabled: true,
          settings: { serviceAccountId: 'sa-1' },
          settingsRevision: null,
        },
        SPACE,
        request
      );
      const document = harness.documents.get(`${RULE_TUNING}-${SPACE}`);
      if (!document) throw new Error('Expected the Rule Tuning document to be installed');
      document.values = version4Values;

      const updated = await service.update(
        RULE_TUNING,
        {
          settings: { scheduleInterval: '6h', serviceAccountId: 'sa-1' },
          settingsRevision: document.version,
        },
        SPACE,
        request
      );

      expect(updated.outcome).toBe('updated');
      expect(harness.documents.get(`${RULE_TUNING}-${SPACE}`)?.values).toEqual({
        ...version4Values,
        scheduleInterval: '6h',
        extras: RULE_TUNING_DEFAULT_EXTRAS,
        serviceAccountId: 'sa-1',
      });
    });

    const enableRuleTuning = async () => {
      const harness = createPersistentHarness();
      const service = harness.createService();
      const enabled = await service.update(
        RULE_TUNING,
        {
          enabled: true,
          settings: { serviceAccountId: 'sa-1' },
          settingsRevision: null,
        },
        SPACE,
        request
      );
      if (enabled.outcome !== 'updated') throw new Error('Expected enable to succeed');
      return { harness, service, revision: enabled.response.worker.settingsRevision };
    };

    it('persists an extras-only save and forwards all three inputs into the rendered YAML', async () => {
      const { harness, service, revision } = await enableRuleTuning();

      const result = await service.update(
        RULE_TUNING,
        { settings: { extras: SAVED_EXTRAS }, settingsRevision: revision },
        SPACE,
        request
      );

      expect(result.outcome).toBe('updated');
      if (result.outcome !== 'updated') throw new Error('Expected extras save to succeed');
      expect(result.response.worker.settings).toEqual({
        workerId: RULE_TUNING,
        autonomy: 'manual',
        scheduleInterval: '2h',
        serviceAccountId: 'sa-1',
        extras: SAVED_EXTRAS,
      });
      // The saved values are rendered into consts.worker_settings.extras; the sweep inputs
      // read them from there, so both halves are asserted.
      const yaml = harness.documents.get(`${RULE_TUNING}-${SPACE}`)?.yaml ?? '';
      const { consts } = parse(yaml) as { consts: { worker_settings: { extras: unknown } } };
      expect(consts.worker_settings.extras).toEqual(SAVED_EXTRAS);
      expect(yaml).toContain(
        'analysis_window_days: "${{ consts.worker_settings.extras.analysisWindowDays }}"'
      );
      expect(yaml).toContain(
        'min_fp_count: "${{ consts.worker_settings.extras.fpCountThreshold }}"'
      );
      expect(yaml).toContain(
        'min_fp_rate_pct: "${{ consts.worker_settings.extras.fpRateThresholdPct }}"'
      );
      expect(yaml).not.toContain('__WORKER_ANALYSIS_WINDOW_DAYS__');
      expect(yaml).not.toContain('__WORKER_FP_COUNT_THRESHOLD__');
      expect(yaml).not.toContain('__WORKER_FP_RATE_THRESHOLD_PCT__');
    });

    it('keeps the saved extras when a shared-field patch omits them', async () => {
      const { service, revision } = await enableRuleTuning();
      const withWindow = await service.update(
        RULE_TUNING,
        { settings: { extras: SAVED_EXTRAS }, settingsRevision: revision },
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
        expect.objectContaining({ autonomy: 'assisted', extras: SAVED_EXTRAS })
      );
    });

    it('refuses a stale extras-only save and leaves the stored settings alone', async () => {
      const { service, revision } = await enableRuleTuning();
      const first = await service.update(
        RULE_TUNING,
        { settings: { extras: SAVED_EXTRAS }, settingsRevision: revision },
        SPACE,
        request
      );
      if (first.outcome !== 'updated') throw new Error('Expected first save to succeed');

      // Same pre-save revision again: someone else's write landed in between.
      await expect(
        service.update(
          RULE_TUNING,
          {
            settings: { extras: { ...SAVED_EXTRAS, analysisWindowDays: 30 } },
            settingsRevision: revision,
          },
          SPACE,
          request
        )
      ).resolves.toEqual({ outcome: 'conflict' });
      expect((await service.get(RULE_TUNING, request, SPACE))?.settings.extras).toEqual(
        SAVED_EXTRAS
      );
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
        .createService(agentBuilderWithSkill(true))
        .update(
          FORENSICS,
          { settings: { scheduleInterval: '15m' }, settingsRevision: null },
          SPACE,
          request
        );

      expect(result.outcome).toBe('invalid');
      if (result.outcome !== 'invalid') throw new Error('Expected an invalid outcome');
      expect(result.message).toContain('scheduleInterval');
    });

    it('accepts a schedule interval on the alert triage Worker, which sweeps on a schedule', async () => {
      const result = await createPersistentHarness()
        .createService()
        .update(
          TRIAGE,
          { settings: { scheduleInterval: '15m' }, settingsRevision: null },
          SPACE,
          request
        );

      expect(result.outcome).not.toBe('invalid');
    });
  });

  describe('alert triage worker', () => {
    const makeService = (harness: ReturnType<typeof createPersistentHarness>) => {
      const service = new WorkersService(
        harness.management,
        Promise.resolve(harness.managedWorkflows),
        loggingSystemMock.createLogger() as Logger,
        {},
        async (_request, registration, options) => {
          await harness.install(registration.id, options);
        },
        async () => []
      );
      return { service };
    };

    // Alert analysis is a per-Worker prerequisite: the Watch page callout warns about it and
    // each Triage run fails with its own message, so the enable goes through.
    it.each([
      ['disabled', { enabled: false }],
      ['missing', null],
    ])('enables when the Alert Analysis workflow is %s', async (_state, alertAnalysisWorkflow) => {
      const harness = createPersistentHarness();
      const getWorkflow = harness.management.getWorkflow as jest.Mock;
      const defaultGetWorkflow = getWorkflow.getMockImplementation();
      getWorkflow.mockImplementation(async (workflowId: string, ...rest: unknown[]) =>
        workflowId === SECURITY_ALERT_ANALYSIS_WORKFLOW_ID
          ? alertAnalysisWorkflow
          : defaultGetWorkflow?.(workflowId, ...rest)
      );
      const { service } = makeService(harness);

      const result = await service.update(
        TRIAGE,
        {
          enabled: true,
          settings: { serviceAccountId: 'sa-1' },
          settingsRevision: null,
        },
        SPACE,
        request
      );

      expect(result.outcome).toBe('updated');
      expect(harness.updateWorkflow).toHaveBeenCalledWith(
        reportedWorkflowId(TRIAGE, SPACE),
        { enabled: true },
        SPACE,
        request
      );
    });

    // The Worker is a scheduled sweep, so enabling it no longer attaches an action to every rule.
    // There is nothing to attach and nothing to roll back: enable is the workflow update and
    // nothing else, and no rule-attachment service is consulted at all.
    it('enable: switches the Worker on and reports nothing about rules', async () => {
      const harness = createPersistentHarness();
      const { service } = makeService(harness);

      const result = await service.update(
        TRIAGE,
        { enabled: true, settings: { serviceAccountId: 'sa-1' }, settingsRevision: null },
        SPACE,
        request
      );

      expect(result.outcome).toBe('updated');
      expect(result.outcome === 'updated' && 'skippedRuleCount' in result.response).toBe(false);
      expect(harness.updateWorkflow).toHaveBeenCalledWith(
        reportedWorkflowId(TRIAGE, SPACE),
        { enabled: true },
        SPACE,
        request
      );
    });

    it('disable: switches the Worker off and reports nothing about rules', async () => {
      const harness = createPersistentHarness();
      const { service } = makeService(harness);
      await service.update(
        TRIAGE,
        { enabled: true, settings: { serviceAccountId: 'sa-1' }, settingsRevision: null },
        SPACE,
        request
      );
      harness.updateWorkflow.mockClear();

      const result = await service.update(TRIAGE, { enabled: false }, SPACE, request);

      expect(result.outcome).toBe('updated');
      expect(result.outcome === 'updated' && 'skippedRuleCount' in result.response).toBe(false);
      expect(harness.updateWorkflow).toHaveBeenCalledTimes(1);
      expect(harness.updateWorkflow).toHaveBeenCalledWith(
        reportedWorkflowId(TRIAGE, SPACE),
        { enabled: false },
        SPACE,
        request
      );
    });
  });

  describe('no-model block', () => {
    const createToggleableSpaceModel = (available: boolean) => {
      const model = { available };
      const getBlockingReasons: GetWorkerBlockingReasons = jest.fn(async () =>
        model.available ? [] : ['no_model' as const]
      );
      return { model, getBlockingReasons };
    };

    it('reports no_model on every Worker when the user has no model', async () => {
      const { getBlockingReasons } = createToggleableSpaceModel(false);
      const service = createPersistentHarness().createService(undefined, getBlockingReasons);

      const { workers } = await service.list(request, SPACE);

      expect(workers.map(({ blockingReasons }) => blockingReasons)).toEqual(
        WORKERS_WITHOUT_FORENSIC_SKILL.map(() => ['no_model'])
      );
      expect((await service.get(TRIAGE, request, SPACE))?.blockingReasons).toEqual(['no_model']);
    });

    it('reports no reasons when the user has a model', async () => {
      const { getBlockingReasons } = createToggleableSpaceModel(true);
      const service = createPersistentHarness().createService(undefined, getBlockingReasons);

      const { workers } = await service.list(request, SPACE);

      expect(workers.every(({ blockingReasons }) => blockingReasons.length === 0)).toBe(true);
      expect((await service.get(TRIAGE, request, SPACE))?.blockingReasons).toEqual([]);
    });

    it('refuses enabling without installing or writing anything', async () => {
      const { getBlockingReasons } = createToggleableSpaceModel(false);
      const harness = createPersistentHarness();

      const result = await harness
        .createService(undefined, getBlockingReasons)
        .update(
          ATTACK_DISCOVERY,
          { enabled: true, settings: { scheduleInterval: '12h' }, settingsRevision: null },
          SPACE,
          request
        );

      expect(result).toEqual({ outcome: 'blocked', reason: 'noModel' });
      expect(harness.install).not.toHaveBeenCalled();
      expect(harness.updateWorkflow).not.toHaveBeenCalled();
      expect(harness.documents.has(`${ATTACK_DISCOVERY}-${SPACE}`)).toBe(false);
    });

    it('refuses enabling before checking the settings revision', async () => {
      const { getBlockingReasons } = createToggleableSpaceModel(false);

      const result = await createPersistentHarness()
        .createService(undefined, getBlockingReasons)
        .update(
          ATTACK_DISCOVERY,
          { enabled: true, settings: { scheduleInterval: '12h' }, settingsRevision: 999 },
          SPACE,
          request
        );

      expect(result).toEqual({ outcome: 'blocked', reason: 'noModel' });
    });

    it('reports a hidden Worker as not found rather than blocked', async () => {
      const { getBlockingReasons } = createToggleableSpaceModel(false);

      const result = await createPersistentHarness()
        .createService(agentBuilderWithSkill(false), getBlockingReasons)
        .update(FORENSICS, { enabled: true }, SPACE, request);

      expect(result).toEqual({ outcome: 'not-found' });
    });

    it('still accepts switching a running Worker off and saving its settings while blocked', async () => {
      const { model, getBlockingReasons } = createToggleableSpaceModel(true);
      const harness = createPersistentHarness();
      const service = harness.createService(undefined, getBlockingReasons);
      const enabled = await service.update(
        ATTACK_DISCOVERY,
        { enabled: true, settings: { serviceAccountId: 'sa-1' }, settingsRevision: null },
        SPACE,
        request
      );
      if (enabled.outcome !== 'updated') throw new Error('Expected enable to succeed');
      model.available = false;

      const saved = await service.update(
        ATTACK_DISCOVERY,
        {
          settings: { scheduleInterval: '12h' },
          settingsRevision: enabled.response.worker.settingsRevision,
        },
        SPACE,
        request
      );
      expect(saved.outcome).toBe('updated');
      if (saved.outcome !== 'updated') throw new Error('Expected settings save to succeed');
      expect(saved.response.worker.blockingReasons).toEqual(['no_model']);
      expect(harness.documents.get(`${ATTACK_DISCOVERY}-${SPACE}`)?.yaml).toContain('every: "12h"');

      const disabled = await service.update(ATTACK_DISCOVERY, { enabled: false }, SPACE, request);
      expect(disabled.outcome).toBe('updated');
      expect(harness.documents.get(`${ATTACK_DISCOVERY}-${SPACE}`)?.enabled).toBe(false);
    });

    it('keeps the stored enabled value across the block and accepts enabling once a model exists', async () => {
      const { model, getBlockingReasons } = createToggleableSpaceModel(true);
      const harness = createPersistentHarness();
      const service = harness.createService(undefined, getBlockingReasons);
      await service.update(
        TRIAGE,
        { enabled: true, settings: { serviceAccountId: 'sa-1' }, settingsRevision: null },
        SPACE,
        request
      );
      await service.update(ATTACK_DISCOVERY, { enabled: false }, SPACE, request);

      model.available = false;
      const blocked = await service.list(request, SPACE);
      expect(blocked.workers.find(({ id }) => id === TRIAGE)).toMatchObject({
        enabled: true,
        blockingReasons: ['no_model'],
      });
      expect(await service.update(ATTACK_DISCOVERY, { enabled: true }, SPACE, request)).toEqual({
        outcome: 'blocked',
        reason: 'noModel',
      });
      expect(harness.documents.get(`${TRIAGE}-${SPACE}`)?.enabled).toBe(true);
      expect(harness.documents.get(`${ATTACK_DISCOVERY}-${SPACE}`)?.enabled).toBe(false);

      model.available = true;
      const reopened = await service.list(request, SPACE);
      const attackDiscovery = reopened.workers.find(({ id }) => id === ATTACK_DISCOVERY);
      expect(attackDiscovery).toMatchObject({ enabled: false, blockingReasons: [] });
      const enabled = await service.update(
        ATTACK_DISCOVERY,
        {
          enabled: true,
          settings: { serviceAccountId: 'sa-1' },
          settingsRevision: attackDiscovery?.settingsRevision ?? null,
        },
        SPACE,
        request
      );
      expect(enabled.outcome).toBe('updated');
      expect(harness.documents.get(`${ATTACK_DISCOVERY}-${SPACE}`)?.enabled).toBe(true);
    });
  });

  describe('endpoint analysis skill gate', () => {
    it('lists endpoint analysis when the skill is registered', async () => {
      const { workers } = await createPersistentHarness()
        .createService(agentBuilderWithSkill(true))
        .list(request, SPACE);

      expect(workers.map(({ id }) => id)).toEqual([...SYSTEM_SECURITY_WORKER_IDS]);
    });

    it('hides endpoint analysis when the registry does not have the skill', async () => {
      const harness = createPersistentHarness();
      const service = harness.createService(agentBuilderWithSkill(false));

      const { workers } = await service.list(request, SPACE);

      expect(workers.map(({ id }) => id)).toEqual([...WORKERS_WITHOUT_FORENSIC_SKILL]);
      expect(await service.get(FORENSICS, request, SPACE)).toBeUndefined();
      expect(
        await service.update(
          FORENSICS,
          {
            enabled: true,
            settings: { serviceAccountId: 'sa-1' },
            settingsRevision: null,
          },
          SPACE,
          request
        )
      ).toEqual({
        outcome: 'not-found',
      });
      expect(harness.documents.has(`${FORENSICS}-${SPACE}`)).toBe(false);
    });
  });

  describe('Hunt Watch threat intel supply', () => {
    const makeThreatIntelSupply = () =>
      ({
        assertHardGate: jest.fn(async () => undefined),
        ensureSupplyForSpace: jest.fn(async () => undefined),
        teardownSupplyForSpace: jest.fn(async () => undefined),
      } as unknown as ThreatIntelSupplyService & {
        assertHardGate: jest.Mock;
        ensureSupplyForSpace: jest.Mock;
        teardownSupplyForSpace: jest.Mock;
      });

    const makeHuntService = (
      harness: ReturnType<typeof createPersistentHarness>,
      threatIntelSupply: ThreatIntelSupplyService
    ) =>
      new WorkersService(
        harness.management,
        Promise.resolve(harness.managedWorkflows),
        loggingSystemMock.createLogger() as Logger,
        {},
        async (_request, registration, options) => {
          await harness.install(registration.id, options);
        },
        async () => [],
        threatIntelSupply
      );

    it('returns huntSupplyPrerequisitesUnmet when the hard-gate fails', async () => {
      const harness = createPersistentHarness();
      const threatIntelSupply = makeThreatIntelSupply();
      threatIntelSupply.assertHardGate.mockRejectedValue(
        new ThreatIntelSupplyHardGateError(['embedding_endpoint_unavailable'])
      );
      const service = makeHuntService(harness, threatIntelSupply);

      expect(
        await service.update(
          HUNT,
          {
            enabled: true,
            settings: { serviceAccountId: 'sa-1' },
            settingsRevision: null,
          },
          SPACE,
          request
        )
      ).toEqual({ outcome: 'blocked', reason: 'huntSupplyPrerequisitesUnmet' });
    });

    it('returns huntSupplyReportsIndexUnmanaged when the hard-gate names a template-free reports index', async () => {
      const harness = createPersistentHarness();
      const threatIntelSupply = makeThreatIntelSupply();
      threatIntelSupply.assertHardGate.mockRejectedValue(
        new ThreatIntelSupplyHardGateError(['reports_index_unmanaged'])
      );
      const service = makeHuntService(harness, threatIntelSupply);

      expect(
        await service.update(
          HUNT,
          {
            enabled: true,
            settings: { serviceAccountId: 'sa-1' },
            settingsRevision: null,
          },
          SPACE,
          request
        )
      ).toEqual({ outcome: 'blocked', reason: 'huntSupplyReportsIndexUnmanaged' });
    });

    // A combined settings-and-enable PATCH (one Watch Save) must not persist the settings half
    // when the enable half is refused, or the operator is left with a bumped revision and a
    // Worker that still is not enabled — a state its own optimistic UI overlay cannot recover
    // from without a second, separate save.
    it('combined settings+enable PATCH: does not persist settings when the enable is blocked', async () => {
      const harness = createPersistentHarness();
      const threatIntelSupply = makeThreatIntelSupply();
      threatIntelSupply.assertHardGate.mockRejectedValue(
        new ThreatIntelSupplyHardGateError(['embedding_endpoint_unavailable'])
      );
      const service = makeHuntService(harness, threatIntelSupply);

      const result = await service.update(
        HUNT,
        {
          enabled: true,
          settings: { serviceAccountId: 'sa-1' },
          settingsRevision: null,
        },
        SPACE,
        request
      );

      expect(result).toEqual({ outcome: 'blocked', reason: 'huntSupplyPrerequisitesUnmet' });
      expect(harness.documents.has(`${HUNT}-${SPACE}`)).toBe(false);
      expect(harness.install).not.toHaveBeenCalled();
      expect(harness.updateWorkflow).not.toHaveBeenCalled();
    });

    it('does not ensure supply when the hard-gate fails', async () => {
      const harness = createPersistentHarness();
      const threatIntelSupply = makeThreatIntelSupply();
      threatIntelSupply.assertHardGate.mockRejectedValue(
        new ThreatIntelSupplyHardGateError(['embedding_endpoint_unavailable'])
      );
      const service = makeHuntService(harness, threatIntelSupply);

      await service.update(
        HUNT,
        {
          enabled: true,
          settings: { serviceAccountId: 'sa-1' },
          settingsRevision: null,
        },
        SPACE,
        request
      );

      expect(threatIntelSupply.ensureSupplyForSpace).not.toHaveBeenCalled();
    });

    it('returns huntSupplyNotInstalled when TI docs are missing', async () => {
      const harness = createPersistentHarness();
      const threatIntelSupply = makeThreatIntelSupply();
      threatIntelSupply.ensureSupplyForSpace.mockRejectedValue(
        new ThreatIntelSupplyNotInstalledError('system-security-threat-intel-ingest-feeds')
      );
      const service = makeHuntService(harness, threatIntelSupply);

      expect(
        await service.update(
          HUNT,
          {
            enabled: true,
            settings: { serviceAccountId: 'sa-1' },
            settingsRevision: null,
          },
          SPACE,
          request
        )
      ).toEqual({ outcome: 'blocked', reason: 'huntSupplyNotInstalled' });
    });

    it('ensures TI supply before enabling Hunt', async () => {
      const harness = createPersistentHarness();
      const threatIntelSupply = makeThreatIntelSupply();
      const service = makeHuntService(harness, threatIntelSupply);

      await service.update(
        HUNT,
        {
          enabled: true,
          settings: { serviceAccountId: 'sa-1' },
          settingsRevision: null,
        },
        SPACE,
        request
      );

      expect(threatIntelSupply.ensureSupplyForSpace).toHaveBeenCalledWith(SPACE, request);
    });

    it('re-ensures TI supply after Hunt enable so a concurrent teardown can be repaired', async () => {
      const harness = createPersistentHarness();
      const threatIntelSupply = makeThreatIntelSupply();
      const service = makeHuntService(harness, threatIntelSupply);

      await service.update(
        HUNT,
        {
          enabled: true,
          settings: { serviceAccountId: 'sa-1' },
          settingsRevision: null,
        },
        SPACE,
        request
      );

      expect(threatIntelSupply.ensureSupplyForSpace).toHaveBeenCalledTimes(2);
      expect(threatIntelSupply.ensureSupplyForSpace).toHaveBeenNthCalledWith(1, SPACE, request);
      expect(threatIntelSupply.ensureSupplyForSpace).toHaveBeenNthCalledWith(2, SPACE, request);
    });

    it('tears down TI supply when Hunt enable fails after ensure', async () => {
      const harness = createPersistentHarness();
      const threatIntelSupply = makeThreatIntelSupply();
      const service = makeHuntService(harness, threatIntelSupply);
      harness.updateWorkflow.mockRejectedValueOnce(new Error('enable write failed'));

      await expect(
        service.update(
          HUNT,
          {
            enabled: true,
            settings: { serviceAccountId: 'sa-1' },
            settingsRevision: null,
          },
          SPACE,
          request
        )
      ).rejects.toThrow('enable write failed');

      expect(threatIntelSupply.ensureSupplyForSpace).toHaveBeenCalled();
      expect(threatIntelSupply.teardownSupplyForSpace).toHaveBeenCalledWith(SPACE, request);
    });

    it('does not ensure TI supply when enable is rejected for a missing service account', async () => {
      const harness = createPersistentHarness();
      const threatIntelSupply = makeThreatIntelSupply();
      const service = makeHuntService(harness, threatIntelSupply);

      expect(await service.update(HUNT, { enabled: true }, SPACE, request)).toEqual({
        outcome: 'rejected',
        what: 'a worker that is enabled without a service account',
      });
      expect(threatIntelSupply.ensureSupplyForSpace).not.toHaveBeenCalled();
    });

    it('tears down TI supply when disabling Hunt', async () => {
      const harness = createPersistentHarness();
      const threatIntelSupply = makeThreatIntelSupply();
      const service = makeHuntService(harness, threatIntelSupply);

      await service.update(
        HUNT,
        {
          enabled: true,
          settings: { serviceAccountId: 'sa-1' },
          settingsRevision: null,
        },
        SPACE,
        request
      );
      threatIntelSupply.teardownSupplyForSpace.mockClear();

      await service.update(HUNT, { enabled: false }, SPACE, request);

      expect(threatIntelSupply.teardownSupplyForSpace).toHaveBeenCalledWith(SPACE, request);
    });

    it('does not call TI supply when enabling a non-Hunt worker', async () => {
      const harness = createPersistentHarness();
      const threatIntelSupply = makeThreatIntelSupply();
      const service = makeHuntService(harness, threatIntelSupply);

      await service.update(
        ATTACK_DISCOVERY,
        {
          enabled: true,
          settings: { serviceAccountId: 'sa-1' },
          settingsRevision: null,
        },
        SPACE,
        request
      );

      expect(threatIntelSupply.assertHardGate).not.toHaveBeenCalled();
    });
  });

  describe('telemetry', () => {
    const SETTINGS_CHANGED = ALERTZERO_TELEMETRY_EVENTS.WorkerSettingsChanged;
    const ACTIVATED = ALERTZERO_TELEMETRY_EVENTS.WorkerActivated;

    /**
     * Reports through the production never-throw reporter into a dev-mode EBT client, which throws
     * on any payload that does not match its registered schema.
     */
    const createTelemetry = () => {
      const analytics = createAnalytics({ isDev: true, logger: loggerMock.create() });
      registerAlertZeroTelemetryEvents(analytics);
      const reportEvent = jest.spyOn(analytics, 'reportEvent');
      const reportedEvents = () =>
        reportEvent.mock.calls.map(([eventType, payload]) => ({ eventType, payload }));
      return {
        clear: () => reportEvent.mockClear(),
        eventsOfType: (eventType: string) =>
          reportedEvents()
            .filter((event) => event.eventType === eventType)
            .map(({ payload }) => payload),
        rejectedReports: () => reportEvent.mock.results.filter(({ type }) => type === 'throw'),
        reportedEvents,
        reporter: createAlertZeroTelemetryReporter({ analytics, logger: loggerMock.create() }),
      };
    };

    const enableWorker = async (workerId: string, spaceId = SPACE) => {
      const telemetry = createTelemetry();
      const harness = createPersistentHarness();
      const service = harness.createService(undefined, undefined, telemetry.reporter);
      // Enables the way onboarding does: with a service account, which main requires.
      const enabled = await service.update(
        workerId,
        { enabled: true, settings: { serviceAccountId: 'sa-1' }, settingsRevision: null },
        spaceId,
        request
      );
      if (enabled.outcome !== 'updated') throw new Error('Expected enable to succeed');
      telemetry.clear();
      return { harness, revision: enabled.response.worker.settingsRevision, service, telemetry };
    };

    it('emits one settings_changed event per changed setting of a multi-field PATCH', async () => {
      const { revision, service, telemetry } = await enableWorker(ATTACK_DISCOVERY);

      const result = await service.update(
        ATTACK_DISCOVERY,
        {
          settings: { autonomy: 'supervised', scheduleInterval: '15m' },
          settingsRevision: revision,
        },
        SPACE,
        request
      );

      expect(result.outcome).toBe('updated');
      expect(telemetry.reportedEvents().map(({ eventType }) => eventType)).toEqual([
        SETTINGS_CHANGED,
        SETTINGS_CHANGED,
      ]);
      expect(telemetry.eventsOfType(SETTINGS_CHANGED)).toEqual([
        {
          bulk_write: true,
          is_default_space: true,
          next_value: 'supervised',
          previous_value: 'manual',
          setting: 'autonomy',
          settings_revision: revision,
          watch_tag: 'watch-floor',
          worker_id: ATTACK_DISCOVERY,
        },
        {
          bulk_write: true,
          is_default_space: true,
          next_value: '15m_to_lt_1h',
          previous_value: '24h_to_lt_7d',
          setting: 'schedule_interval',
          settings_revision: revision,
          watch_tag: 'watch-floor',
          worker_id: ATTACK_DISCOVERY,
        },
      ]);
      expect(telemetry.rejectedReports()).toEqual([]);
    });

    it('emits a single, non-bulk event when one setting changes', async () => {
      const { revision, service, telemetry } = await enableWorker(ATTACK_DISCOVERY);

      await service.update(
        ATTACK_DISCOVERY,
        { settings: { scheduleInterval: '6h' }, settingsRevision: revision },
        SPACE,
        request
      );

      expect(telemetry.eventsOfType(SETTINGS_CHANGED)).toEqual([
        expect.objectContaining({
          bulk_write: false,
          next_value: '6h_to_lt_24h',
          setting: 'schedule_interval',
        }),
      ]);
    });

    it('emits nothing for a settings PATCH that changes no value', async () => {
      const { revision, service, telemetry } = await enableWorker(ATTACK_DISCOVERY);

      const result = await service.update(
        ATTACK_DISCOVERY,
        { settings: { autonomy: 'manual', scheduleInterval: '24h' }, settingsRevision: revision },
        SPACE,
        request
      );

      expect(result.outcome).toBe('updated');
      expect(telemetry.reportedEvents()).toEqual([]);
    });

    it('emits nothing when the settings revision conflicts', async () => {
      const { service, telemetry } = await enableWorker(ATTACK_DISCOVERY);

      await expect(
        service.update(
          ATTACK_DISCOVERY,
          { settings: { autonomy: 'supervised' }, settingsRevision: 999 },
          SPACE,
          request
        )
      ).resolves.toEqual({ outcome: 'conflict' });
      expect(telemetry.reportedEvents()).toEqual([]);
    });

    it('emits nothing for a settings PATCH the Worker rejects as invalid', async () => {
      const { revision, service, telemetry } = await enableWorker(ATTACK_DISCOVERY);

      const result = await service.update(
        ATTACK_DISCOVERY,
        { settings: { autonomy: 'assisted' }, settingsRevision: revision },
        SPACE,
        request
      );

      expect(result.outcome).toBe('invalid');
      expect(telemetry.reportedEvents()).toEqual([]);
    });

    it('emits nothing when the settings write cannot be confirmed', async () => {
      const { harness, revision, service, telemetry } = await enableWorker(ATTACK_DISCOVERY);
      harness.install.mockResolvedValueOnce(undefined);

      await expect(
        service.update(
          ATTACK_DISCOVERY,
          { settings: { autonomy: 'supervised' }, settingsRevision: revision },
          SPACE,
          request
        )
      ).resolves.toEqual({ outcome: 'failed' });
      expect(telemetry.reportedEvents()).toEqual([]);
    });

    it('reports an extras change as changed, never with its values', async () => {
      const { revision, service, telemetry } = await enableWorker(RULE_TUNING);

      const result = await service.update(
        RULE_TUNING,
        {
          settings: {
            extras: { analysisWindowDays: 23, fpCountThreshold: 77, fpRateThresholdPct: 61 },
          },
          settingsRevision: revision,
        },
        SPACE,
        request
      );

      expect(result.outcome).toBe('updated');
      const events = telemetry.eventsOfType(SETTINGS_CHANGED);
      expect(events).toEqual([
        {
          bulk_write: false,
          is_default_space: true,
          setting: 'extras',
          settings_revision: revision,
          watch_tag: 'watch-detection',
          worker_id: RULE_TUNING,
        },
      ]);
      expect(JSON.stringify(events)).not.toMatch(/23|77|61/);
      expect(telemetry.rejectedReports()).toEqual([]);
    });

    it('does not report the defaults a legacy document gains on save as an extras change', async () => {
      const { harness, service, telemetry } = await enableWorker(RULE_TUNING);
      const document = harness.documents.get(`${RULE_TUNING}-${SPACE}`);
      if (!document) throw new Error('Expected the Rule Tuning document to be installed');
      document.values = {
        autonomyLevel: 'manual',
        scheduleInterval: '2h',
        serviceAccountId: 'sa-1',
        settingsVersion: 1,
      };

      await service.update(
        RULE_TUNING,
        { settings: { scheduleInterval: '12h' }, settingsRevision: document.version },
        SPACE,
        request
      );

      expect(telemetry.eventsOfType(SETTINGS_CHANGED)).toEqual([
        expect.objectContaining({
          next_value: '6h_to_lt_24h',
          previous_value: '1h_to_lt_6h',
          setting: 'schedule_interval',
        }),
      ]);
    });

    it('emits only activation, and no enabled change, on the first enable', async () => {
      const telemetry = createTelemetry();
      const service = createPersistentHarness().createService(
        undefined,
        undefined,
        telemetry.reporter
      );

      // Onboarding enables a Worker together with its service account; binding it is not a change.
      await service.update(
        ATTACK_DISCOVERY,
        { enabled: true, settings: { serviceAccountId: 'sa-1' }, settingsRevision: null },
        SPACE,
        request
      );

      expect(telemetry.reportedEvents()).toEqual([
        {
          eventType: ACTIVATED,
          payload: {
            autonomy_level: 'manual',
            enabled: true,
            is_default_space: true,
            watch_tag: 'watch-floor',
            worker_id: ATTACK_DISCOVERY,
          },
        },
      ]);

      telemetry.clear();
      await service.update(ATTACK_DISCOVERY, { enabled: false }, SPACE, request);
      await service.update(ATTACK_DISCOVERY, { enabled: true }, SPACE, request);
      await service.update(ATTACK_DISCOVERY, { enabled: true }, SPACE, request);

      expect(telemetry.eventsOfType(ACTIVATED)).toEqual([]);
      expect(telemetry.rejectedReports()).toEqual([]);
    });

    describe('enabled changes of an installed Worker', () => {
      const enabledChange = (previousValue: string, nextValue: string) => ({
        bulk_write: false,
        is_default_space: true,
        next_value: nextValue,
        previous_value: previousValue,
        setting: 'enabled',
        watch_tag: 'watch-floor',
        worker_id: ATTACK_DISCOVERY,
      });

      it('reports a disable, then an enable, each as one settings_changed event', async () => {
        const { service, telemetry } = await enableWorker(ATTACK_DISCOVERY);

        const disabled = await service.update(ATTACK_DISCOVERY, { enabled: false }, SPACE, request);

        expect(disabled.outcome).toBe('updated');
        expect(telemetry.reportedEvents()).toEqual([
          { eventType: SETTINGS_CHANGED, payload: enabledChange('true', 'false') },
        ]);

        telemetry.clear();
        const enabled = await service.update(ATTACK_DISCOVERY, { enabled: true }, SPACE, request);

        expect(enabled.outcome).toBe('updated');
        expect(telemetry.reportedEvents()).toEqual([
          { eventType: SETTINGS_CHANGED, payload: enabledChange('false', 'true') },
        ]);
        expect(telemetry.rejectedReports()).toEqual([]);
      });

      it('reports the enabled change of a Worker that a settings save installed disabled', async () => {
        const telemetry = createTelemetry();
        const service = createPersistentHarness().createService(
          undefined,
          undefined,
          telemetry.reporter
        );
        const saved = await service.update(
          TRIAGE,
          { settings: { autonomy: 'supervised' }, settingsRevision: null },
          SPACE,
          request
        );
        if (saved.outcome !== 'updated') throw new Error('Expected the settings save to succeed');
        telemetry.clear();

        // An installed Worker with no account can only be enabled together with one.
        await service.update(
          TRIAGE,
          {
            enabled: true,
            settings: { serviceAccountId: 'sa-1' },
            settingsRevision: saved.response.worker.settingsRevision,
          },
          SPACE,
          request
        );

        // The browser binds the account it created with this first enable, so binding it is not a
        // user's settings change: only the enable is reported.
        const revision = saved.response.worker.settingsRevision;
        expect(telemetry.reportedEvents()).toEqual([
          {
            eventType: SETTINGS_CHANGED,
            payload: {
              ...enabledChange('false', 'true'),
              settings_revision: revision,
              worker_id: TRIAGE,
            },
          },
        ]);
        expect(JSON.stringify(telemetry.reportedEvents())).not.toContain('sa-1');
      });

      it('marks an enabled change outside the default space', async () => {
        const { service, telemetry } = await enableWorker(ATTACK_DISCOVERY, 'space-a');

        await service.update(ATTACK_DISCOVERY, { enabled: false }, 'space-a', request);

        expect(telemetry.eventsOfType(SETTINGS_CHANGED)).toEqual([
          { ...enabledChange('true', 'false'), is_default_space: false },
        ]);
      });

      it('sends nothing for an enable of an enabled Worker', async () => {
        const { service, telemetry } = await enableWorker(ATTACK_DISCOVERY);

        const result = await service.update(ATTACK_DISCOVERY, { enabled: true }, SPACE, request);

        expect(result.outcome).toBe('updated');
        expect(telemetry.reportedEvents()).toEqual([]);
      });

      it('sends nothing for a disable of a disabled Worker', async () => {
        const { service, telemetry } = await enableWorker(ATTACK_DISCOVERY);
        await service.update(ATTACK_DISCOVERY, { enabled: false }, SPACE, request);
        telemetry.clear();

        const result = await service.update(ATTACK_DISCOVERY, { enabled: false }, SPACE, request);

        expect(result.outcome).toBe('updated');
        expect(telemetry.reportedEvents()).toEqual([]);
      });

      it('reports autonomy and enabled changes of one PATCH as a bulk write with one revision', async () => {
        const { revision, service, telemetry } = await enableWorker(ATTACK_DISCOVERY);

        const result = await service.update(
          ATTACK_DISCOVERY,
          { enabled: false, settings: { autonomy: 'supervised' }, settingsRevision: revision },
          SPACE,
          request
        );

        expect(result.outcome).toBe('updated');
        expect(telemetry.reportedEvents()).toEqual([
          {
            eventType: SETTINGS_CHANGED,
            payload: {
              bulk_write: true,
              is_default_space: true,
              next_value: 'supervised',
              previous_value: 'manual',
              setting: 'autonomy',
              settings_revision: revision,
              watch_tag: 'watch-floor',
              worker_id: ATTACK_DISCOVERY,
            },
          },
          {
            eventType: SETTINGS_CHANGED,
            payload: {
              ...enabledChange('true', 'false'),
              bulk_write: true,
              settings_revision: revision,
            },
          },
        ]);
        expect(telemetry.rejectedReports()).toEqual([]);
      });

      it('reports an autonomy change alone when the same PATCH repeats the enabled state', async () => {
        const { revision, service, telemetry } = await enableWorker(ATTACK_DISCOVERY);

        await service.update(
          ATTACK_DISCOVERY,
          { enabled: true, settings: { autonomy: 'supervised' }, settingsRevision: revision },
          SPACE,
          request
        );

        expect(telemetry.eventsOfType(SETTINGS_CHANGED)).toEqual([
          expect.objectContaining({ bulk_write: false, setting: 'autonomy' }),
        ]);
      });

      it('sends nothing when a PATCH that also disables conflicts on its settings revision', async () => {
        const { harness, service, telemetry } = await enableWorker(ATTACK_DISCOVERY);

        await expect(
          service.update(
            ATTACK_DISCOVERY,
            { enabled: false, settings: { autonomy: 'supervised' }, settingsRevision: 999 },
            SPACE,
            request
          )
        ).resolves.toEqual({ outcome: 'conflict' });
        expect(harness.documents.get(`${ATTACK_DISCOVERY}-${SPACE}`)?.enabled).toBe(true);
        expect(telemetry.reportedEvents()).toEqual([]);
      });

      it('sends nothing when the disable write fails', async () => {
        const { harness, service, telemetry } = await enableWorker(ATTACK_DISCOVERY);
        harness.updateWorkflow.mockRejectedValueOnce(new Error('write failed'));

        await expect(
          service.update(ATTACK_DISCOVERY, { enabled: false }, SPACE, request)
        ).rejects.toThrow('write failed');
        expect(telemetry.reportedEvents()).toEqual([]);
      });

      it('sends nothing, not even for the saved settings, when the disable write of the same PATCH fails', async () => {
        const { harness, revision, service, telemetry } = await enableWorker(ATTACK_DISCOVERY);
        const persist = harness.updateWorkflow.getMockImplementation();
        if (!persist) throw new Error('Expected the harness to persist enabled writes');
        harness.updateWorkflow.mockImplementation(async (id, update, spaceId) => {
          if (update.enabled === false) throw new Error('write failed');
          return persist(id, update, spaceId);
        });

        await expect(
          service.update(
            ATTACK_DISCOVERY,
            { enabled: false, settings: { autonomy: 'supervised' }, settingsRevision: revision },
            SPACE,
            request
          )
        ).rejects.toThrow('write failed');
        expect(telemetry.reportedEvents()).toEqual([]);
      });

      it('still completes a disable when the reporter throws', async () => {
        const harness = createPersistentHarness();
        await harness
          .createService()
          .update(
            ATTACK_DISCOVERY,
            { enabled: true, settings: { serviceAccountId: 'sa-1' }, settingsRevision: null },
            SPACE,
            request
          );
        const reportAttempt = jest.fn();
        const throwingReporter: AlertZeroTelemetryReporter = (eventType, payload) => {
          reportAttempt(eventType, payload);
          throw new Error('telemetry exploded');
        };
        const service = harness.createService(undefined, undefined, throwingReporter);

        const result = await service.update(ATTACK_DISCOVERY, { enabled: false }, SPACE, request);

        expect(reportAttempt).toHaveBeenCalledWith(
          SETTINGS_CHANGED,
          expect.objectContaining({ setting: 'enabled' })
        );
        expect(result.outcome).toBe('updated');
        if (result.outcome !== 'updated') throw new Error('Expected the disable to succeed');
        expect(result.response.worker.enabled).toBe(false);
      });
    });

    describe('service account changes of an installed Worker', () => {
      const serviceAccountChange = (revision: number | null) => ({
        bulk_write: false,
        is_default_space: true,
        setting: 'service_account',
        settings_revision: revision,
        watch_tag: 'watch-floor',
        worker_id: ATTACK_DISCOVERY,
      });

      it('reports a re-bind to another account as service_account, without either account', async () => {
        const { harness, service, telemetry } = await enableWorker(ATTACK_DISCOVERY);
        const revision = harness.documents.get(`${ATTACK_DISCOVERY}-${SPACE}`)?.version ?? null;

        const result = await service.update(
          ATTACK_DISCOVERY,
          { settings: { serviceAccountId: 'sa-2' }, settingsRevision: revision },
          SPACE,
          request
        );

        expect(result.outcome).toBe('updated');
        expect(telemetry.reportedEvents()).toEqual([
          { eventType: SETTINGS_CHANGED, payload: serviceAccountChange(revision) },
        ]);
        expect(JSON.stringify(telemetry.reportedEvents())).not.toMatch(/sa-1|sa-2/);
      });

      it('reports clearing the account of a disabled Worker as service_account', async () => {
        const { harness, service, telemetry } = await enableWorker(ATTACK_DISCOVERY);
        await service.update(ATTACK_DISCOVERY, { enabled: false }, SPACE, request);
        const revision = harness.documents.get(`${ATTACK_DISCOVERY}-${SPACE}`)?.version ?? null;
        telemetry.clear();

        const result = await service.update(
          ATTACK_DISCOVERY,
          { settings: { serviceAccountId: null }, settingsRevision: revision },
          SPACE,
          request
        );

        expect(result.outcome).toBe('updated');
        expect(telemetry.reportedEvents()).toEqual([
          { eventType: SETTINGS_CHANGED, payload: serviceAccountChange(revision) },
        ]);
      });
    });

    it('emits activation once when a settings save installs the Worker before its first enable', async () => {
      const telemetry = createTelemetry();
      const service = createPersistentHarness().createService(
        undefined,
        undefined,
        telemetry.reporter
      );

      const saved = await service.update(
        TRIAGE,
        { settings: { autonomy: 'supervised' }, settingsRevision: null },
        SPACE,
        request
      );
      if (saved.outcome !== 'updated') throw new Error('Expected the settings save to succeed');

      expect(telemetry.reportedEvents()).toEqual([
        {
          eventType: SETTINGS_CHANGED,
          payload: {
            bulk_write: false,
            is_default_space: true,
            next_value: 'supervised',
            previous_value: 'manual',
            setting: 'autonomy',
            watch_tag: 'watch-floor',
            worker_id: TRIAGE,
          },
        },
        {
          eventType: ACTIVATED,
          payload: {
            autonomy_level: 'supervised',
            enabled: false,
            is_default_space: true,
            watch_tag: 'watch-floor',
            worker_id: TRIAGE,
          },
        },
      ]);

      telemetry.clear();
      const enabled = await service.update(
        TRIAGE,
        {
          enabled: true,
          settings: { serviceAccountId: 'sa-1' },
          settingsRevision: saved.response.worker.settingsRevision,
        },
        SPACE,
        request
      );

      expect(enabled.outcome).toBe('updated');
      expect(telemetry.eventsOfType(ACTIVATED)).toEqual([]);
    });

    it('emits one activation for a PATCH that saves settings and enables together', async () => {
      const telemetry = createTelemetry();
      const service = createPersistentHarness().createService(
        undefined,
        undefined,
        telemetry.reporter
      );

      await service.update(
        TRIAGE,
        {
          enabled: true,
          settings: { autonomy: 'supervised', serviceAccountId: 'sa-1' },
          settingsRevision: null,
        },
        SPACE,
        request
      );

      // The account the first install binds is not reported; the autonomy choice is.
      expect(telemetry.eventsOfType(ACTIVATED)).toEqual([
        expect.objectContaining({ autonomy_level: 'supervised', enabled: true }),
      ]);
      expect(telemetry.eventsOfType(SETTINGS_CHANGED)).toEqual([
        expect.objectContaining({ bulk_write: false, setting: 'autonomy' }),
      ]);
    });

    it('omits autonomy_level from activation when the installed settings cannot be read', async () => {
      const telemetry = createTelemetry();
      const harness = createPersistentHarness();
      const service = harness.createService(undefined, undefined, telemetry.reporter);
      // The first read confirms the settings write; the read that projects the Worker fails.
      const getInstalledWorkflowState = harness.managedWorkflows
        .getInstalledWorkflowState as jest.Mock;
      const readState = getInstalledWorkflowState.getMockImplementation();
      if (!readState) throw new Error('Expected the harness to read installed state');
      getInstalledWorkflowState
        .mockImplementationOnce(readState)
        .mockRejectedValueOnce(new Error('storage down'));

      await service.update(
        TRIAGE,
        { enabled: true, settings: { serviceAccountId: 'sa-1' }, settingsRevision: null },
        SPACE,
        request
      );

      const [activation, ...rest] = telemetry.eventsOfType(ACTIVATED);
      expect(rest).toEqual([]);
      expect(activation).toEqual(expect.objectContaining({ enabled: true, worker_id: TRIAGE }));
      expect(activation).not.toHaveProperty('autonomy_level');
      expect(telemetry.rejectedReports()).toEqual([]);
    });

    it('emits activation with enabled false when a disable installs the Worker', async () => {
      const telemetry = createTelemetry();
      const service = createPersistentHarness().createService(
        undefined,
        undefined,
        telemetry.reporter
      );

      await service.update(TRIAGE, { enabled: false }, SPACE, request);

      expect(telemetry.reportedEvents()).toEqual([
        {
          eventType: ACTIVATED,
          payload: expect.objectContaining({ enabled: false, worker_id: TRIAGE }),
        },
      ]);
    });

    it('activates each space separately and marks events outside the default space', async () => {
      const telemetry = createTelemetry();
      const service = createPersistentHarness().createService(
        undefined,
        undefined,
        telemetry.reporter
      );

      await service.update(
        TRIAGE,
        { enabled: true, settings: { serviceAccountId: 'sa-1' }, settingsRevision: null },
        'space-a',
        request
      );
      await service.update(
        TRIAGE,
        { enabled: true, settings: { serviceAccountId: 'sa-1' }, settingsRevision: null },
        'space-b',
        request
      );

      expect(telemetry.eventsOfType(ACTIVATED)).toEqual([
        expect.objectContaining({ is_default_space: false }),
        expect.objectContaining({ is_default_space: false }),
      ]);
    });

    it('emits nothing for a Worker that is not found', async () => {
      const telemetry = createTelemetry();
      const service = createPersistentHarness().createService(
        undefined,
        undefined,
        telemetry.reporter
      );

      await expect(
        service.update('unknown-worker', { enabled: true }, SPACE, request)
      ).resolves.toEqual({ outcome: 'not-found' });
      expect(telemetry.reportedEvents()).toEqual([]);
    });

    it('still completes the update when the reporter throws', async () => {
      const throwingReporter: AlertZeroTelemetryReporter = () => {
        throw new Error('telemetry exploded');
      };
      const service = createPersistentHarness().createService(
        undefined,
        undefined,
        throwingReporter
      );

      const result = await service.update(
        TRIAGE,
        {
          enabled: true,
          settings: { autonomy: 'supervised', serviceAccountId: 'sa-1' },
          settingsRevision: null,
        },
        SPACE,
        request
      );

      expect(result.outcome).toBe('updated');
      if (result.outcome !== 'updated') throw new Error('Expected the update to succeed');
      expect(result.response.worker).toMatchObject({
        enabled: true,
        settings: { autonomy: 'supervised' },
      });
    });
  });
});
