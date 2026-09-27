/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { UpdateWorkerResponse } from '@kbn/alertzero-common';
import {
  ListWorkersResponse,
  SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID,
  touchesWorkerSettings,
  type UpdateWorkerRequestBody,
  type Worker,
} from '@kbn/alertzero-common';
import type { PluginScopedManagedWorkflowsApi } from '@kbn/workflows/server/types';
import type { WorkflowYaml } from '@kbn/workflows';
import { WorkflowSchema } from '@kbn/workflows';
import type { AgentTypeDefinition } from '@kbn/agent-builder-server/agents';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type { ManagedWorkflowDefinition } from '@kbn/workflows/managed';
import { getManagedWorkflowDefinition } from '@kbn/workflows/managed';
import { parseWorkflowYamlToJSON } from '@kbn/workflows-yaml';
import {
  installRegisteredWorker,
  workerRegistry,
  type WorkerRegistration,
} from '../../managed_workflows/worker_registry';
import type { WatchWorkflowsManagementClient } from '../watches/watch_workflows_management_client';
import type { AgentLookup } from '../utils';
import { buildAgentLookup, projectSkillsFromDefinition } from '../utils';

/**
 * Workers hidden until the named skill is registered. These skills may be
 * behind a feature flag and so are conditionally registered
 */
const WORKER_IDS_BY_REQUIRED_SKILL: Readonly<Record<string, readonly string[]>> = {
  'endpoint-forensic-analysis': [SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID],
};

const getDefinitionFromTemplate = (registration: WorkerRegistration): WorkflowYaml | null => {
  const managedDef: ManagedWorkflowDefinition | undefined = getManagedWorkflowDefinition(
    registration.id
  );
  if (managedDef && 'yamlTemplate' in managedDef) {
    const yaml = managedDef.yamlTemplate?.(registration.settings.createDefaultValues());
    if (yaml) {
      const result = parseWorkflowYamlToJSON(yaml, WorkflowSchema);
      return result.success ? (result.data as unknown as WorkflowYaml) : null;
    }
  }
  return null;
};

const templateValuesEqual = (
  left: Record<string, unknown> | null,
  right: Record<string, unknown>
): boolean =>
  left != null &&
  Object.keys(right).every((key) => Object.hasOwn(left, key) && isEqual(left[key], right[key]));

export type WorkerUpdateResult =
  | { outcome: 'updated'; response: UpdateWorkerResponse }
  | { outcome: 'not-found' }
  | { outcome: 'rejected'; what: string }
  | { outcome: 'invalid'; message: string }
  | { outcome: 'conflict' }
  | { outcome: 'unavailable' }
  | { outcome: 'failed' };

export class WorkersService {
  private readonly agentTypeMap: ReadonlyMap<string, AgentTypeDefinition>;

  constructor(
    private readonly management: WatchWorkflowsManagementClient | undefined,
    private readonly managedWorkflows:
      | Promise<PluginScopedManagedWorkflowsApi | undefined>
      | undefined,
    private readonly logger: Logger,
    private readonly agentOpts: {
      /** Lazy ensure of the shared thin agent for the caller's space. */
      ensureAgentForSpace?: (spaceId: string) => Promise<void>;
      agentBuilder?: AgentBuilderPluginStart;
      /** Code-registered agent types owned by this plugin, used for skill base resolution. */
      agentTypes?: readonly AgentTypeDefinition[];
    } = {}
  ) {
    this.agentTypeMap = new Map((agentOpts.agentTypes ?? []).map((t) => [t.id, t]));
  }

  private requireManagement(): WatchWorkflowsManagementClient {
    if (!this.management) {
      throw new Error('Workflows management API is not available');
    }
    return this.management;
  }

  private async requireManagedWorkflows(): Promise<PluginScopedManagedWorkflowsApi> {
    if (!this.managedWorkflows) {
      throw new Error('Managed Workflows API is not available');
    }
    const managedWorkflows = await this.managedWorkflows;
    if (!managedWorkflows) {
      throw new Error('Managed Workflows API is not available');
    }
    return managedWorkflows;
  }

