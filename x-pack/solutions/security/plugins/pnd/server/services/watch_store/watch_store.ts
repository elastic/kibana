/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * In-memory watch store for live (non-mock) mode.
 *
 * State is keyed by spaceId — each space has its own watch list, skill catalog, and settings.
 * Data is cached for CACHE_TTL_MS (5 min) so routine list/get calls within a short window share
 * one Workflows API round-trip. ensurePopulated() re-fetches once the TTL expires, so newly
 * created watches and workflow changes appear within that window without a restart.
 *
 * In-memory mutations (e.g. setSkillEnabled) survive a cache refresh because refresh() merges
 * existing catalog state into the newly projected result.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type { AgentTypeDefinition } from '@kbn/agent-builder-server/agents';
import {
  WATCH_TAG,
  compareWatchesForDisplay,
  type Watch,
  type WatchApprovalGate,
  type WatchAutonomyLevel,
  type WatchSettings,
  type WatchSkill,
  type WatchWorker,
} from '@kbn/pnd-common';
import { getManagedWorkflowSelectorVisibilityContext } from '@kbn/workflows';
import { projectWorkflowToWatch } from '../watches/project_watch';
import type { WatchWorkflowsManagementClient } from '../watches/watch_workflows_management_client';
import { buildAgentLookup } from '../watches/build_agent_lookup';
import type {
  IWatchStore,
  WatchScopeRoutingPatch,
  WatchTriggersPatch,
  WatchStoreState,
} from './types';

const WATCH_VISIBILITY_CONTEXT = getManagedWorkflowSelectorVisibilityContext('watch');
const CACHE_TTL_MS = 5 * 60 * 1000;

export class WatchStore implements IWatchStore {
  private readonly stateBySpace = new Map<string, WatchStoreState>();
  private readonly fetchedAtBySpace = new Map<string, number>();
  private readonly agentTypeMap: ReadonlyMap<string, AgentTypeDefinition>;

  constructor(
    private readonly management: WatchWorkflowsManagementClient,
    private readonly logger: Logger,
    private readonly agentBuilder?: AgentBuilderPluginStart,
    agentTypes: readonly AgentTypeDefinition[] = []
  ) {
    this.agentTypeMap = new Map(agentTypes.map((t) => [t.id, t]));
  }

