/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one or more
 * contributor license agreements. Licensed under the Elastic License 2.0.
 */

import type { Phase, ReportClass } from '../types';

/**
 * The report plan for one stack (design v1 §1): 5 R-ioc, 5 R-beh, 4 R-decoy —
 * 14 reports per phase. Arm A/B of R-beh and the decoy (bcd) split follow v5.
 */
export interface ReportPlanEntry {
  runKey: string;
  reportClass: ReportClass;
  chain?: string;
}

export const REPORT_CLASSES_BY_CHAIN: Record<string, ReportClass> = {
  'bits-mshta': 'R-ioc',
  'cloud-identity': 'R-ioc',
  'linux-curl': 'R-ioc',
  'encoded-powershell': 'R-ioc',
  'wmi-lateral': 'R-ioc',
};

export const PHASES: Phase[] = ['E0', 'E+', 'E-'];

/**
 * Phases run in a fixed order on one stack per (model, rep): E0, then E+,
 * then E- (design v3 phase topology).
 */
/**
 * Per-hunt Playwright budget (one coordinator run incl. Tier 2 model calls),
 * exported so the budget test can size the suite timeout from the fixture
 * count without importing playwright.config.ts (which requires live env).
 */
export const PER_HUNT_MS = 60_000;
export const HUNT_REPORTS_PER_PHASE = 14;

export const phaseOrder = (): readonly Phase[] => PHASES;

/**
 * Controls (design v3): C1 corpus gate, C2 leak audit, C3a tier2_when
 * recording, C3b SUT nothing_searched invariant. Any C1/C2/C3a failure makes
 * the cell INVALID.
 */
export type ControlId = 'C1' | 'C2' | 'C3a' | 'C3b';

export interface ControlFailure {
  control: ControlId;
  detail: string;
}

/**
 * C3b: incomplete:nothing_searched iff tier1.status == no_searchable_terms AND
 * no Tier 2 behaviour executed. A violation is a SUT finding, reported
 * separately from the metrics. The harness derives the gap presence from the
 * same inputs the coordinator used, so this is an equivalence check, not a
 * restatement.
 */
export const nothingSearchedInvariantHolds = (run: {
  tier1_status: string;
  behaviours: Array<{ executed: boolean }>;
  nothingSearchedReported: boolean;
}): boolean => {
  const expected =
    run.tier1_status === 'no_searchable_terms' && !run.behaviours.some((b) => b.executed);
  return expected === run.nothingSearchedReported;
};

/**
 * C1 corpus gate: after seeding E0 alone and waiting one full rule interval
 * plus lookback, the alerts index for the space holds 0 alerts. Implemented
 * against the live stack by the eval spec; this helper formats the assertion.
 */
export const corpusGateAlertsMustBeZero = (alertCount: number): ControlFailure | null =>
  alertCount === 0 ? null : { control: 'C1', detail: `E0 seeded ${alertCount} alerts, expected 0` };

/**
 * C2 leak audit gate (design v1): R-beh text must contain no host/user/IoC
 * token present in E+. Evaluated over the report text and the seeded docs.
 */
export const leakAuditTokens = (seededDocTexts: string[]): string[] => {
  const tokens = new Set<string>();
  for (const text of seededDocTexts) {
    for (const m of text.matchAll(/\bhost\.name[":\s]+([A-Za-z0-9._-]+)/g)) tokens.add(m[1]);
    for (const m of text.matchAll(/\buser\.name[":\s]+([A-Za-z0-9._\\-]+)/g)) tokens.add(m[1]);
  }
  return [...tokens];
};

export const leakAuditHolds = (rBehText: string, ePlusTokens: string[]): ControlFailure | null => {
  const leaked = ePlusTokens.filter((t) => t.length > 3 && rBehText.includes(t));
  return leaked.length === 0
    ? null
    : { control: 'C2', detail: `R-beh text leaks E+ tokens: ${leaked.join(', ')}` };
};
