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
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type { AgentTypeDefinition } from '@kbn/agent-builder-server/agents';
import {
  buildCustomWatchYaml,
  normalizeWorkflowTriggerType,
  projectWorkflowToWatch,
} from './project_watch';
import { createWatchDeleteForbiddenError, createWatchNotFoundError } from './watch_errors';
import type { WatchWorkflowsManagementClient } from './watch_workflows_management_client';
import type { AgentLookup } from './types';

export interface CreateWatchRequest {
  name: string;
  description?: string;
}

const WATCH_VISIBILITY_CONTEXT = getManagedWorkflowSelectorVisibilityContext('watch');

export class WatchWorkflowProjectionService {
  private readonly agentTypeMap: ReadonlyMap<string, AgentTypeDefinition>;

  constructor(
    private readonly management: WatchWorkflowsManagementClient | undefined,
    private readonly logger: Logger,
    private readonly installationReady: Promise<void> = Promise.resolve(),
    private readonly options: {
      /** Lazy ensure of the shared thin agent for the caller's space. */
      ensureAgentForSpace?: (spaceId: string) => Promise<void>;
      agentBuilder?: AgentBuilderPluginStart;
      /** Code-registered agent types owned by this plugin, used for skill base resolution. */
      agentTypes?: readonly AgentTypeDefinition[];
    } = {}
  ) {
    this.agentTypeMap = new Map((options.agentTypes ?? []).map((t) => [t.id, t]));
  }

  private requireManagement(): WatchWorkflowsManagementClient {
    if (!this.management) {
      throw new Error('Workflows management API is not available');
    }
    return this.management;
  }

  private async prepareSpace(spaceId: string): Promise<void> {
    await this.installationReady;
    await this.options.ensureAgentForSpace?.(spaceId);
  }

  private async buildAgentLookup(request: KibanaRequest): Promise<AgentLookup | undefined> {
    if (!this.options.agentBuilder) return undefined;
    try {
      // RBAC concerns? Using this to project skill IDs from workflow to UI "callable"
      // but is it possible a user has access to workflows but not agent builder?
      const [agentRegistry, skillRegistry] = await Promise.all([
        this.options.agentBuilder.agents.getRegistry({ request }),
        this.options.agentBuilder.skills.getRegistry({ request }),
      ]);
      const [agentList, skillList] = await Promise.all([
        agentRegistry.list(),
        skillRegistry.list(),
      ]);
      const agentMap = new Map(agentList.map((a) => [a.id, a]));
      const skillMap = new Map(skillList.map((s) => [s.id, s]));
      return {
        getAgent: (id) => agentMap.get(id) ?? null,
        getSkill: (id) => skillMap.get(id) ?? null,
        getAgentType: (typeId) => {
          const typeDef = this.agentTypeMap.get(typeId);
          if (!typeDef) return null;
          // TODO baseConfiguration can be an async resolvable function
          // this handles only the case where it's a static object (which is most common for code-owned types)
          const base =
            typeof typeDef.baseConfiguration === 'function' ? undefined : typeDef.baseConfiguration;
          return { baseConfiguration: { skill_ids: base?.skill_ids } };
        },
      };
    } catch (error) {
      // Non-blocking error - UI won't be rendered correctly with skill projections
      this.logger.debug(
        `Failed to build agent lookup: ${error instanceof Error ? error.message : String(error)}`
      );
      return undefined;
    }
  }

  async list(request: KibanaRequest, spaceId: string): Promise<ListWatchesResponse> {
    await this.prepareSpace(spaceId);
    const management = this.requireManagement();
    const agents = await this.buildAgentLookup(request);

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
      .map((item) => projectWorkflowToWatch(item, agents))
      .sort(compareWatchesForDisplay);

    return ListWatchesResponse.parse({ watches });
  }

  async get(
    watchId: string,
    spaceId: string,
    request: KibanaRequest
  ): Promise<GetWatchResponse | undefined> {
    await this.prepareSpace(spaceId);
    const management = this.requireManagement();
    const agents = await this.buildAgentLookup(request);
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
      const watch = projectWorkflowToWatch(
        { ...listItem, history, tags: detail.definition?.tags },
        agents
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
      return GetWatchResponse.parse({ watch: projectWorkflowToWatch(listItem, agents) });
    }
  }

  async createCustom(
    request: KibanaRequest,
    spaceId: string,
    body: CreateWatchRequest
  ): Promise<GetWatchResponse> {
    await this.prepareSpace(spaceId);
    const management = this.requireManagement();
    const name = body.name.trim() || 'Custom watch';
    const description =
      body.description?.trim() ||
      'Custom watch scaffold — tagged watch so it appears in the Watches catalog.';
    const yaml = buildCustomWatchYaml(name, description);
    const created = await management.createWorkflow({ yaml }, spaceId, request);
    const projected = await this.get(created.id, spaceId, request);
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
