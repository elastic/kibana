/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState } from 'react';
import type { UpdateWatchRequestBody, WatchSettings } from '@kbn/pnd-common';
import {
  buildWatchSettingsPatch,
  hasWatchSettingsChanges,
} from '../../helpers/build_watch_settings_patch';
import type { WatchScopeRoutingKey, WatchSettingsDraft } from '../../helpers/watch_settings_draft';
import {
  readWatchSettingsDraft,
  withAllowManualRun,
  withScheduleId,
  withScopeRoutingSelection,
} from '../../helpers/watch_settings_draft';

export interface UseWatchSettingsDraft {
  /** What the settings controls render, which is the fetched settings plus any unsaved edits. */
  draft: WatchSettingsDraft;
  /** Resets every unsaved edit back to the settings the draft was seeded from. */
  discard: () => void;
  /** Whether the draft differs from those settings — the badge and the leave-confirm read this. */
  isDirty: boolean;
  /** Re-seeds the baseline from the draft, once a save has landed. */
  markSaved: () => void;
  /** The one PATCH body Save sends. Empty when nothing changed. */
  patch: UpdateWatchRequestBody;
  setAllowManualRun: (allowManualRun: boolean) => void;
  setScheduleId: (scheduleId: string) => void;
  setScopeRoutingSelection: (key: WatchScopeRoutingKey, selectedId: string) => void;
}

interface DraftState {
  /** The settings the draft is diffed against — the last payload seen, or the last save. */
  baseline: WatchSettingsDraft;
  draft: WatchSettingsDraft;
  /** Which watch the pair above describes. */
  seedKey: string | undefined;
}

const seedState = (settings: WatchSettings | undefined): DraftState => {
  // One object for both, so a freshly seeded draft is diff-clean by construction.
  const seeded = readWatchSettingsDraft(settings);
  return { baseline: seeded, draft: seeded, seedKey: settings?.watchId };
};

/**
 * Holds the settings page's unsaved edits, so a control changes local state and only Save writes.
 *
 * Re-seeds when the payload starts describing a **different** watch, and not merely when a new
 * payload arrives: `useUpdateWatch` invalidates the detail query on every settled write, including
 * the header's Enabled switch and the autonomy dial's sibling refetches, and re-seeding on those
 * would throw away edits a customer had made but not yet saved.
 *
 * Dirtiness is `buildWatchSettingsPatch` returning something, rather than a separate flag, so the
 * badge cannot claim there are changes that a Save would not send, or the reverse.
 */
export const useWatchSettingsDraft = (
  settings: WatchSettings | undefined
): UseWatchSettingsDraft => {
  const [state, setState] = useState<DraftState>(() => seedState(settings));

  if (state.seedKey !== settings?.watchId) {
    // Re-seeding during render rather than in an effect: an effect would paint one frame of the
    // previous watch's settings under the new watch's title.
    setState(seedState(settings));
  }

  const patch = useMemo(
    () => buildWatchSettingsPatch(state.baseline, state.draft),
    [state.baseline, state.draft]
  );

  const discard = useCallback(
    () => setState((current) => ({ ...current, draft: current.baseline })),
    []
  );

  const markSaved = useCallback(
    () => setState((current) => ({ ...current, baseline: current.draft })),
    []
  );

  const setAllowManualRun = useCallback(
    (allowManualRun: boolean) =>
      setState((current) => ({
        ...current,
        draft: withAllowManualRun(current.draft, allowManualRun),
      })),
    []
  );

  const setScheduleId = useCallback(
    (scheduleId: string) =>
      setState((current) => ({ ...current, draft: withScheduleId(current.draft, scheduleId) })),
    []
  );

  const setScopeRoutingSelection = useCallback(
    (key: WatchScopeRoutingKey, selectedId: string) =>
      setState((current) => ({
        ...current,
        draft: withScopeRoutingSelection(current.draft, key, selectedId),
      })),
    []
  );

  return {
    discard,
    draft: state.draft,
    isDirty: hasWatchSettingsChanges(patch),
    markSaved,
    patch,
    setAllowManualRun,
    setScheduleId,
    setScopeRoutingSelection,
  };
};