  async refresh(request: KibanaRequest, spaceId: string): Promise<Watch[]> {
    const agents = this.agentBuilder
      ? await buildAgentLookup(this.agentBuilder, this.agentTypeMap, request, this.logger)
      : undefined;

    const result = await this.management.getWorkflows(
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

    const existing = this.stateBySpace.get(spaceId);
    const settings = new Map<string, WatchSettings>();
    for (const watch of watches) {
      const prev = existing?.settingsByWatchId.get(watch.id);
      const entry: WatchSettings = prev ?? { watchId: watch.id, autonomy: 'manual' };
      const skillAttachments = watch.callables
        .filter((c) => c.kind === 'skill')
        .map(
          (c) => prev?.skills?.find((s) => s.skillId === c.id) ?? { skillId: c.id, enabled: true }
        );
      if (skillAttachments.length > 0) {
        entry.skills = skillAttachments;
      }
      settings.set(watch.id, entry);
    }

    this.stateBySpace.set(spaceId, {
      watches,
      skills: this.buildSkillsFromWatches(watches, this.listSkills(spaceId)),
      settingsByWatchId: settings,
    });
    this.fetchedAtBySpace.set(spaceId, Date.now());

    return watches;
  }

  async ensurePopulated(request: KibanaRequest, spaceId: string): Promise<void> {
    const fetchedAt = this.fetchedAtBySpace.get(spaceId) ?? 0;
    if (Date.now() - fetchedAt < CACHE_TTL_MS) return;
    await this.refresh(request, spaceId);
  }

  private buildSkillsFromWatches(watches: Watch[], existingCatalog: WatchSkill[]): WatchSkill[] {
    const skillMap = new Map<string, Set<string>>();
    for (const watch of watches) {
      for (const callable of watch.callables) {
        if (callable.kind !== 'skill') continue;
        const watchIds = skillMap.get(callable.id) ?? new Set<string>();
        watchIds.add(watch.id);
        skillMap.set(callable.id, watchIds);
      }
    }
    return [...skillMap.entries()].map(([id, watchIds]) => {
      const existing = existingCatalog.find((s) => s.id === id);
      return {
        id,
        watchIds: [...watchIds],
        enabled: existing?.enabled ?? true,
        lastRun: existing?.lastRun ?? null,
      };
    });
  }

  /* -------------------------------------------------------------------------- */
  /* Watches                                                                    */
  /* -------------------------------------------------------------------------- */

  listWatches(spaceId: string): Watch[] {
    return this.stateBySpace.get(spaceId)?.watches ?? [];
  }

  getWatch(watchId: string, spaceId: string): Watch | undefined {
    return this.listWatches(spaceId).find((w) => w.id === watchId);
  }

  setWatchEnabled(watchId: string, enabled: boolean, spaceId: string): Watch | undefined {
    const watch = this.getWatch(watchId, spaceId);
    if (!watch) {
      return undefined;
    }
    watch.enabled = enabled;
    return watch;
  }

  /* -------------------------------------------------------------------------- */
  /* Per-watch settings — not supported in live mode; service gates on useMockData */
  /* -------------------------------------------------------------------------- */

  getWatchSettings(watchId: string, spaceId: string): WatchSettings | undefined {
    return this.stateBySpace.get(spaceId)?.settingsByWatchId.get(watchId);
  }

  setWatchAutonomy(
    _watchId: string,
    _level: WatchAutonomyLevel,
    _spaceId: string
  ): WatchSettings | undefined {
    // not supported for live data
    return undefined;
  }

  setWatchTriggers(
    _watchId: string,
    _patch: WatchTriggersPatch,
    _spaceId: string
  ): WatchSettings | undefined {
    // not supported for live data
    return undefined;
  }

  setWatchScopeRouting(
    _watchId: string,
    _patch: WatchScopeRoutingPatch,
    _spaceId: string
  ): WatchSettings | undefined {
    // not supported for live data
    return undefined;
  }

  setWatchApprovalGate(
    _watchId: string,
    _gateId: string,
    _patch: Partial<Pick<WatchApprovalGate, 'requirement' | 'approverRoleId'>>,
    _spaceId: string
  ): WatchSettings | undefined {
    // not supported for live data
    return undefined;
  }

  setWatchWorkerEnabled(
    _watchId: string,
    _workerId: string,
    _enabled: boolean,
    _spaceId: string
  ): WatchSettings | undefined {
    // not supported for live data
    return undefined;
  }

  setWatchSkillEnabled(
    watchId: string,
    skillId: string,
    enabled: boolean,
    spaceId: string
  ): WatchSettings | undefined {
    const settings = this.getWatchSettings(watchId, spaceId);
    const attachment = settings?.skills?.find((candidate) => candidate.skillId === skillId);

    if (!settings || !attachment) {
      return undefined;
    }
    attachment.enabled = enabled;
    return settings;
  }

  /* -------------------------------------------------------------------------- */
  /* Skill catalog                                                               */
  /* -------------------------------------------------------------------------- */

  listSkills(spaceId: string): WatchSkill[] {
    return this.stateBySpace.get(spaceId)?.skills ?? [];
  }

  setSkillEnabled(skillId: string, enabled: boolean, spaceId: string): WatchSkill | undefined {
    const skill = this.listSkills(spaceId).find((candidate) => candidate.id === skillId);
    if (!skill) {
      return undefined;
    }
    skill.enabled = enabled;
    return skill;
  }

  /* -------------------------------------------------------------------------- */
  /* Worker catalog — not populated in live mode                                */
  /* -------------------------------------------------------------------------- */

  listWorkers(): WatchWorker[] {
    // not supported for live data
    return [];
  }

  setWorkerEnabled(_workerId: string, _enabled: boolean): WatchWorker | undefined {
    // not supported for live data
    return undefined;
  }
}
