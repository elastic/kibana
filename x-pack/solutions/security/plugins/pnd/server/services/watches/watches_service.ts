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
 * Settings have no home in that workflow yet, so they live in the in-memory `watch_store` until we
 * decide how they reach the workflow definition. Both backings sit behind this one interface so that
 * migration is a change here, not in seven route handlers.
 *
 * Where each field is written today:
 *   - `enabled`  → the real workflow, via `updateWorkflow`. The Workflows API permits this on a
 *     managed workflow because it is an enablement-only update; anything else on a managed workflow
 *     throws `ManagedWorkflowUpdateForbiddenError`.
 *   - everything else → `watch_store`, which resets when Kibana restarts.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import { getManagedWorkflowSelectorVisibilityContext } from '@kbn/workflows';
import {
  WATCH_TAG,
  compareWatchesForDisplay,
  GetWatchResponse,
  ListWatchesResponse,
  type ApprovalRequirement,
  type Watch,
  type WatchAutonomyLevel,
  type WatchSkill,
  type WatchWorker,
} from '@kbn/pnd-common';
import {
  buildCustomWatchYaml,
  normalizeWorkflowTriggerType,
  projectWorkflowToWatch,
} from './project_watch';
import { createWatchDeleteForbiddenError, createWatchNotFoundError } from './watch_errors';
import type { WatchWorkflowsManagementClient } from './watch_workflows_management_client';
import {
  getWatch as getStoredWatch,
  getWatchSettings as getStoredWatchSettings,
  listSkills as listStoredSkills,
  listWatches as listStoredWatches,
  listWorkers as listStoredWorkers,
  setSkillEnabled as setStoredSkillEnabled,
  setWatchApprovalGate,
  setWatchAutonomy,
  setWatchEnabled as setStoredWatchEnabled,
  setWatchScopeRouting,
  setWatchSkillEnabled,
  setWatchTriggers,
  setWatchWorkerEnabled,
  setWorkerEnabled as setStoredWorkerEnabled,
  type WatchScopeRoutingPatch,
  type WatchTriggersPatch,
} from '../watch_store/watch_store';

const WATCH_VISIBILITY_CONTEXT = getManagedWorkflowSelectorVisibilityContext('watch');

export interface CreateWatchRequest {
  name: string;
  description?: string;
}

export interface WatchUpdatePatch {
  enabled?: boolean;
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
  | { outcome: 'unavailable' };

export type WatchScheduleResult =
  | { outcome: 'scheduled' }
  | { outcome: 'not-found' }
  | { outcome: 'unavailable' };

export class WatchesService {
  constructor(
    private readonly management: WatchWorkflowsManagementClient | undefined,
    private readonly logger: Logger,
    private readonly useMockData: boolean,
    private readonly installationReady: Promise<void> = Promise.resolve()
  ) {}

  private requireManagement(): WatchWorkflowsManagementClient {
    if (!this.management) {
      throw new Error('Workflows management API is not available');
    }
    return this.management;
  }

  /* ---------------------------------------------------------------------- */
  /* Reads                                                                  */
  /* ---------------------------------------------------------------------- */

  async list(spaceId: string): Promise<ListWatchesResponse> {
    if (this.useMockData) {
      const watches = await this.withWorkflowEnablement(listStoredWatches(), spaceId);
      return ListWatchesResponse.parse({ watches: [...watches].sort(compareWatchesForDisplay) });
    }

    await this.installationReady;
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

    const watches = result.results
      .filter((item) => {
        const tags = item.tags?.length ? item.tags : item.definition?.tags ?? [];
        return tags.includes(WATCH_TAG);
      })
      .map(projectWorkflowToWatch)
      .sort(compareWatchesForDisplay);

    return ListWatchesResponse.parse({ watches });
  }

