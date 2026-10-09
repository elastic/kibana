/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * In-memory read/write store backing the watch settings UI while it has no real persistence.
 *
 * State lives at module scope and is seeded from `@kbn/pnd-common` on first access, so writes
 * survive a browser reload but reset when Kibana restarts. That is the intended behaviour for a UX
 * reference implementation — see https://github.com/elastic/security-team/issues/18717 for the real
 * persistence work.
 *
 * Every route that touches this store is gated on `config.ui.useMockData`, so none of it is
 * reachable against live projected watches.
 */

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

interface WatchStoreState {
  watches: Watch[];
  settingsByWatchId: Map<string, WatchSettings>;
  workers: WatchWorker[];
  skills: WatchSkill[];
}

let state: WatchStoreState | undefined;

/** Seed-relative offsets become absolute timestamps once, when the store first seeds. */
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

  // Deep clone so mutations never reach the shared seed constants.
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

const getState = (): WatchStoreState => {
  if (!state) {
    state = seedStore();
  }
  return state;
};

/** Drops all state so the next read reseeds. Intended for tests. */
export const resetWatchStore = (): void => {
  state = undefined;
};

/* -------------------------------------------------------------------------- */
/* Watches                                                                    */
/* -------------------------------------------------------------------------- */

export const listWatches = (): Watch[] => getState().watches;

export const getWatch = (watchId: string): Watch | undefined =>
  getState().watches.find((watch) => watch.id === watchId);

export const setWatchEnabled = (watchId: string, enabled: boolean): Watch | undefined => {
  const watch = getWatch(watchId);
  if (!watch) {
    return undefined;
  }
  watch.enabled = enabled;
  return watch;
};

/* -------------------------------------------------------------------------- */
/* Per-watch settings                                                         */
/* -------------------------------------------------------------------------- */

export const getWatchSettings = (watchId: string): WatchSettings | undefined =>
  getState().settingsByWatchId.get(watchId);

export const setWatchAutonomy = (
  watchId: string,
  level: WatchAutonomyLevel
): WatchSettings | undefined => {
  const settings = getWatchSettings(watchId);
  if (!settings) {
    return undefined;
  }
  // The scale is shared across watches and the route validates the enum, so there is nothing
  // per-watch left to check here.
  settings.autonomy = level;
  return settings;
};

export interface WatchTriggersPatch {
  scheduleId?: string;
  allowManualRun?: boolean;
}

export const setWatchTriggers = (
  watchId: string,
  { scheduleId, allowManualRun }: WatchTriggersPatch
): WatchSettings | undefined => {
  const settings = getWatchSettings(watchId);
  if (!settings?.triggers) {
    return undefined;
  }

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
};

/** Keys of `WatchScopeRoutingSettings` that hold a single-choice setting. */
const SCOPE_ROUTING_SELECTS = ['dataSources', 'assigneeQueue', 'escalationContact'] as const;

export type WatchScopeRoutingPatch = Partial<
  Record<(typeof SCOPE_ROUTING_SELECTS)[number], string>
>;

export const setWatchScopeRouting = (
  watchId: string,
  patch: WatchScopeRoutingPatch
): WatchSettings | undefined => {
  const settings = getWatchSettings(watchId);
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
};

export const setWatchApprovalGate = (
  watchId: string,
  gateId: string,
  patch: Partial<Pick<WatchApprovalGate, 'requirement' | 'approverRoleId'>>
): WatchSettings | undefined => {
  const settings = getWatchSettings(watchId);
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
};

export const setWatchWorkerEnabled = (
  watchId: string,
  workerId: string,
  enabled: boolean
): WatchSettings | undefined => {
  const settings = getWatchSettings(watchId);
  const attachment = settings?.workers?.find((candidate) => candidate.workerId === workerId);
  if (!settings || !attachment) {
    return undefined;
  }
  attachment.enabled = enabled;
  return settings;
};

export const setWatchSkillEnabled = (
  watchId: string,
  skillId: string,
  enabled: boolean
): WatchSettings | undefined => {
  const settings = getWatchSettings(watchId);
  const attachment = settings?.skills?.find((candidate) => candidate.skillId === skillId);
  if (!settings || !attachment) {
    return undefined;
  }
  attachment.enabled = enabled;
  return settings;
};

/* -------------------------------------------------------------------------- */
/* Global worker catalog                                                      */
/* -------------------------------------------------------------------------- */

export const listWorkers = (): WatchWorker[] => getState().workers;

export const setWorkerEnabled = (workerId: string, enabled: boolean): WatchWorker | undefined => {
  const worker = getState().workers.find((candidate) => candidate.id === workerId);
  if (!worker) {
    return undefined;
  }
  worker.enabled = enabled;
  return worker;
};

/* -------------------------------------------------------------------------- */
/* Global skill catalog                                                       */
/* -------------------------------------------------------------------------- */

export const listSkills = (): WatchSkill[] => getState().skills;

export const setSkillEnabled = (skillId: string, enabled: boolean): WatchSkill | undefined => {
  const skill = getState().skills.find((candidate) => candidate.id === skillId);
  if (!skill) {
    return undefined;
  }
  skill.enabled = enabled;
  return skill;
};
