/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The single seam routes use to read and write watches.
 *
 * A watch has no storage of its own — it is projected from a managed Workflow by `project_watch.ts`.
 * Settings are read from and written to managed template values through the Common Watch registry
 * in both live and mock presentation modes.
 *
 * Where each field is written today:
 *   - `enabled` → install the per-space managed definition when needed, then update it in place.
 *   - registered live settings → install with versioned managed template values.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import {
  getManagedWorkflowSelectorVisibilityContext,
  type WorkflowDetailDto,
  type WorkflowListItemDto,
} from '@kbn/workflows';
import type { PluginScopedManagedWorkflowsApi } from '@kbn/workflows/server/types';
import {
  WATCH_TAG,
  compareWatchesForDisplay,
  GetWatchResponse,
  ListWatchesResponse,
  type ApprovalRequirement,
  type Watch,
  type WatchAutonomyLevel,
  type WatchSettings,
  type WatchSkill,
  type WatchWorker,
} from '@kbn/pnd-common';
import {
  installRegisteredWatch,
  watchRegistry,
  type WatchRegistration,
} from '../../managed_workflows/watch_registry';
import { normalizeWorkflowTriggerType, projectWorkflowToWatch } from './project_watch';
import type { WatchWorkflowsManagementClient } from './watch_workflows_management_client';
import {
  getWatch as getStoredWatch,
  listSkills as listStoredSkills,
  listWatches as listStoredWatches,
  listWorkers as listStoredWorkers,
  setSkillEnabled as setStoredSkillEnabled,
  setWorkerEnabled as setStoredWorkerEnabled,
} from '../watch_store/watch_store';
import { PND_MANAGED_WORKFLOW_OWNER_ID } from '../../../common/constants';

const WATCH_VISIBILITY_CONTEXT = getManagedWorkflowSelectorVisibilityContext('watch');

const toWatchListItem = (detail: WorkflowDetailDto): WorkflowListItemDto => ({
  id: detail.id,
  name: detail.name,
  description: detail.description ?? '',
  enabled: detail.enabled,
  managed: detail.managed,
  managedBy: detail.managedBy,
  definition: detail.definition,
  createdAt: detail.createdAt,
  tags: detail.definition?.tags ?? [],
  valid: detail.valid,
  history: undefined,
});

const projectNotInstalledWatch = (watch: Watch): Watch => structuredClone(watch);

const templateValuesEqual = (
  left: Record<string, unknown> | null,
  right: Record<string, unknown>
): boolean =>
  left != null &&
  Object.keys(right).every((key) => Object.hasOwn(left, key) && left[key] === right[key]);

export interface WatchTriggersPatch {
  scheduleId?: string;
  allowManualRun?: boolean;
}

export interface WatchScopeRoutingPatch {
  dataSources?: string;
  assigneeQueue?: string;
  escalationContact?: string;
}

export interface WatchUpdatePatch {
  enabled?: boolean;
  settingsRevision?: number | null;
  autonomyLevel?: WatchAutonomyLevel;
  triggers?: WatchTriggersPatch;
  scopeRouting?: WatchScopeRoutingPatch;
  approvalGate?: {
    gateId: string;
    requirement?: ApprovalRequirement;
    approverRoleId?: string;
  };
  worker?: { workerId: string; enabled: boolean };
  skill?: { skillId: string; enabled: boolean };
}

/**
 * Result rather than thrown errors, so the service stays free of HTTP concerns and the route decides
 * the status code.
 */
export type WatchUpdateResult =
  | { outcome: 'updated'; response: GetWatchResponse }
  | { outcome: 'not-found' }
  | { outcome: 'rejected'; what: string }
  | { outcome: 'conflict' }
  | { outcome: 'unavailable' }
  | { outcome: 'failed' };

