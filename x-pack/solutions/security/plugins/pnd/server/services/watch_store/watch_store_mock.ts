/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * In-memory watch store for mock mode, seeded from `@kbn/pnd-common` constants.
 *
 * State lives on the class instance and is seeded from `@kbn/pnd-common` on construction, so
 * writes survive across calls within the same service instance but reset when the service is
 * re-created. That is the intended behaviour for a UX reference implementation — see
 * https://github.com/elastic/security-team/issues/18717 for the real persistence work.
 *
 * Mock data is global (not space-scoped). The spaceId parameter on all interface methods is
 * accepted for interface compatibility but ignored — all spaces see the same seed data.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type {
  Watch,
  WatchApprovalGate,
  WatchAutonomyLevel,
  WatchSettings,
  WatchSkill,
  WatchWorker,
} from '@kbn/pnd-common';
import {
  SKILLS_SEED,
  WATCHES_SEED,
  WATCH_SETTINGS_SEED,
  WORKERS_SEED,
  type WatchSettingsSeed,
} from '@kbn/pnd-common';
import type {
  IWatchStore,
  WatchScopeRoutingPatch,
  WatchTriggersPatch,
  WatchStoreState,
} from './types';

const isoSecondsAgo = (seededAt: number, secondsAgo: number): string =>
  new Date(seededAt - secondsAgo * 1000).toISOString();

const seedSettings = (seed: WatchSettingsSeed, seededAt: number): WatchSettings => {
  const { runsLedger, ...rest } = seed;
  return {
    ...rest,
    runsLedger: runsLedger?.map(({ timeSecondsAgo, ...entry }) => ({
      ...entry,
      time: isoSecondsAgo(seededAt, timeSecondsAgo),
    })),
  };
};

const seedStore = (): WatchStoreState => {
  const seededAt = Date.now();
  return {
    watches: structuredClone(WATCHES_SEED),
    settingsByWatchId: new Map(
      Object.entries(structuredClone(WATCH_SETTINGS_SEED)).map(([watchId, seed]) => [
        watchId,
        seedSettings(seed, seededAt),
      ])
    ),
    workers: structuredClone(WORKERS_SEED).map(({ lastRunSecondsAgo, ...worker }) => ({
      ...worker,
      lastRun: lastRunSecondsAgo == null ? null : isoSecondsAgo(seededAt, lastRunSecondsAgo),
    })),
    skills: structuredClone(SKILLS_SEED).map(({ lastRunSecondsAgo, ...skill }) => ({
      ...skill,
      lastRun: lastRunSecondsAgo == null ? null : isoSecondsAgo(seededAt, lastRunSecondsAgo),
    })),
  };
};

const SCOPE_ROUTING_SELECTS = ['dataSources', 'assigneeQueue', 'escalationContact'] as const;

export class MockWatchStore implements IWatchStore {
  private state: WatchStoreState | undefined;

  constructor() {
    this.state = seedStore();
  }

  private getState(): WatchStoreState {
    if (!this.state) {
      this.state = seedStore();
    }
    return this.state;
  }

  /** Drops state so the next read re-seeds. Intended for tests. */
  reset(): void {
    this.state = undefined;
  }

  async refresh(_request: KibanaRequest, _spaceId: string): Promise<Watch[]> {
    return this.getState().watches;
  }

  async ensurePopulated(_request: KibanaRequest, _spaceId: string): Promise<void> {
    this.getState();
  }

  /* -------------------------------------------------------------------------- */
  /* Watches                                                                    */
  /* -------------------------------------------------------------------------- */

  listWatches(_spaceId: string): Watch[] {
    return this.getState().watches;
  }

