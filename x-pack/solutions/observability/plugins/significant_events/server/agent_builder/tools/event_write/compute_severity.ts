/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CRITICAL_SEVERITY_THRESHOLD,
  type Severity,
  type SignalEffect,
  type SignalEntry,
} from '@kbn/significant-events-schema';

/**
 * "degradation" escalates to high when the event's breadth — distinct affected entities —
 * exceeds this
 */
export const BREADTH_THRESHOLD = 1;

/**
 * A single outage path escalates to critical when at least this many confirmed dependency edges
 * fan out from it. Fan-out means the failure is spreading to several dependents at once.
 */
export const TOPOLOGY_FAN_OUT_THRESHOLD = 2;

export interface EventEffect {
  effect: SignalEffect;
  /** Deduplicated distinct outage paths from every signal at the worst effect. */
  outagePaths: string[];
  /** Max severity_score among the signals that produced `effect`; undefined when none carried one. */
  severityScore?: number;
}

export interface ComputeSeverityInput {
  effect: SignalEffect;
  outagePaths: string[];
  /** Distinct KI-resolved entities in the member-union topology. */
  breadth: number;
  /** Distinct KI-resolved dependency edges in the member-union blast_radius. */
  topologyFanOut: number;
  /** True when the merged blast_radius carries at least one dependency-type edge (a cascade). */
  hasCascadePath: boolean;
  /** Max severity_score among the signals that produced `effect` (deriveEventEffect's output). */
  severityScore?: number;
}

const EFFECT_PRIORITY: Record<SignalEffect, number> = {
  none: 0,
  degradation: 1,
  outage: 2,
  exposure: 3,
};

/**
 * Reduces an event's merged signal set (already unioned across versions by
 * mergeSignalsLatestPerRule, so a member that joined in an earlier cycle still counts) to the
 * event-level typed facts the severity policy consumes:
 *  - the worst effect among contributing signals (exposure > outage > degradation > none);
 *  - the deduplicated union of outage_paths from every signal at that worst effect — this is
 *    what lets a second confirmed path re-tier the event to critical when a member joins, in
 *    code, with no new model call;
 *  - the max KI severity_score among the contributing signals, since severity_score "supports,
 *    never replaces, grounding" only for the signals that produced the effect.
 *
 */
export const deriveEventEffect = (signals: SignalEntry[] | undefined): EventEffect => {
  const withEffect = (signals ?? []).filter((signal) => signal.effect !== undefined);

  const worst = withEffect.reduce<SignalEffect>(
    (acc, signal) =>
      signal.effect !== undefined && EFFECT_PRIORITY[signal.effect] > EFFECT_PRIORITY[acc]
        ? signal.effect
        : acc,
    'none'
  );

  const contributing = withEffect.filter((signal) => signal.effect === worst);

  const outagePaths =
    worst === 'outage'
      ? [...new Set(contributing.flatMap((signal) => signal.outage_paths ?? []))]
      : [];

  const severityScores = contributing
    .map((signal) => (signal.type === 'detection' ? signal.metadata.severity_score : undefined))
    .filter((score): score is number => score !== undefined);

  return {
    effect: worst,
    outagePaths,
    severityScore: severityScores.length > 0 ? Math.max(...severityScores) : undefined,
  };
};

/**
 * Deterministic mapping from an event's typed facts to its stored severity tier
 **/
export const computeSeverity = ({
  effect,
  outagePaths,
  breadth,
  topologyFanOut,
  hasCascadePath,
  severityScore,
}: ComputeSeverityInput): Severity => {
  switch (effect) {
    case 'exposure':
      return 'critical';
    case 'outage': {
      if (outagePaths.length >= 2) return 'critical';
      const criticalScore =
        severityScore !== undefined && severityScore >= CRITICAL_SEVERITY_THRESHOLD;
      const criticalFanOut = topologyFanOut >= TOPOLOGY_FAN_OUT_THRESHOLD;
      return criticalScore || criticalFanOut ? 'critical' : 'high';
    }
    case 'degradation':
      return breadth > BREADTH_THRESHOLD || hasCascadePath ? 'high' : 'medium';
    case 'none':
      return 'low';
    default: {
      throw new Error(`computeSeverity: unhandled effect "${effect}"`);
    }
  }
};
