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
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type { AgentTypeDefinition } from '@kbn/agent-builder-server/agents';
import type { PluginScopedManagedWorkflowsApi } from '@kbn/workflows/server/types';
import {
  compareWatchesForDisplay,
  GetWatchResponse,
  ListWatchesResponse,
  WATCH_TAG,
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
import { buildAgentLookup, SkillsProjectionService } from '../utils';
import {
  getWatch as getStoredWatch,
  listSkills as listStoredSkills,
  listWatches as listStoredWatches,
  listWorkers as listStoredWorkers,
  setWorkerEnabled as setStoredWorkerEnabled,
} from '../watch_store/watch_store';
import { fetchWatchWorkflows, toWatchListItem } from './fetch_watch_workflows';

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
  private readonly agentTypeMap: ReadonlyMap<string, AgentTypeDefinition>;
  private readonly skillsProjectionService?: SkillsProjectionService;

  constructor(
    private readonly management: WatchWorkflowsManagementClient | undefined,
    private readonly managedWorkflows:
      | Promise<PluginScopedManagedWorkflowsApi | undefined>
      | undefined,
    private readonly logger: Logger,
    private readonly useMockData: boolean,
    private readonly agentOpts: {
      /** Lazy ensure of the shared thin agent for the caller's space. */
      ensureAgentForSpace?: (spaceId: string) => Promise<void>;
      agentBuilder?: AgentBuilderPluginStart;
      /** Code-registered agent types owned by this plugin, used for skill base resolution. */
      agentTypes?: readonly AgentTypeDefinition[];
    } = {}
  ) {
    this.agentTypeMap = new Map((agentOpts.agentTypes ?? []).map((t) => [t.id, t]));
    this.skillsProjectionService = management
      ? new SkillsProjectionService(
          management,
          managedWorkflows,
          logger,
          agentOpts.agentBuilder,
          agentOpts.agentTypes
        )
      : undefined;
    if (!useMockData && !management) {
      logger.warn(
        'WatchesService: Workflows Management is unavailable — falling back to mock data'
      );
    }
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

  /* ---------------------------------------------------------------------- */
  /* Reads                                                                  */
  /* ---------------------------------------------------------------------- */

  async list(request: KibanaRequest, spaceId: string): Promise<ListWatchesResponse> {
    await this.ensureAgent(spaceId);
    if (this.useMockData) {
      const watches = await this.withWorkflowEnablement(listStoredWatches(), spaceId);
      return ListWatchesResponse.parse({ watches: [...watches].sort(compareWatchesForDisplay) });
    }

    const managedWorkflows = await this.requireManagedWorkflows();
    const management = this.requireManagement();
    const [{ items, notInstalledRegistrations }, agents] = await Promise.all([
      fetchWatchWorkflows(management, managedWorkflows, spaceId, this.logger, {
        includeExecutionHistory: true,
      }),
      this.buildAgentLookup(request),
    ]);

    const watches = items.map((item) => projectWorkflowToWatch(item, agents));
    watches.push(...notInstalledRegistrations.map((r) => projectNotInstalledWatch(r.watch)));

    return ListWatchesResponse.parse({ watches: watches.sort(compareWatchesForDisplay) });
  }

  async get(
    request: KibanaRequest,
    watchId: string,
    spaceId: string
  ): Promise<GetWatchResponse | undefined> {
    await this.ensureAgent(spaceId);
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
      const agents = await this.buildAgentLookup(request);
      const projectedWatch = projectWorkflowToWatch(
        { ...listItem, history, tags: detail.definition?.tags },
        agents
      );
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
    const response = await this.get(request, watchId, spaceId);
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
          const response = await this.get(request, registration.id, spaceId);
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

    const response = await this.get(request, registration.id, spaceId);
    return response ? { outcome: 'updated', response } : { outcome: 'not-found' };
  }

  /* ---------------------------------------------------------------------- */
  /* Global worker and skill catalogs — store-only for now                  */
  /* ---------------------------------------------------------------------- */

  listWorkers(): WatchWorker[] {
    return listStoredWorkers();
  }

  async listSkills(request: KibanaRequest, spaceId: string): Promise<WatchSkill[]> {
    if (this.useMockData) {
      return listStoredSkills();
    }

    await this.ensureAgent(spaceId);

    if (this.skillsProjectionService) {
      return await this.skillsProjectionService.list(request, spaceId);
    }

    return [];
  }

  setWorkerEnabled(workerId: string, enabled: boolean): WatchWorker | undefined {
    return setStoredWorkerEnabled(workerId, enabled);
  }
}
