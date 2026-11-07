/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Lifecycle of the AI Hunt tab derived from the transcript + generation flag.
 *
 * - `idle`: no hunt has been started; the full composer and guided templates
 *   are shown.
 * - `active`: a hunt is running or has completed (the transcript holds at least
 *   one entry). The composer collapses so the result canvas takes the full
 *   space; the analyst re-opens it explicitly to start a new hunt.
 */
export type HuntLifecycle = 'idle' | 'active';

export interface HuntInputStateInput {
  /** Number of entries currently in the transcript (user + assistant turns). */
  transcriptLength: number;
  /** True while a response is streaming in. */
  isGenerating: boolean;
  /**
   * True when the analyst explicitly re-opened the composer (via "New hunt")
   * while a previous hunt is still on screen.
   */
  isComposerManuallyOpen: boolean;
}

export interface HuntInputState {
  lifecycle: HuntLifecycle;
  /**
   * Whether the full composer (prompt field + actions + templates) is visible.
   * Collapses automatically once a hunt is active unless the analyst re-opened
   * it, and always stays open while a generation is in flight so the analyst
   * can watch/stop it from the same region.
   */
  isComposerExpanded: boolean;
  /**
   * Whether the compact "New hunt" pill (that re-expands the composer) is
   * shown. Only relevant when a hunt is active and the composer is collapsed.
   */
  showNewHuntPill: boolean;
  /** Whether the guided template gallery should be rendered. */
  showTemplates: boolean;
}

/**
 * Pure derivation of the AI Hunt input region visibility from the hunt
 * lifecycle. Extracted so the collapse/expand behavior can be unit-tested
 * without mounting React.
 */
export const deriveHuntInputState = ({
  transcriptLength,
  isGenerating,
  isComposerManuallyOpen,
}: HuntInputStateInput): HuntInputState => {
  const lifecycle: HuntLifecycle = transcriptLength > 0 ? 'active' : 'idle';

  if (lifecycle === 'idle') {
    return {
      lifecycle,
      isComposerExpanded: true,
      showNewHuntPill: false,
      showTemplates: true,
    };
  }

  // A hunt is on screen. Keep the composer collapsed so the canvas owns the
  // space, unless the analyst re-opened it to edit/start a new hunt. While a
  // generation streams we never render the pill (there is nothing new to
  // start yet) — the canvas surfaces its own Stop affordance.
  const isComposerExpanded = isComposerManuallyOpen && !isGenerating;

  return {
    lifecycle,
    isComposerExpanded,
    showNewHuntPill: !isComposerExpanded && !isGenerating,
    showTemplates: false,
  };
};
