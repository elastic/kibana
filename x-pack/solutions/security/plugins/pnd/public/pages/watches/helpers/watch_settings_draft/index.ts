/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WatchScopeRoutingSettings, WatchSettings } from '@kbn/pnd-common';

/**
 * The settings the page edits locally before a Save.
 *
 * Exactly the two writable sections of {@link WatchSettings}, and deliberately not one field more:
 *
 * - `autonomy` is **not** here. The dial writes immediately through `PUT /internal/pnd/autonomy`,
 *   behind the `pnd_manage_autonomy` privilege, and prompts a proposal sweep on a raise;
 *   `PATCH /internal/pnd/watches/{watchId}` rejects `autonomyLevel` with a 400, and does so
 *   all-or-nothing, so a single `autonomyLevel` key riding along in a batched Save would land
 *   nothing at all (kibana-phf4.13). Pulling autonomy into the draft would also make a raise
 *   pending — a customer would move the dial, see nothing gate, and be told about it only later.
 * - `general` and `runsLedger` are read-only projections with no controls.
 * - `approvalGates` and `skills` were here until bead kibana-phf4.33. The 2026-08-10 design deleted
 *   the whole Approval gates section and every per-row enable toggle, so neither has a control left
 *   to make an edit with. `approvalGates` goes further than "no producer": the PATCH route now
 *   **rejects** it, because recording an approval policy no surface shows is how a settings page comes
 *   to describe a runtime that does not exist (D15). `skills` keeps its route field — a skill
 *   attachment's `enabled` is a real stored value the status line still reports — it simply has no
 *   writer in the UI.
 *
 * `enabled` lives on the watch rather than its settings and is likewise excluded: the header switch
 * writes through on click, because it is the one mutation a managed workflow permits and reversing
 * it is one more click.
 */
export type WatchSettingsDraft = Pick<WatchSettings, 'scopeRouting' | 'triggers'>;

/** The scope-and-routing selects a customer can retarget. */
export type WatchScopeRoutingKey = keyof WatchScopeRoutingSettings;

/**
 * The scope-and-routing keys the diff walks. Spelled out rather than read off the object so the diff
 * cannot start emitting a field the PATCH body does not accept; `index.test.ts` pins it against a
 * real settings payload so a schema that grows a fourth select fails there rather than silently
 * dropping that select from every Save.
 */
export const WATCH_SCOPE_ROUTING_KEYS = [
  'assigneeQueue',
  'dataSources',
  'escalationContact',
] as const satisfies readonly WatchScopeRoutingKey[];

/**
 * Seeds a draft from the fetched settings. Absent sections stay absent, so a watch that offers no
 * triggers cannot acquire them by being edited.
 */
export const readWatchSettingsDraft = (
  settings: WatchSettings | undefined
): WatchSettingsDraft => ({
  scopeRouting: settings?.scopeRouting,
  triggers: settings?.triggers,
});

/**
 * Every updater below returns a new draft and leaves its input untouched — the seed is the
 * react-query cache's own object, and mutating it would move the baseline the diff is taken against.
 * An edit naming a section or row the watch does not have is a no-op rather than an insert.
 */

export const withScheduleId = (draft: WatchSettingsDraft, scheduleId: string): WatchSettingsDraft =>
  draft.triggers == null
    ? draft
    : {
        ...draft,
        triggers: {
          ...draft.triggers,
          schedule: { ...draft.triggers.schedule, selectedId: scheduleId },
        },
      };

export const withAllowManualRun = (
  draft: WatchSettingsDraft,
  allowManualRun: boolean
): WatchSettingsDraft =>
  draft.triggers == null ? draft : { ...draft, triggers: { ...draft.triggers, allowManualRun } };

export const withScopeRoutingSelection = (
  draft: WatchSettingsDraft,
  key: WatchScopeRoutingKey,
  selectedId: string
): WatchSettingsDraft =>
  draft.scopeRouting == null
    ? draft
    : {
        ...draft,
        scopeRouting: {
          ...draft.scopeRouting,
          [key]: { ...draft.scopeRouting[key], selectedId },
        },
      };