  async get(watchId: string, spaceId: string): Promise<GetWatchResponse | undefined> {
    if (this.useMockData) {
      const stored = getStoredWatch(watchId);
      if (!stored) {
        return undefined;
      }
      const [watch] = await this.withWorkflowEnablement([stored], spaceId);
      return GetWatchResponse.parse({ watch, settings: getStoredWatchSettings(watchId) });
    }

    await this.installationReady;
    const management = this.requireManagement();
    const detail = await management.getWorkflow(watchId, spaceId);
    if (!detail) {
      return undefined;
    }

    const tags = detail.definition?.tags ?? [];
    if (!tags.includes(WATCH_TAG)) {
      return undefined;
    }

    const listItem = {
      id: detail.id,
      name: detail.name,
      description: detail.description ?? '',
      enabled: detail.enabled,
      managed: detail.managed,
      managedBy: detail.managedBy,
      definition: detail.definition,
      createdAt: detail.createdAt,
      tags,
      valid: detail.valid,
      history: undefined,
    };

    // Enrich with recent executions when possible
    try {
      const executions = await management.getWorkflowExecutions(
        { workflowId: watchId, page: 1, size: 10 },
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
      const watch = projectWorkflowToWatch({ ...listItem, history, tags: detail.definition?.tags });

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
      });
    } catch (error) {
      this.logger.debug(
        `Failed to load executions for watch ${watchId}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return GetWatchResponse.parse({ watch: projectWorkflowToWatch(listItem) });
    }
  }

  /**
   * `enabled` is authoritative on the workflow even in mock mode, so the toggle reflects real state
   * and survives a restart while the rest of the seeded watch does not. Falls back to the stored
   * value when Workflows is unavailable or the workflow has not been installed yet.
   */
  private async withWorkflowEnablement(watches: Watch[], spaceId: string): Promise<Watch[]> {
    if (!this.management || watches.length === 0) {
      return watches;
    }

    try {
      await this.installationReady;
      const result = await this.management.getWorkflows(
        {
          tags: [WATCH_TAG],
          size: 100,
          page: 1,
          enabled: [true, false],
          managedFilter: 'all',
          visibilityContext: [WATCH_VISIBILITY_CONTEXT],
        },
        spaceId
      );
      const enabledById = new Map(result.results.map((item) => [item.id, item.enabled]));

      return watches.map((watch) => {
        const enabled = enabledById.get(watch.id);
        return enabled == null ? watch : { ...watch, enabled };
      });
    } catch (error) {
      this.logger.debug(
        `Failed to read workflow enablement, falling back to stored values: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return watches;
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
    const touchesSettings =
      autonomyLevel != null || triggers || scopeRouting || approvalGate || worker || skill;

    // Settings only exist in the store, so a settings patch is meaningless without it.
    if (touchesSettings && !this.useMockData) {
      return { outcome: 'unavailable' };
    }

    // Settings are validated and applied before `enabled`, deliberately. `enabled` is the one field
    // that leaves a real, persisted side effect on the backing workflow, so a rejected patch must not
    // reach it: a body carrying both would otherwise disable the workflow and then return 400 for the
    // invalid setting, telling the caller that nothing had changed.
    if (touchesSettings) {
      if (!getStoredWatchSettings(watchId)) {
        return { outcome: 'not-found' };
      }

      if (autonomyLevel != null && !setWatchAutonomy(watchId, autonomyLevel)) {
        return { outcome: 'rejected', what: 'autonomy level' };
      }
      if (triggers && !setWatchTriggers(watchId, triggers)) {
        return { outcome: 'rejected', what: 'trigger settings' };
      }
      if (scopeRouting && !setWatchScopeRouting(watchId, scopeRouting)) {
        return { outcome: 'rejected', what: 'scope and routing settings' };
      }
      if (approvalGate) {
        const { gateId, ...gatePatch } = approvalGate;
        if (!setWatchApprovalGate(watchId, gateId, gatePatch)) {
          return { outcome: 'rejected', what: `approval gate "${gateId}"` };
        }
      }
      if (worker && !setWatchWorkerEnabled(watchId, worker.workerId, worker.enabled)) {
        return { outcome: 'rejected', what: `worker "${worker.workerId}"` };
      }
      if (skill && !setWatchSkillEnabled(watchId, skill.skillId, skill.enabled)) {
        return { outcome: 'rejected', what: `skill "${skill.skillId}"` };
      }
    }

    if (enabled != null) {
      const applied = await this.applyEnabled(watchId, enabled, spaceId, request);
      if (applied === 'not-found') {
        return { outcome: 'not-found' };
      }
    }

    const response = await this.get(watchId, spaceId);
    return response ? { outcome: 'updated', response } : { outcome: 'not-found' };
  }

  /**
   * Enablement-only updates are the one mutation the Workflows API allows on a managed workflow, so
   * this is a real write. Mirrors into the store as a fallback when Workflows is unavailable.
   */
  private async applyEnabled(
    watchId: string,
    enabled: boolean,
    spaceId: string,
    request: KibanaRequest
  ): Promise<'applied' | 'not-found'> {
    if (this.useMockData && !getStoredWatch(watchId)) {
      return 'not-found';
    }

    if (!this.management) {
      return setStoredWatchEnabled(watchId, enabled) ? 'applied' : 'not-found';
    }

    try {
      await this.installationReady;
      await this.management.updateWorkflow(watchId, { enabled }, spaceId, request);
    } catch (error) {
      this.logger.warn(
        `Failed to persist enabled=${enabled} for watch ${watchId} to its workflow: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      if (!this.useMockData) {
        return 'not-found';
      }
    }

    // Keep the store in step so a mock-mode read agrees even if the workflow write failed.
    setStoredWatchEnabled(watchId, enabled);
    return 'applied';
  }

  /**
   * Registers the space-scoped Task Manager schedule for a watch's `scheduled` trigger.
   *
   * PND installs its watches through the managed static-install path, which writes the workflow
   * document but never wires the scheduler; scheduling only happens once an enablement update
   * reaches the Workflows management API. This re-asserts `enabled: true` for the caller's space so
   * `syncSchedulerAfterSave` programs the trigger's task there. Idempotent — Task Manager updates
   * the deterministic task in place when it already exists.
   */
  async ensureSchedule(
    watchId: string,
    spaceId: string,
    request: KibanaRequest
  ): Promise<WatchScheduleResult> {
    if (!this.management) {
      return { outcome: 'unavailable' };
    }

    await this.installationReady;

    const detail = await this.management.getWorkflow(watchId, spaceId);
    if (!detail) {
      return { outcome: 'not-found' };
    }

    await this.management.updateWorkflow(watchId, { enabled: true }, spaceId, request);
    // Keep the mock-mode store in step so a subsequent read reflects the enablement.
    setStoredWatchEnabled(watchId, true);
    return { outcome: 'scheduled' };
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

  /* ---------------------------------------------------------------------- */
  /* Custom watch lifecycle                                                 */
  /* ---------------------------------------------------------------------- */

  async createCustom(
    request: KibanaRequest,
    spaceId: string,
    body: CreateWatchRequest
  ): Promise<GetWatchResponse> {
    const management = this.requireManagement();
    const name = body.name.trim() || 'Custom watch';
    const description =
      body.description?.trim() ||
      'Custom watch scaffold — tagged watch so it appears in the Watches catalog.';
    const yaml = buildCustomWatchYaml(name, description);
    const created = await management.createWorkflow({ yaml }, spaceId, request);
    const projected = await this.get(created.id, spaceId);
    if (!projected) {
      throw new Error(`Created watch "${created.id}" but failed to reload it`);
    }
    return projected;
  }

  async deleteCustom(request: KibanaRequest, watchId: string, spaceId: string): Promise<void> {
    const management = this.requireManagement();
    const detail = await management.getWorkflow(watchId, spaceId);
    if (!detail) {
      throw createWatchNotFoundError(watchId);
    }
    if (detail.managed === true) {
      throw createWatchDeleteForbiddenError(watchId);
    }
    const tags = detail.definition?.tags ?? [];
    if (!tags.includes(WATCH_TAG)) {
      throw createWatchNotFoundError(watchId);
    }
    await management.deleteWorkflows([watchId], spaceId, request);
  }
}
