/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CRITICAL_SEVERITY_THRESHOLD,
  type Severity,
  type SignalImpact,
  type SignalEntry,
} from '@kbn/significant-events-schema';

export interface EventImpact {
  impact: SignalImpact;
  /** Max severity_score among the signals that produced `impact`; undefined when none carried one. */
  severityScore?: number;
}

export interface ComputeSeverityInput {
  impact: SignalImpact;
  /** Max severity_score among the signals that produced `impact` (deriveEventImpact's output). */
  severityScore?: number;
}

const IMPACT_PRIORITY: Record<SignalImpact, number> = {
  none: 0,
  degraded: 1,
  blocked: 2,
  exposed: 3,
};

/**
 * Reduces an event's merged signal set to the event-level typed facts the severity policy
 * consumes:
 *  - the worst impact among contributing signals (exposed > blocked > degraded > none);
 *  - the max KI severity_score among the contributing non-off_topic signals, since
 *    severity_score "supports, never replaces, grounding" and an off_topic row refutes its rule.
 */
export const deriveEventImpact = (signals: SignalEntry[] | undefined): EventImpact => {
  const withImpact = (signals ?? []).filter((signal) => signal.impact !== undefined);

  const worst = withImpact.reduce<SignalImpact>(
    (acc, signal) =>
      signal.impact !== undefined && IMPACT_PRIORITY[signal.impact] > IMPACT_PRIORITY[acc]
        ? signal.impact
        : acc,
    'none'
  );

  const contributing = withImpact.filter((signal) => signal.impact === worst);

  // off_topic rows refute the rule, so its configured score cannot escalate the event.
  const severityScores = contributing
    .map((signal) =>
      signal.type === 'detection' && signal.verdict !== 'off_topic'
        ? signal.metadata.severity_score
        : undefined
    )
    .filter((score): score is number => score !== undefined);

  return {
    impact: worst,
    severityScore: severityScores.length > 0 ? Math.max(...severityScores) : undefined,
  };
};

/**
 * Deterministic mapping from an event's typed facts to its stored severity tier.
 *
 * `blocked` escalates to `critical` only via the KI `severity_score` threshold — the one input that
 * is not model-written per detection. No entity count or topology size is an input: rule-backed
 * KIs all score >= 60, so the score cannot separate medium from high, and listed topology is not
 * a measured breadth.
 *
 * `degraded` is always `medium`: a log sample cannot show how widespread impairment is.
 */
export const computeSeverity = ({ impact, severityScore }: ComputeSeverityInput): Severity => {
  switch (impact) {
    case 'exposed':
      return 'critical';
    case 'blocked': {
      const criticalScore =
        severityScore !== undefined && severityScore >= CRITICAL_SEVERITY_THRESHOLD;
      return criticalScore ? 'critical' : 'high';
    }
    case 'degraded':
      return 'medium';
    case 'none':
      return 'low';
    default: {
      throw new Error(`computeSeverity: unhandled impact "${impact}"`);
    }
  }
};
