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

import type { Watch, WatchSettings, WatchSkill } from '@kbn/pnd-common';
import {
  SKILLS_SEED,
  WATCHES_SEED,
  WATCH_SETTINGS_SEED,
  type WatchSettingsSeed,
} from '@kbn/pnd-common';

interface WatchStoreState {
  watches: Watch[];
  settingsByWatchId: Map<string, WatchSettings>;
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

/**
 * ⛔ There is deliberately no `setWatchAutonomy` here. Autonomy has exactly one writer,
 * `PUT /internal/pnd/autonomy`, which persists it to the space-scoped uiSetting
 * `pnd:autonomy:<watchId>` behind the `pnd_manage_autonomy` privilege. A second writer on this
 * store would be reachable through `PATCH /internal/pnd/watches/{watchId}`, whose route-level
 * `requiredPrivileges` is `PND_API_PRIVILEGE_WRITE` — privileges cannot be declared per field, so
 * that path would launder an autonomy raise past the privilege that exists to gate it.
 *
 * `WatchSettings.autonomy` therefore stays a read-only projection field here: seeded, rendered
 * nowhere, and never the source the autonomy dial reads. Bind new controls to `useAutonomy` /
 * `useSetAutonomy` instead.
 */

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

/**
 * ⛔ There is deliberately no approval-gate writer here either, and no `setWatchApprovalGates`
 * (bead kibana-phf4.33).
 *
 * The 2026-08-10 design deleted the whole Approval gates section from the Watch settings page, and
 * that page was its only surface. `WATCH_SETTINGS_SEED` no longer seeds `approvalGates` at all, so
 * there are no rows for a writer to reach, and `PATCH /internal/pnd/watches/{watchId}` **rejects** the
 * field outright — the treatment `autonomyLevel` and `worker` get above, and for the sharpest version
 * of the same reason: a store that recorded "no approval required" against a gate the runtime always
 * gates would leave the product describing a policy it does not implement.
 *
 * D15 — containment and apply-tuning always require a human, at every autonomy level — is untouched
 * by this deletion, because the table only ever displayed it. It is enforced in three places that
 * remain, each with tests: `alwaysGate` in `PND_GATE_REGISTRY`, the absence of an `if` wrapper around
 * `await_incident_contained` / `await_apply_tuning` in the watch YAML, and `_auto_respond`'s
 * unconditional refusal of both (`partition_auto_respondable_gates`, security finding S5).
 */

export interface WatchSkillPatch {
  skillId: string;
  enabled: boolean;
}

/**
 * Toggles a batch of per-watch skill attachments, or refuses the whole batch.
 *
 * Batched and resolved-then-applied: a Save on the settings page carries a whole page of edits, and a
 * batch naming one skill the watch does not attach must leave the others alone.
 *
 * ⚠️ No UI produces such a batch since the 2026-08-10 declutter removed the per-row enable toggles
 * (bead kibana-phf4.33). The writer stays because a skill attachment's `enabled` is a real stored
 * value that the settings page still *reports* in each row's status line, and `PATCH
 * /internal/pnd/watches/{watchId}` still accepts `skills` — unlike `approvalGates` above, whose rows
 * are gone entirely. Register `#38` records that the flag currently has no producer.
 */
export const setWatchSkillsEnabled = (
  watchId: string,
  patches: readonly WatchSkillPatch[]
): WatchSettings | undefined => {
  const settings = getWatchSettings(watchId);
  if (!settings) {
    return undefined;
  }

  const rows = patches.flatMap((patch) => {
    const attachment = settings.skills?.find(({ skillId }) => skillId === patch.skillId);
    return attachment ? [{ attachment, patch }] : [];
  });
  if (rows.length !== patches.length) {
    return undefined;
  }

  for (const { attachment, patch } of rows) {
    attachment.enabled = patch.enabled;
  }
  return settings;
};

/* -------------------------------------------------------------------------- */
/* Workers — deliberately not stored here at all                              */
/* -------------------------------------------------------------------------- */

/**
 * ⛔ There is deliberately no worker state, no `listWorkers` and no `setWorkerEnabled` here, and no
 * `setWatchWorkerEnabled` above (kibana-phf4.6).
 *
 * A worker is now a read-only projection of an `ai.agent` step of a watch's lane, built by
 * `services/watches/project_workers.ts` from the managed workflow definitions. There is nothing for
 * this store to hold: the step exists because the YAML declares it, and it runs because the lane
 * reaches it.
 *
 * The three functions that used to live here backed a global flag and a per-watch attachment that
 * nothing consulted at execution time, so toggling either moved a boolean in this module and changed
 * no behaviour whatsoever. `PATCH /internal/pnd/workers/{workerId}` and the `worker` field of
 * `PATCH /internal/pnd/watches/{watchId}` now both **refuse** with 400 rather than accept a write
 * they would drop — the same treatment autonomy gets above, for the same reason: a silently ignored
 * write is worse than a refused one, because the UI paints it as applied.
 */

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