  private async ensureAgent(spaceId: string): Promise<void> {
    await this.agentOpts.ensureAgentForSpace?.(spaceId);
  }

  private async buildAgentLookup(request: KibanaRequest) {
    if (!this.agentOpts.agentBuilder) return undefined;
    return buildAgentLookup(this.agentOpts.agentBuilder, this.agentTypeMap, request, this.logger);
  }

  private async hiddenWorkerIds(request: KibanaRequest): Promise<ReadonlySet<string>> {
    const entries = Object.entries(WORKER_IDS_BY_REQUIRED_SKILL);
    const gatedWorkerIds = entries.flatMap(([, workerIds]) => workerIds);
    if (gatedWorkerIds.length === 0) return new Set();

    const { agentBuilder } = this.agentOpts;
    if (!agentBuilder) return new Set(gatedWorkerIds);

    try {
      const registry = await agentBuilder.skills.getRegistry({ request });
      const checks = await Promise.all(
        entries.map(async ([skillId, workerIds]) => ({
          workerIds,
          registered: await registry.has(skillId),
        }))
      );
      return new Set(
        checks.filter(({ registered }) => !registered).flatMap(({ workerIds }) => workerIds)
      );
    } catch (error) {
      this.logger.warn(
        `Failed to read worker skill gates: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return new Set(gatedWorkerIds);
    }
  }

  async list(request: KibanaRequest, spaceId: string): Promise<ListWorkersResponse> {
    await this.ensureAgent(spaceId);

    const agentLookup = await this.buildAgentLookup(request);
    const hiddenWorkerIds = await this.hiddenWorkerIds(request);
    const workers = await Promise.all(
      workerRegistry
        .list()
        .filter((registration) => !hiddenWorkerIds.has(registration.id))
        .map((registration) => this.projectWorker(registration, spaceId, request, agentLookup))
    );
    return ListWorkersResponse.parse({ workers });
  }

  async get(
    workerId: string,
    request: KibanaRequest,
    spaceId: string
  ): Promise<Worker | undefined> {
    await this.ensureAgent(spaceId);
    const registration = workerRegistry.get(workerId);
    if (!registration) {
      return undefined;
    }
    if ((await this.hiddenWorkerIds(request)).has(registration.id)) {
      return undefined;
    }

    const agentLookup = await this.buildAgentLookup(request);
    return this.projectWorker(registration, spaceId, request, agentLookup);
  }

  async update(
    workerId: string,
    patch: UpdateWorkerRequestBody,
    spaceId: string,
    request: KibanaRequest
  ): Promise<WorkerUpdateResult> {
    const registration = workerRegistry.get(workerId);
    if (!registration) {
      return { outcome: 'not-found' };
    }
    if ((await this.hiddenWorkerIds(request)).has(registration.id)) {
      return { outcome: 'not-found' };
    }

    const touchesSettings = touchesWorkerSettings(patch);
    const managedWorkflows = await this.requireManagedWorkflows();
    const management = this.requireManagement();
    let status = await managedWorkflows.getWorkflowStatus(registration.id, {
      spaceId,
      workflowIdSuffix: spaceId,
    });

    if (touchesSettings) {
      if (patch.settingsRevision === undefined) {
        return { outcome: 'rejected', what: 'a settings update without its revision' };
      }

      const state = status.installed
        ? await managedWorkflows.getInstalledWorkflowState(status.workflowId, spaceId)
        : null;
      if (status.installed && !state) return { outcome: 'unavailable' };
      if (patch.settingsRevision !== (state?.documentVersion ?? null)) {
        return { outcome: 'conflict' };
      }
      const currentValues = state?.templateValues ?? registration.settings.createDefaultValues();
      const applied = registration.settings.applyPatch(currentValues, patch.settings ?? {});
      if ('invalid' in applied) {
        return { outcome: 'invalid', message: applied.invalid };
      }

      await installRegisteredWorker(managedWorkflows, registration, {
        spaceId,
        workflowIdSuffix: spaceId,
        values: applied.values,
      });
      status = await managedWorkflows.getWorkflowStatus(registration.id, {
        spaceId,
        workflowIdSuffix: spaceId,
      });
      if (!status.installed) return { outcome: 'unavailable' };
      const persisted = await managedWorkflows.getInstalledWorkflowState(
        status.workflowId,
        spaceId
      );
      if (!persisted || !templateValuesEqual(persisted.templateValues, applied.values)) {
        this.logger.error(
          `Worker "${registration.id}" settings write could not be confirmed after save`
        );
        return { outcome: 'failed' };
      }

      await management.updateWorkflow(
        status.workflowId,
        { enabled: Boolean(status.enabled) },
        spaceId,
        request
      );
      status = await managedWorkflows.getWorkflowStatus(registration.id, {
        spaceId,
        workflowIdSuffix: spaceId,
      });
    }

    if (patch.enabled != null) {
      if (!status.installed) {
        await installRegisteredWorker(managedWorkflows, registration, {
          spaceId,
          workflowIdSuffix: spaceId,
          values: registration.settings.createDefaultValues(),
        });
        status = await managedWorkflows.getWorkflowStatus(registration.id, {
          spaceId,
          workflowIdSuffix: spaceId,
        });
        if (!status.installed) return { outcome: 'unavailable' };
      }

      await management.updateWorkflow(
        status.workflowId,
        { enabled: patch.enabled },
        spaceId,
        request
      );
    }

    const agentLookup = await this.buildAgentLookup(request);
    const worker = await this.projectWorker(registration, spaceId, request, agentLookup);
    return { outcome: 'updated', response: { worker } };
  }

  private async projectWorker(
    registration: WorkerRegistration,
    spaceId: string,
    request: KibanaRequest,
    agentLookupCallback?: AgentLookup
  ): Promise<Worker> {
    const managedWorkflows = await this.requireManagedWorkflows();
    const status = await managedWorkflows.getWorkflowStatus(registration.id, {
      spaceId,
      workflowIdSuffix: spaceId,
    });

    let enabled = false;
    let lastRun: string | null = null;
    let settingsRevision: number | null = null;
    // Defaults stand in for an uninstalled Worker and for one whose stored settings cannot be read.
    let settings = registration.settings.toSettings(registration.settings.createDefaultValues());
    let settingsUnavailable = false;
    let definition: WorkflowYaml | null = null;

    if (status.installed) {
      enabled = Boolean(status.enabled);
      try {
        const state = await managedWorkflows.getInstalledWorkflowState(status.workflowId, spaceId);
        if (!state?.templateValues) {
          settingsUnavailable = true;
        } else {
          // Parse before taking the revision so an unreadable document reports revision null.
          settings = registration.settings.toSettings(state.templateValues);
          settingsRevision = state.documentVersion ?? null;
        }
      } catch (error) {
        settingsUnavailable = true;
        this.logger.warn(
          `Failed to read settings for worker ${registration.id}: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }

      try {
        const management = this.requireManagement();
        const [detail, executions] = await Promise.all([
          management.getWorkflow(status.workflowId, spaceId, request),
          management.getWorkflowExecutions(
            { workflowId: status.workflowId, page: 1, size: 1 },
            spaceId,
            request
          ),
        ]);
        definition = detail?.definition ?? null;
        lastRun = executions.results[0]?.startedAt ?? null;
      } catch (error) {
        this.logger.debug(
          `Failed to load workflow detail or executions for worker ${registration.id}: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    } else {
      definition = getDefinitionFromTemplate(registration);
    }

    return {
      id: registration.id,
      name: registration.catalog.name,
      watchIds: [registration.catalog.watchId],
      enabled,
      lastRun,
      state: settingsUnavailable ? 'unavailable' : enabled ? 'ok' : 'paused',
      ...(settingsUnavailable
        ? { stateReason: 'Worker settings could not be read from durable storage' }
        : {}),
      settings,
      settingsRevision,
      // `installed` is any document at this id, including a user workflow that is not ours.
      workflowId: status.installed && status.status !== 'not_managed' ? status.workflowId : null,
      skills: projectSkillsFromDefinition(definition, agentLookupCallback),
    };
  }
}
