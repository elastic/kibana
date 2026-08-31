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
import {
  installRegisteredWorker,
  workerRegistry,
  type WorkerRegistration,
} from '../../managed_workflows/worker_registry';
import type { WatchWorkflowsManagementClient } from '../watches/watch_workflows_management_client';

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
  constructor(
    private readonly management: WatchWorkflowsManagementClient | undefined,
    private readonly managedWorkflows:
      | Promise<PluginScopedManagedWorkflowsApi | undefined>
      | undefined,
    private readonly logger: Logger
  ) {}

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

  async list(spaceId: string): Promise<ListWorkersResponse> {
    const workers = await Promise.all(
      workerRegistry.list().map((registration) => this.projectWorker(registration, spaceId))
    );
    return ListWorkersResponse.parse({ workers });
  }

  async get(workerId: string, spaceId: string): Promise<Worker | undefined> {
    const registration = workerRegistry.get(workerId);
    if (!registration) {
      return undefined;
    }
    return this.projectWorker(registration, spaceId);
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
        if (!patch.enabled) {
          const worker = await this.projectWorker(registration, spaceId);
          return { outcome: 'updated', response: { worker } };
        }

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

    const worker = await this.projectWorker(registration, spaceId);
    return { outcome: 'updated', response: { worker } };
  }

  private async projectWorker(registration: WorkerRegistration, spaceId: string): Promise<Worker> {
    const managedWorkflows = await this.requireManagedWorkflows();
    const status = await managedWorkflows.getWorkflowStatus(registration.id, {
      spaceId,
      workflowIdSuffix: spaceId,
    });

    let enabled = false;
    let lastRun: string | null = null;
    let settingsRevision: number | null = null;
    let values = registration.settings.createDefaultValues();

    if (status.installed) {
      enabled = Boolean(status.enabled);
      try {
        const state = await managedWorkflows.getInstalledWorkflowState(status.workflowId, spaceId);
        settingsRevision = state?.documentVersion ?? null;
        if (state?.templateValues) {
          values = registration.settings.migrate(state.templateValues).values;
        }
      } catch (error) {
        this.logger.warn(
          `Failed to read settings for worker ${registration.id}: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }

      try {
        const executions = await this.requireManagement().getWorkflowExecutions(
          { workflowId: status.workflowId, page: 1, size: 1 },
          spaceId
        );
        lastRun = executions.results[0]?.startedAt ?? null;
      } catch (error) {
        this.logger.debug(
          `Failed to load executions for worker ${registration.id}: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }

    return {
      id: registration.id,
      name: registration.catalog.name,
      watchIds: [registration.catalog.watchId],
      enabled,
      lastRun,
      state: enabled ? 'ok' : 'paused',
      settings: registration.settings.toSettings(values),
      settingsRevision,
    };
  }
}
