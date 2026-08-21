/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiThemeComputed } from '@elastic/eui';

/**
 * Semantic thread types from the Throughline prototype (throughline-app.js).
 * These identify the "kind" of an investigation thread and drive its accent color.
 */
export type ThreadType =
  | 'case'
  | 'investigation'
  | 'incident'
  | 'hunt'
  | 'detection'
  | 'tuning'
  | 'chat';

/**
 * Decision states from the Throughline prototype's decision radar.
 * A proposal / investigation moves through these as the analyst acts.
 */
export type DecisionState = 'waiting' | 'in_motion' | 'deferred' | 'decided';

/**
 * Map a Throughline thread type to an EUI-theme color. We deliberately resolve
 * against `euiTheme` (not the prototype's raw hex) so the palette tracks the
 * active Kibana theme (light/dark/borealis) instead of forking CSS.
 *
 * The mapping preserves the prototype's SEMANTICS:
 *   case → primary/blue, investigation/tuning → accentSecondary/teal,
 *   hunt → accent/violet, incident/detection → danger, chat → subdued.
 */
export const threadTypeColor = (euiTheme: EuiThemeComputed, type: ThreadType): string => {
  switch (type) {
    case 'case':
      return euiTheme.colors.primary;
    case 'investigation':
    case 'tuning':
      // Teal accent (--t-inv / --auto in the prototype).
      return euiTheme.colors.accentSecondary;
    case 'hunt':
      // Violet (--t-hunt).
      return euiTheme.colors.accent;
    case 'incident':
    case 'detection':
      return euiTheme.colors.danger;
    case 'chat':
    default:
      return euiTheme.colors.subduedText;
  }
};

/**
 * Map a decision state to an EUI-theme color for the decision radar.
 *   waiting → warning (needs a human), in_motion → primary (agent working),
 *   deferred → subdued (snoozed), decided → success (resolved).
 */
export const decisionStateColor = (euiTheme: EuiThemeComputed, state: DecisionState): string => {
  switch (state) {
    case 'waiting':
      return euiTheme.colors.warning;
    case 'in_motion':
      return euiTheme.colors.primary;
    case 'deferred':
      return euiTheme.colors.subduedText;
    case 'decided':
    default:
      return euiTheme.colors.success;
  }
};

/** Human-readable label for a decision state (used in the radar + chips). */
export const decisionStateLabel: Record<DecisionState, string> = {
  waiting: 'Waiting',
  in_motion: 'In motion',
  deferred: 'Deferred',
  decided: 'Decided',
};
