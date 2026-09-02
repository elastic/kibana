/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { UpdateWorkerResponse } from '@kbn/pnd-common';
import { ListWorkersResponse, type UpdateWorkerRequestBody, type Worker } from '@kbn/pnd-common';
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
  Object.keys(right).every((key) => Object.hasOwn(left, key) && left[key] === right[key]);

export type WorkerUpdateResult =
  | { outcome: 'updated'; response: UpdateWorkerResponse }
  | { outcome: 'not-found' }
  | { outcome: 'rejected'; what: string }
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

  async list(request: KibanaRequest, spaceId: string): Promise<ListWorkersResponse> {
    await this.ensureAgent(spaceId);

    const agentLookup = await this.buildAgentLookup(request);
    const workers = await Promise.all(
      workerRegistry
        .list()
        .map((registration) => this.projectWorker(registration, spaceId, agentLookup))
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

    const agentLookup = await this.buildAgentLookup(request);
    return this.projectWorker(registration, spaceId, agentLookup);
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

    const touchesSettings = patch.autonomyLevel != null;
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
      const currentValues = state?.templateValues
        ? registration.settings.migrate(state.templateValues).values
        : registration.settings.createDefaultValues();
      const applied = registration.settings.applyPatch(currentValues, patch);
      if ('rejected' in applied) {
        return { outcome: 'rejected', what: applied.rejected };
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
    const worker = await this.projectWorker(registration, spaceId, agentLookup);
    return { outcome: 'updated', response: { worker } };
  }

  private async projectWorker(
    registration: WorkerRegistration,
    spaceId: string,
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
    let values = registration.settings.createDefaultValues();
    let settingsUnavailable = false;
    let definition: WorkflowYaml | null = null;

    if (status.installed) {
      enabled = Boolean(status.enabled);
      try {
        const state = await managedWorkflows.getInstalledWorkflowState(status.workflowId, spaceId);
        if (!state?.templateValues) {
          settingsUnavailable = true;
        } else {
          settingsRevision = state.documentVersion ?? null;
          values = registration.settings.migrate(state.templateValues).values;
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
          management.getWorkflow(status.workflowId, spaceId),
          management.getWorkflowExecutions(
            { workflowId: status.workflowId, page: 1, size: 1 },
            spaceId
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
      settings: registration.settings.toSettings(values),
      settingsRevision,
      skills: projectSkillsFromDefinition(definition, agentLookupCallback),
    };
  }
}
