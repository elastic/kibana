/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import { getManagedWorkflowSelectorVisibilityContext } from '@kbn/workflows';
import { WATCH_TAG } from '@kbn/pnd-common';
import { compareWatchesForDisplay, GetWatchResponse, ListWatchesResponse } from '@kbn/pnd-common';

export interface CreateWatchRequest {
  name: string;
  description?: string;
}
import {
  buildCustomWatchYaml,
  normalizeWorkflowTriggerType,
  projectWorkflowToWatch,
} from './project_watch';
import { ensurePrebuiltWatches } from './ensure_prebuilt_watches';
import {
  isPrebuiltWatchId,
  PREBUILT_WATCH_CATALOG,
} from './prebuilt_watch_catalog';
import {
  applyCatalogUpdate,
  extractProvenance,
  extractScheduleInterval,
  updateWatchSettings,
  type WatchSettingsPatch,
} from './watch_settings_write';
import { createWatchDeleteForbiddenError, createWatchNotFoundError } from './watch_errors';
import type { WatchWorkflowsManagementClient } from './watch_workflows_management_client';

const WATCH_VISIBILITY_CONTEXT = getManagedWorkflowSelectorVisibilityContext('watch');

export class WatchWorkflowProjectionService {
  constructor(
    private readonly management: WatchWorkflowsManagementClient | undefined,
    private readonly logger: Logger,
    private readonly installationReady: Promise<void> = Promise.resolve()
  ) {}

  private requireManagement(): WatchWorkflowsManagementClient {
    if (!this.management) {
      throw new Error('Workflows management API is not available');
    }
    return this.management;
  }

  /**
   * POC: first-visit seed of the four user-owned pre-built watches.
   * Must run under a KibanaRequest (createWorkflow requires one).
   */
  async ensurePrebuilt(request: KibanaRequest, spaceId: string): Promise<void> {
    const management = this.requireManagement();
    await ensurePrebuiltWatches({
      management,
      spaceId,
      request,
      logger: this.logger,
    });
  }

  async list(request: KibanaRequest, spaceId: string): Promise<ListWatchesResponse> {
    await this.installationReady;
    const management = this.requireManagement();

    // POC single-catalogue: seed user-owned pre-builts on first list visit.
    await this.ensurePrebuilt(request, spaceId);

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
        if (!tags.includes(WATCH_TAG)) return false;
        // POC: hide leftover managed system-* watches so the catalogue is the
        // four user-owned pre-builts only (installStatic is also skipped).
        if (item.managed === true) return false;
        if (String(item.id).startsWith('system-security-watch-')) return false;
        return true;
      })
      .map((item) => this.enrichWatchProjection(projectWorkflowToWatch(item), item.definition))
      .sort(compareWatchesForDisplay);

    return ListWatchesResponse.parse({ watches });
  }

  async get(watchId: string, spaceId: string): Promise<GetWatchResponse | undefined> {
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
    // POC: managed leftovers are not part of the pre-built catalogue.
    if (detail.managed === true || watchId.startsWith('system-security-watch-')) {
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
      const watch = this.enrichWatchProjection(
        projectWorkflowToWatch({ ...listItem, history, tags: detail.definition?.tags }),
        detail.definition
      );

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
      return GetWatchResponse.parse({
        watch: this.enrichWatchProjection(projectWorkflowToWatch(listItem), detail.definition),
      });
    }
  }

  /** POC: write settings onto the user-owned workflow document (one store). */
  async updateSettings(
    request: KibanaRequest,
    watchId: string,
    spaceId: string,
    patch: WatchSettingsPatch
  ): Promise<GetWatchResponse> {
    const management = this.requireManagement();
    await updateWatchSettings({ management, watchId, spaceId, request, patch });
    const projected = await this.get(watchId, spaceId);
    if (!projected) {
      throw createWatchNotFoundError(watchId);
    }
    return projected;
  }

  /** POC: take a shipped catalogue update, re-applying customer settings. */
  async applyUpdate(
    request: KibanaRequest,
    watchId: string,
    spaceId: string,
    force?: boolean
  ): Promise<{ result: Awaited<ReturnType<typeof applyCatalogUpdate>>; watch?: GetWatchResponse }> {
    const management = this.requireManagement();
    const result = await applyCatalogUpdate({
      management,
      watchId,
      spaceId,
      request,
      force,
    });
    if (!result.updated) {
      return { result };
    }
    const watch = await this.get(watchId, spaceId);
    return { result, watch: watch ?? undefined };
  }

  private enrichWatchProjection<T extends ReturnType<typeof projectWorkflowToWatch>>(
    watch: T,
    definition: Parameters<typeof extractProvenance>[0]
  ): T & {
    updateAvailable?: boolean;
    seedContentVersion?: number;
    catalogVersion?: number;
    scheduleInterval?: string;
  } {
    const provenance = extractProvenance(definition);
    const scheduleInterval = extractScheduleInterval(definition);
    if (!isPrebuiltWatchId(watch.id)) {
      return scheduleInterval ? { ...watch, scheduleInterval } : watch;
    }
    const catalogVersion = PREBUILT_WATCH_CATALOG[watch.id].version;
    const seedContentVersion = provenance?.seedContentVersion;
    const updateAvailable =
      typeof seedContentVersion === 'number' && seedContentVersion < catalogVersion;
    return {
      ...watch,
      updateAvailable,
      seedContentVersion,
      catalogVersion,
      scheduleInterval,
    };
  }

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
