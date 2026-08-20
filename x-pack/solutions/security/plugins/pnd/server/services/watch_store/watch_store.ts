/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * In-memory watch store for live (non-mock) mode.
 *
 * Populated by calling refresh() with a KibanaRequest and spaceId. Fetches watches from the
 * Workflows API, projects them via project_watch, and builds the global skill catalog. State
 * resets when Kibana restarts; there is no persistence yet.
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

export class WatchStore implements IWatchStore {
  private state: WatchStoreState | undefined;
  private readonly agentTypeMap: ReadonlyMap<string, AgentTypeDefinition>;

  constructor(
    private readonly management: WatchWorkflowsManagementClient,
    private readonly logger: Logger,
    private readonly agentBuilder?: AgentBuilderPluginStart,
    agentTypes: readonly AgentTypeDefinition[] = []
  ) {
    this.state = { watches: [], skills: [], settingsByWatchId: new Map() };
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

    const settings = new Map<string, WatchSettings>();
    for (const watch of watches) {
      const existing = this.state?.settingsByWatchId.get(watch.id);
      const entry: WatchSettings = existing ?? { watchId: watch.id, autonomy: 'manual' };
      const skillAttachments = watch.callables
        .filter((c) => c.kind === 'skill')
        .map(
          (c) =>
            existing?.skills?.find((s) => s.skillId === c.id) ?? { skillId: c.id, enabled: true }
        );
      if (skillAttachments.length > 0) {
        entry.skills = skillAttachments;
      }
      settings.set(watch.id, entry);
    }

    this.state = {
      watches,
      skills: this.buildSkillsFromWatches(watches, this.listSkills()),
      settingsByWatchId: settings,
    };

    return watches;
  }

  async ensurePopulated(request: KibanaRequest, spaceId: string): Promise<void> {
    if (this.listSkills().length > 0) return;
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

  listWatches(): Watch[] {
    return this.state?.watches ?? [];
  }

  getWatch(watchId: string): Watch | undefined {
    return this.listWatches().find((w) => w.id === watchId);
  }

  setWatchEnabled(watchId: string, enabled: boolean): Watch | undefined {
    const watch = this.getWatch(watchId);
    if (!watch) {
      return undefined;
    }
    watch.enabled = enabled;
    return watch;
  }

  /* -------------------------------------------------------------------------- */
  /* Per-watch settings — not supported in live mode; service gates on useMockData */
  /* -------------------------------------------------------------------------- */

  getWatchSettings(watchId: string): WatchSettings | undefined {
    return this.state?.settingsByWatchId.get(watchId);
  }

  setWatchAutonomy(_watchId: string, _level: WatchAutonomyLevel): WatchSettings | undefined {
    // not supportedfor live data
    return undefined;
  }

  setWatchTriggers(_watchId: string, _patch: WatchTriggersPatch): WatchSettings | undefined {
    // not supportedfor live data
    return undefined;
  }

  setWatchScopeRouting(
    _watchId: string,
    _patch: WatchScopeRoutingPatch
  ): WatchSettings | undefined {
    // not supportedfor live data
    return undefined;
  }

  setWatchApprovalGate(
    _watchId: string,
    _gateId: string,
    _patch: Partial<Pick<WatchApprovalGate, 'requirement' | 'approverRoleId'>>
  ): WatchSettings | undefined {
    // not supportedfor live data
    return undefined;
  }

  setWatchWorkerEnabled(
    _watchId: string,
    _workerId: string,
    _enabled: boolean
  ): WatchSettings | undefined {
    // not supportedfor live data
    return undefined;
  }

  setWatchSkillEnabled(
    watchId: string,
    skillId: string,
    enabled: boolean
  ): WatchSettings | undefined {
    const settings = this.getWatchSettings(watchId);
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

  projectSkillsForWatch(watch: Watch): WatchSkill[] {
    return this.buildSkillsFromWatches([watch], this.listSkills());
  }

  listSkills(): WatchSkill[] {
    return this.state?.skills ?? [];
  }

  setSkillEnabled(skillId: string, enabled: boolean): WatchSkill | undefined {
    const skill = this.listSkills().find((candidate) => candidate.id === skillId);
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
    // not supportedfor live data
    return [];
  }

  setWorkerEnabled(_workerId: string, _enabled: boolean): WatchWorker | undefined {
    // not supportedfor live data
    return undefined;
  }
}
