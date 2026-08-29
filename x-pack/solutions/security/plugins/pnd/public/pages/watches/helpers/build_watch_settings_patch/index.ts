/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  UpdateWatchRequestBody,
  WatchGenerationSettings,
  WatchScopeRoutingSettings,
  WatchTriggersSettings,
} from '@kbn/pnd-common';
import type { WatchSettingsDraft } from '../watch_settings_draft';
import { WATCH_SCOPE_ROUTING_KEYS } from '../watch_settings_draft';

/**
 * Diffs a draft against the settings it was seeded from and returns the one PATCH body that Save
 * sends. An empty object means nothing changed, which is also what the unsaved-changes badge and the
 * leave-confirm are armed by — so the badge can never disagree with what a Save would write.
 *
 * Four fields the route accepts are never emitted, for three different reasons. `autonomyLevel` and
 * `worker` are **refused** by the route, all-or-nothing, so one such key would sink the whole save;
 * `enabled` is written through on click; and `skills` lost its only control to the 2026-08-10
 * declutter (bead kibana-phf4.33), so nothing on the page can produce a skill edit to diff.
 * `approvalGates` is not listed because the route refuses it now and the field left the draft with
 * the section that rendered it.
 */
export const buildWatchSettingsPatch = (
  baseline: WatchSettingsDraft,
  draft: WatchSettingsDraft
): UpdateWatchRequestBody => {
  const generation = buildGenerationPatch(baseline.generation, draft.generation);
  const scopeRouting = buildScopeRoutingPatch(baseline.scopeRouting, draft.scopeRouting);
  const triggers = buildTriggersPatch(baseline.triggers, draft.triggers);

  return {
    ...(generation && { generation }),
    ...(scopeRouting && { scopeRouting }),
    ...(triggers && { triggers }),
  };
};

/** Whether a patch would change anything, which is exactly the page's dirty state. */
export const hasWatchSettingsChanges = (patch: UpdateWatchRequestBody): boolean =>
  Object.keys(patch).length > 0;

const buildTriggersPatch = (
  baseline: WatchTriggersSettings | undefined,
  draft: WatchTriggersSettings | undefined
): UpdateWatchRequestBody['triggers'] => {
  if (!baseline || !draft) {
    return undefined;
  }

  const allowManualRun =
    draft.allowManualRun === baseline.allowManualRun ? undefined : draft.allowManualRun;
  const scheduleId =
    draft.schedule.selectedId === baseline.schedule.selectedId
      ? undefined
      : draft.schedule.selectedId;

  if (allowManualRun == null && scheduleId == null) {
    return undefined;
  }
  return {
    ...(allowManualRun != null && { allowManualRun }),
    ...(scheduleId != null && { scheduleId }),
  };
};

/**
 * The empty `connectorId` is a real value, not an absence: it selects the server-resolved default AI
 * connector, so switching back to the default sends `connectorId: ''` rather than dropping the field.
 */
const buildGenerationPatch = (
  baseline: WatchGenerationSettings | undefined,
  draft: WatchGenerationSettings | undefined
): UpdateWatchRequestBody['generation'] => {
  if (!baseline || !draft) {
    return undefined;
  }

  const alertSize = draft.alertSize === baseline.alertSize ? undefined : draft.alertSize;
  const lookback = draft.lookback === baseline.lookback ? undefined : draft.lookback;
  const connectorId = draft.connectorId === baseline.connectorId ? undefined : draft.connectorId;

  if (alertSize == null && lookback == null && connectorId == null) {
    return undefined;
  }
  return {
    ...(alertSize != null && { alertSize }),
    ...(lookback != null && { lookback }),
    ...(connectorId != null && { connectorId }),
  };
};

const buildScopeRoutingPatch = (
  baseline: WatchScopeRoutingSettings | undefined,
  draft: WatchScopeRoutingSettings | undefined
): UpdateWatchRequestBody['scopeRouting'] => {
  if (!baseline || !draft) {
    return undefined;
  }

  const changed = WATCH_SCOPE_ROUTING_KEYS.filter(
    (key) => draft[key].selectedId !== baseline[key].selectedId
  );
  if (changed.length === 0) {
    return undefined;
  }
  return Object.fromEntries(changed.map((key) => [key, draft[key].selectedId]));
};