  getWatch(watchId: string, _spaceId: string): Watch | undefined {
    return this.getState().watches.find((watch) => watch.id === watchId);
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
  /* Per-watch settings                                                         */
  /* -------------------------------------------------------------------------- */

  getWatchSettings(watchId: string, _spaceId: string): WatchSettings | undefined {
    return this.getState().settingsByWatchId.get(watchId);
  }

  setWatchAutonomy(
    watchId: string,
    level: WatchAutonomyLevel,
    spaceId: string
  ): WatchSettings | undefined {
    const settings = this.getWatchSettings(watchId, spaceId);
    if (!settings) return undefined;
    settings.autonomy = level;
    return settings;
  }

  setWatchTriggers(
    watchId: string,
    { scheduleId, allowManualRun }: WatchTriggersPatch,
    spaceId: string
  ): WatchSettings | undefined {
    const settings = this.getWatchSettings(watchId, spaceId);
    if (!settings?.triggers) return undefined;
    if (scheduleId != null) {
      // Reject ids the watch does not offer rather than storing an unresolvable value.
      if (!settings.triggers.schedule.optionIds.includes(scheduleId)) {
        return undefined;
      }
      settings.triggers.schedule.selectedId = scheduleId;
    }
    if (allowManualRun != null) {
      settings.triggers.allowManualRun = allowManualRun;
    }
    return settings;
  }

  setWatchScopeRouting(
    watchId: string,
    patch: WatchScopeRoutingPatch,
    spaceId: string
  ): WatchSettings | undefined {
    const settings = this.getWatchSettings(watchId, spaceId);
    if (!settings?.scopeRouting) {
      return undefined;
    }

    const { scopeRouting } = settings;

    // Validate the full patch before mutating anything — a partially-applied patch would leave
    // the store diverged from what the 400 response led the client to expect.
    for (const key of SCOPE_ROUTING_SELECTS) {
      const selectedId = patch[key];
      if (selectedId != null && !scopeRouting[key].optionIds.includes(selectedId)) {
        return undefined;
      }
    }
    for (const key of SCOPE_ROUTING_SELECTS) {
      const selectedId = patch[key];
      if (selectedId != null) {
        scopeRouting[key].selectedId = selectedId;
      }
    }
    return settings;
  }

  setWatchApprovalGate(
    watchId: string,
    gateId: string,
    patch: Partial<Pick<WatchApprovalGate, 'requirement' | 'approverRoleId'>>,
    spaceId: string
  ): WatchSettings | undefined {
    const settings = this.getWatchSettings(watchId, spaceId);
    const gate = settings?.approvalGates?.find(({ id }) => id === gateId);
    if (!settings || !gate) {
      return undefined;
    }

    const { requirement, approverRoleId } = patch;

    // Validate both fields before mutating either — writing `requirement` then finding
    // `approverRoleId` invalid would silently loosen a gate while returning 400 to the caller.
    // A locked gate always gates — refuse to weaken it however the request is shaped.
    if (requirement != null && gate.requirementLocked) {
      return undefined;
    }
    if (approverRoleId != null && !gate.approverRoleOptionIds?.includes(approverRoleId)) {
      return undefined;
    }

    if (requirement != null) {
      gate.requirement = requirement;
    }
    if (approverRoleId != null) {
      gate.approverRoleId = approverRoleId;
    }
    return settings;
  }

  setWatchWorkerEnabled(
    watchId: string,
    workerId: string,
    enabled: boolean,
    spaceId: string
  ): WatchSettings | undefined {
    const settings = this.getWatchSettings(watchId, spaceId);
    const attachment = settings?.workers?.find((candidate) => candidate.workerId === workerId);
    if (!settings || !attachment) {
      return undefined;
    }
    attachment.enabled = enabled;
    return settings;
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

  listSkills(_spaceId: string): WatchSkill[] {
    return this.getState().skills;
  }

  setSkillEnabled(skillId: string, enabled: boolean, _spaceId: string): WatchSkill | undefined {
    const skill = this.getState().skills.find((candidate) => candidate.id === skillId);
    if (!skill) {
      return undefined;
    }
    skill.enabled = enabled;
    return skill;
  }

  /* -------------------------------------------------------------------------- */
  /* Worker catalog                                                              */
  /* -------------------------------------------------------------------------- */

  listWorkers(): WatchWorker[] {
    return this.getState().workers ?? [];
  }

  setWorkerEnabled(workerId: string, enabled: boolean): WatchWorker | undefined {
    const worker = this.getState().workers?.find((candidate) => candidate.id === workerId);
    if (!worker) {
      return undefined;
    }
    worker.enabled = enabled;
    return worker;
  }
}