export class WatchesService {
  constructor(
    private readonly management: WatchWorkflowsManagementClient | undefined,
    private readonly managedWorkflows:
      | Promise<PluginScopedManagedWorkflowsApi | undefined>
      | undefined,
    private readonly logger: Logger,
    private readonly useMockData: boolean
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

  /* ---------------------------------------------------------------------- */
  /* Reads                                                                  */
  /* ---------------------------------------------------------------------- */

  async list(spaceId: string): Promise<ListWatchesResponse> {
    if (this.useMockData) {
      const watches = await this.withWorkflowEnablement(listStoredWatches(), spaceId);
      return ListWatchesResponse.parse({ watches: [...watches].sort(compareWatchesForDisplay) });
    }

    const managedWorkflows = await this.requireManagedWorkflows();
    const management = this.requireManagement();
    // Managed catalog watches opt into `selector:watch` visibility; custom
    // unmanaged watches still match via tag `watch` under managedFilter `all`.
    // Default getWorkflows managedFilter is 'unmanaged' — must request 'all'.
    const result = await management.getWorkflows(
      {
        tags: [WATCH_TAG],
        size: 100,
        page: 1,
        enabled: [true, false],
        managedFilter: 'all',
        visibilityContext: [WATCH_VISIBILITY_CONTEXT],
      },
      spaceId,
      { includeExecutionHistory: true, includeManagedExecutionHistory: true }
    );

    const statuses = await Promise.all(
      watchRegistry.list().map(async (registration) => ({
        registration,
        status: await managedWorkflows.getWorkflowStatus(registration.id, {
          spaceId,
          workflowIdSuffix: spaceId,
        }),
      }))
    );
    const registrationByDocumentId = new Map(
      statuses.map(({ registration, status }) => [status.workflowId, registration])
    );
    const watches = result.results
      .filter((item) => {
        const tags = item.tags?.length ? item.tags : item.definition?.tags ?? [];
        const isLegacyGlobalWatch =
          item.managedBy === PND_MANAGED_WORKFLOW_OWNER_ID &&
          watchRegistry.get(item.id) !== undefined;
        return tags.includes(WATCH_TAG) && !isLegacyGlobalWatch;
      })
      .map((item) => {
        const watch = projectWorkflowToWatch(item);
        const registration = registrationByDocumentId.get(item.id);
        return registration ? { ...watch, id: registration.id } : watch;
      });

    const watchIds = new Set(watches.map(({ id }) => id));
    const missingCatalog = await Promise.all(
      statuses
        .filter(({ registration }) => !watchIds.has(registration.id))
        .map(async ({ registration, status }) => {
          // The PND catalog is the registry, not Workflows search visibility. Installed watches
          // omitted from getWorkflows (selector filter, pagination) must still appear.
          if (status.installed) {
            try {
              const detail = await management.getWorkflow(status.workflowId, spaceId);
              if (detail) {
                return {
                  ...projectWorkflowToWatch(toWatchListItem(detail)),
                  id: registration.id,
                };
              }
            } catch (error) {
              this.logger.debug(
                `Failed to project installed watch ${registration.id}: ${
                  error instanceof Error ? error.message : String(error)
                }`
              );
            }
          }
          return projectNotInstalledWatch(registration.watch);
        })
    );
    watches.push(...missingCatalog);

    return ListWatchesResponse.parse({ watches: watches.sort(compareWatchesForDisplay) });
  }

  async get(watchId: string, spaceId: string): Promise<GetWatchResponse | undefined> {
    if (this.useMockData) {
      const stored = getStoredWatch(watchId);
      if (!stored) {
        return undefined;
      }
      const registration = watchRegistry.get(watchId);
      const watch = structuredClone(stored);
      let settings: WatchSettings | undefined;
      let settingsRevision: number | null = null;

      if (registration) {
        try {
          const managedWorkflows = await this.requireManagedWorkflows();
          const status = await managedWorkflows.getWorkflowStatus(registration.id, {
            spaceId,
            workflowIdSuffix: spaceId,
          });
          watch.enabled = status.installed ? Boolean(status.enabled) : false;

          if (registration.settings) {
            const state = status.installed
              ? await managedWorkflows.getInstalledWorkflowState(status.workflowId, spaceId)
              : null;
            settingsRevision = state?.documentVersion ?? null;
            const values = state?.templateValues
              ? registration.settings.migrate(state.templateValues).values
              : registration.settings.createDefaultValues();
            settings = registration.settings.toSettings(values);
          }
        } catch (error) {
          this.logger.debug(
            `Failed to read durable mock watch state for ${watchId}: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
          watch.enabled = false;
          settings = undefined;
        }
      }

      return GetWatchResponse.parse({
        watch,
        settings,
        settingsRevision,
      });
    }

    const registration = watchRegistry.get(watchId);
    let workflowDocumentId = watchId;
    if (registration) {
      const managedWorkflows = await this.requireManagedWorkflows();
      const status = await managedWorkflows.getWorkflowStatus(registration.id, {
        spaceId,
        workflowIdSuffix: spaceId,
      });
      if (!status.installed) {
        const settings = registration.settings?.toSettings(
          registration.settings.createDefaultValues()
        );
        return GetWatchResponse.parse({
          watch: projectNotInstalledWatch(registration.watch),
          settings,
          settingsRevision: null,
        });
      }
      workflowDocumentId = status.workflowId;
    }

    const management = this.requireManagement();
    const detail = await management.getWorkflow(workflowDocumentId, spaceId);
    if (!detail) {
      return undefined;
    }

    const tags = detail.definition?.tags ?? [];
    if (!tags.includes(WATCH_TAG)) {
      return undefined;
    }

    const listItem = toWatchListItem(detail);

    let settings: WatchSettings | undefined;
    let settingsRevision: number | null = null;
    if (registration?.settings) {
      try {
        const state = await (
          await this.requireManagedWorkflows()
        ).getInstalledWorkflowState(workflowDocumentId, spaceId);
        settingsRevision = state?.documentVersion ?? null;
        const values = state?.templateValues
          ? registration.settings.migrate(state.templateValues).values
          : registration.settings.createDefaultValues();
        settings = registration.settings.toSettings(values);
      } catch (error) {
        this.logger.warn(
          `Failed to read settings for watch ${watchId}: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }

    // Enrich with recent executions when possible
    try {
      const executions = await management.getWorkflowExecutions(
        { workflowId: workflowDocumentId, page: 1, size: 10 },
        spaceId
      );
      const history = executions.results.map((run) => ({
        id: run.id,
        workflowId: run.workflowId,
        workflowName: run.workflowName,
        status: run.status,
        startedAt: run.startedAt,
        finishedAt: run.finishedAt,
        duration: run.duration,
      }));
      const projectedWatch = projectWorkflowToWatch({
        ...listItem,
        history,
        tags: detail.definition?.tags,
      });
      const watch = registration ? { ...projectedWatch, id: registration.id } : projectedWatch;

      // Attach step summaries for the latest few runs
      const enrichedRuns = await Promise.all(
        watch.recentRuns.slice(0, 5).map(async (run) => {
          try {
            const full = await management.getWorkflowExecution(run.executionId, spaceId);
            if (!full?.stepExecutions?.length) return run;
            return {
              ...run,
              triggerType: normalizeWorkflowTriggerType(full.triggeredBy),
              steps: full.stepExecutions.map((step) => ({
                name: step.stepId ?? step.id,
                type: step.stepType,
                status: String(step.status),
              })),
              summary: full.stepExecutions.map((s) => s.stepId ?? s.id).join(' → ') || run.summary,
            };
          } catch {
            return run;
          }
        })
      );

      return GetWatchResponse.parse({
        watch: {
          ...watch,
          // Enrich the latest 5 with step detail; keep any additional projected runs.
          recentRuns: [...enrichedRuns, ...watch.recentRuns.slice(5)],
        },
        settings,
        settingsRevision,
      });
    } catch (error) {
      this.logger.debug(
        `Failed to load executions for watch ${watchId}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      const projectedWatch = projectWorkflowToWatch(listItem);
      return GetWatchResponse.parse({
        watch: registration ? { ...projectedWatch, id: registration.id } : projectedWatch,
        settings,
        settingsRevision,
      });
    }
  }

  /** `enabled` is authoritative on the per-space managed workflow even in mock mode. */
  private async withWorkflowEnablement(watches: Watch[], spaceId: string): Promise<Watch[]> {
    if (watches.length === 0) {
      return watches;
    }

    try {
      const managedWorkflows = await this.requireManagedWorkflows();
      const enablement = await Promise.all(
        watches.map(async (watch) => {
          const registration = watchRegistry.get(watch.id);
          if (!registration) return [watch.id, watch.enabled] as const;
          const status = await managedWorkflows.getWorkflowStatus(registration.id, {
            spaceId,
            workflowIdSuffix: spaceId,
          });
          return [watch.id, status.installed ? Boolean(status.enabled) : false] as const;
        })
      );
      const enabledById = new Map(enablement);

      return watches.map((watch) => ({ ...watch, enabled: enabledById.get(watch.id) ?? false }));
    } catch (error) {
      this.logger.debug(
        `Failed to read managed workflow enablement: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return watches.map((watch) => ({ ...watch, enabled: false }));
    }
  }

  /* ---------------------------------------------------------------------- */
  /* Writes                                                                 */
  /* ---------------------------------------------------------------------- */

  async update(
    watchId: string,
    patch: WatchUpdatePatch,
    spaceId: string,
    request: KibanaRequest
  ): Promise<WatchUpdateResult> {
    const { enabled, autonomyLevel, triggers, scopeRouting, approvalGate, worker, skill } = patch;
    const touchesSettings = Boolean(
      autonomyLevel != null || triggers || scopeRouting || approvalGate || worker || skill
    );
    const registration = watchRegistry.get(watchId);

    if (registration) {
      return this.updateManagedWatch(registration, patch, touchesSettings, spaceId, request);
    }

    if (this.useMockData) {
      return { outcome: touchesSettings ? 'unavailable' : 'not-found' };
    }

    if (touchesSettings) return { outcome: 'unavailable' };
    if (enabled != null) {
      const management = this.requireManagement();
      const detail = await management.getWorkflow(watchId, spaceId);
      if (!detail) return { outcome: 'not-found' };
      await management.updateWorkflow(watchId, { enabled }, spaceId, request);
    }
    const response = await this.get(watchId, spaceId);
    return response ? { outcome: 'updated', response } : { outcome: 'not-found' };
  }

  private async updateManagedWatch(
    registration: WatchRegistration,
    patch: WatchUpdatePatch,
    touchesSettings: boolean,
    spaceId: string,
    request: KibanaRequest
  ): Promise<WatchUpdateResult> {
    const managedWorkflows = await this.requireManagedWorkflows();
    const management = this.requireManagement();
    let status = await managedWorkflows.getWorkflowStatus(registration.id, {
      spaceId,
      workflowIdSuffix: spaceId,
    });

    if (touchesSettings) {
      if (!registration.settings) return { outcome: 'unavailable' };
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

      await installRegisteredWatch(managedWorkflows, registration, {
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
          `Watch "${registration.id}" settings write could not be confirmed after save`
        );
        return { outcome: 'failed' };
      }
    }

    if (patch.enabled != null) {
      if (!status.installed) {
        if (!patch.enabled) {
          const response = await this.get(registration.id, spaceId);
          return response ? { outcome: 'updated', response } : { outcome: 'not-found' };
        }

        if (registration.settings) {
          await installRegisteredWatch(managedWorkflows, registration, {
            spaceId,
            workflowIdSuffix: spaceId,
            values: registration.settings.createDefaultValues(),
          });
        } else {
          await installRegisteredWatch(managedWorkflows, registration, {
            spaceId,
            workflowIdSuffix: spaceId,
          });
        }
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

    const response = await this.get(registration.id, spaceId);
    return response ? { outcome: 'updated', response } : { outcome: 'not-found' };
  }

  /* ---------------------------------------------------------------------- */
  /* Global worker and skill catalogs — store-only for now                  */
  /* ---------------------------------------------------------------------- */

  listWorkers(): WatchWorker[] {
    return listStoredWorkers();
  }

  listSkills(): WatchSkill[] {
    return listStoredSkills();
  }

  setWorkerEnabled(workerId: string, enabled: boolean): WatchWorker | undefined {
    return setStoredWorkerEnabled(workerId, enabled);
  }

  setSkillEnabled(skillId: string, enabled: boolean): WatchSkill | undefined {
    return setStoredSkillEnabled(skillId, enabled);
  }
}
