/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * In-memory fixture store for mock watch, worker, and skill catalog data.
 *
 * State lives at module scope and is seeded from `@kbn/pnd-common` on first access, so writes
 * survive a browser reload but reset when Kibana restarts. Per-watch settings deliberately do not
 * live here: managed workflow template values are their only runtime backing.
 */

import type { Watch, WatchSkill, WatchWorker } from '@kbn/pnd-common';
import { SKILLS_SEED, WATCHES_SEED, WORKERS_SEED } from '@kbn/pnd-common';

interface WatchStoreState {
  watches: Watch[];
  workers: WatchWorker[];
  skills: WatchSkill[];
}

let state: WatchStoreState | undefined;

/** Seed-relative offsets become absolute timestamps once, when the store first seeds. */
const isoSecondsAgo = (seededAt: number, secondsAgo: number): string =>
  new Date(seededAt - secondsAgo * 1000).toISOString();

const seedStore = (): WatchStoreState => {
  const seededAt = Date.now();

  // Deep clone so mutations never reach the shared seed constants.
  return {
    watches: structuredClone(WATCHES_SEED),
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
