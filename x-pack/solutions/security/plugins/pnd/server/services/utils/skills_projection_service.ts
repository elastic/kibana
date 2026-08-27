/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type { AgentTypeDefinition } from '@kbn/agent-builder-server/agents';
import { compareWatchesForDisplay, type Watch, type WatchSkill } from '@kbn/pnd-common';
import type { PluginScopedManagedWorkflowsApi } from '@kbn/workflows/server/types';
import type { WatchWorkflowsManagementClient } from '../watches/watch_workflows_management_client';
import { fetchWatchWorkflows } from '../watches/fetch_watch_workflows';
import { buildAgentLookup } from './build_agent_lookup';
import { projectWorkflowToWatch } from '../watches/project_watch';

const CACHE_TTL_MS = 5 * 60 * 1000;

interface CachedState {
  skills: WatchSkill[];
  fetchedAt: number;
}

// Cache of skills projected from PND workflows
export class SkillsProjectionService {
  private readonly cacheBySpace = new Map<string, CachedState>();
  private readonly agentTypeMap: ReadonlyMap<string, AgentTypeDefinition>;

  constructor(
    private readonly management: WatchWorkflowsManagementClient,
    private readonly managedWorkflows:
      | Promise<PluginScopedManagedWorkflowsApi | undefined>
      | undefined,
    private readonly logger: Logger,
    private readonly agentBuilder?: AgentBuilderPluginStart,
    agentTypes: readonly AgentTypeDefinition[] = []
  ) {
    this.agentTypeMap = new Map(agentTypes.map((t) => [t.id, t]));
  }

  private buildSkillsFromWatches(watches: Watch[], previousSkills: WatchSkill[]): WatchSkill[] {
    const skillMap = new Map<string, { watchIds: Set<string>; name?: string; summary?: string }>();
    for (const watch of watches) {
      for (const skill of watch.skills) {
        const entry = skillMap.get(skill.id) ?? { watchIds: new Set<string>() };
        entry.watchIds.add(watch.id);
        if (!entry.name && skill.name) entry.name = skill.name;
        if (!entry.summary && skill.summary) entry.summary = skill.summary;
        skillMap.set(skill.id, entry);
      }
    }
    return [...skillMap.entries()].map(([id, { watchIds, name, summary }]) => {
      const prev = previousSkills.find((s) => s.id === id);
      return { id, watchIds: [...watchIds], lastRun: prev?.lastRun ?? null, name, summary };
    });
  }

  private isStale(spaceId: string): boolean {
    const cached = this.cacheBySpace.get(spaceId);
    return cached === undefined || Date.now() - cached.fetchedAt > CACHE_TTL_MS;
  }

  private async refresh(request: KibanaRequest, spaceId: string): Promise<void> {
    const agentLookup = this.agentBuilder
      ? await buildAgentLookup(this.agentBuilder, this.agentTypeMap, request, this.logger)
      : undefined;

    const managedWorkflows = await this.managedWorkflows;
    const { items } = await fetchWatchWorkflows(
      this.management,
      managedWorkflows,
      spaceId,
      this.logger
    );

    const watches = items
      .map((item) => projectWorkflowToWatch(item, agentLookup))
      .sort(compareWatchesForDisplay);

    const previousSkills = this.cacheBySpace.get(spaceId)?.skills ?? [];
    this.cacheBySpace.set(spaceId, {
      skills: this.buildSkillsFromWatches(watches, previousSkills),
      fetchedAt: Date.now(),
    });
  }

  private async getCached(request: KibanaRequest, spaceId: string): Promise<WatchSkill[]> {
    if (this.isStale(spaceId)) {
      await this.refresh(request, spaceId);
    }
    return this.cacheBySpace.get(spaceId)?.skills ?? [];
  }

  invalidate(spaceId: string): void {
    this.cacheBySpace.delete(spaceId);
  }

  async list(request: KibanaRequest, spaceId: string): Promise<WatchSkill[]> {
    return this.getCached(request, spaceId);
  }

  async get(request: KibanaRequest, spaceId: string, watchIds: string[]): Promise<WatchSkill[]> {
    const skills = await this.getCached(request, spaceId);
    return skills.filter((s) => watchIds.some((id) => s.watchIds.includes(id)));
  }
}
