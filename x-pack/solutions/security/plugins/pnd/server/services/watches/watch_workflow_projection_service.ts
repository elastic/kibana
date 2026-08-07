/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import { WATCH_TAG, type WatchSettings } from '@kbn/pnd-common';
import { compareWatchesForDisplay, GetWatchResponse, ListWatchesResponse } from '@kbn/pnd-common';
import { WorkflowsManagementApiActions } from '@kbn/workflows';
import { normalizeWorkflowTriggerType, projectWorkflowToWatch } from './project_watch';
import { ensurePrebuiltWatches, type EnsurePrebuiltWatchesResult } from './ensure_prebuilt_watches';
import { updateWatchSettings } from './watch_settings_write';
import { createWatchNotFoundError } from './watch_errors';
import type { WatchWorkflowsManagementClient } from './watch_workflows_management_client';

export class WatchWorkflowProjectionService {
  constructor(
    private readonly management: WatchWorkflowsManagementClient | undefined,
    private readonly logger: Logger
  ) {}

  private requireManagement(): WatchWorkflowsManagementClient {
    if (!this.management) {
      throw new Error('Workflows management API is not available');
    }
    return this.management;
  }

  async setup(request: KibanaRequest, spaceId: string): Promise<EnsurePrebuiltWatchesResult> {
    const management = this.requireManagement();
    return ensurePrebuiltWatches({ management, spaceId, request, logger: this.logger });
  }

  async list(request: KibanaRequest, spaceId: string): Promise<ListWatchesResponse> {
    const management = this.requireManagement();
    const includeExecutionHistory =
      request.authzResult?.[WorkflowsManagementApiActions.readExecution] === true;
    const includeManagedExecutionHistory =
      includeExecutionHistory &&
      request.authzResult?.[WorkflowsManagementApiActions.readManagedExecution] === true;

    // Discovery remains tag-based so customer-authored watches and future
    // starting points do not need to be added to an id allow-list.
    const result = await management.getWorkflows(
      {
        tags: [WATCH_TAG],
        size: 100,
        page: 1,
        enabled: [true, false],
        managedFilter: 'all',
      },
      spaceId,
      { includeExecutionHistory, includeManagedExecutionHistory }
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

  async get(
    watchId: string,
    spaceId: string,
    request: KibanaRequest
  ): Promise<GetWatchResponse | undefined> {
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

    const canReadExecutionHistory =
      request.authzResult?.[WorkflowsManagementApiActions.readExecution] === true &&
      (!detail.managed ||
        request.authzResult?.[WorkflowsManagementApiActions.readManagedExecution] === true);
    if (!canReadExecutionHistory) {
      return GetWatchResponse.parse({ watch: projectWorkflowToWatch(listItem) });
    }

    // Enrich with recent executions when authorized.
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
      const watch = projectWorkflowToWatch({
        ...listItem,
        history,
        tags: detail.definition?.tags,
      });

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

  async updateSettings(
    request: KibanaRequest,
    watchId: string,
    spaceId: string,
    settings: WatchSettings
  ): Promise<GetWatchResponse> {
    const management = this.requireManagement();
    await updateWatchSettings({ management, watchId, spaceId, request, settings });
    const projected = await this.get(watchId, spaceId, request);
    if (!projected) {
      throw createWatchNotFoundError(watchId);
    }
    return projected;
  }
}
