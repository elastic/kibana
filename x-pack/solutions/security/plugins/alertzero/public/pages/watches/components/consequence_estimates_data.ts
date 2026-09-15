/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// MOCK DATA — every estimate below is invented for the Alert Triage
// ConsequenceFunnel. No data source is specced for alert volumes or
// false-positive verdict counts; queryability per field is an open
// engineering question. Ported as-is from the Sep 11 prototype's
// mockConsequenceEstimates.ts (CONSEQUENCE_ESTIMATES.alertAnalysis). Do not
// extend this object — a real estimates endpoint is a separate follow-up.
export const ALERT_TRIAGE_CONSEQUENCE_ESTIMATES = {
  alertsPerDay: 240,
  fpVerdictsPerDay: 46,
  /**
   * Qualifying false-positive count at or above the given confidence score.
   * Breakpoints mirrored from the prototype's consequence-forward mock.
   */
  qualifyAtOrAbove(score: number): number {
    if (score >= 0.95) return 12;
    if (score >= 0.9) return 21;
    if (score >= 0.85) return 29;
    if (score >= 0.7) return 38;
    return 44;
  },
} as const;
