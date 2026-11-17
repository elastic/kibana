/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DEFAULT_EVAL_SPACE_ID,
  HUNT_BLOCKED_SPACE_ID,
  HUNT_REPORT_IDS,
  SPACE_REPORT_IDS,
} from '../src/constants';
import type { HuntWatchExample } from '../src/types';

/**
 * Golden cohort: one row per core Worker path. Every CODE evaluator must score 1 on every row.
 *
 * Fixture bindings (Demo C+ generator, elastic/kibana#291895):
 * - `hit`: `aws-iam-behavior-only` article IOCs are TEST-NET-2 decoys absent from telemetry, so
 *   Tier 1 finds nothing and the confirmed hit comes from the Tier 2 AssumeRole query.
 * - `clean`: `aws-iam-clean` (T1110.003 ConsoleLogin failures, TEST-NET-3 IOCs) is disjoint from
 *   seeded CloudTrail, so Tier 1 is `no_environment_hits` and Tier 2 runs with zero rows.
 * - `blocked`: a space copy triggered in `hunt-blocked`, whose default index resolves to nothing.
 */
export const goldenDataset: HuntWatchExample[] = [
  {
    id: 'golden-hit-aws-iam-behavior-only',
    cohort: 'golden',
    input: { spaceId: DEFAULT_EVAL_SPACE_ID, reportIds: [HUNT_REPORT_IDS.hit] },
    output: {
      expected: {
        outcome: ['completed'],
        indexScopeBlocked: false,
        reports: [
          {
            reportId: HUNT_REPORT_IDS.hit,
            hasConfirmedHit: true,
            tier1Status: 'no_environment_hits',
            tier2Executed: true,
            pendingProposals: { min: 1 },
            evidenceWritten: true,
            sseAttachment: true,
            investigationStatus: 'open',
          },
        ],
      },
      criteria: [
        "The narrative states a confirmed hit and ties it to the report's sts.AssumeRole into escalated-role behavior (T1078.004).",
        'The narrative is grounded in what the hunt actually executed and found, and does not cite IOCs the report does not contain.',
        'The narrative does not claim the placeholder IP addresses from the advisory were observed in the environment.',
      ],
    },
  },
  {
    // Observed on main (2026-10-14): the hunt completes with no hit and packaging closes the
    // Investigation as benign (`status: closed`, `close_reason: benign`), so the run ends
    // `completed` with no SSE and no Proposal.
    id: 'golden-clean-aws-iam-clean',
    cohort: 'golden',
    input: { spaceId: DEFAULT_EVAL_SPACE_ID, reportIds: [HUNT_REPORT_IDS.clean] },
    output: {
      expected: {
        outcome: ['completed'],
        indexScopeBlocked: false,
        reports: [
          {
            reportId: HUNT_REPORT_IDS.clean,
            hasConfirmedHit: false,
            tier1Status: 'no_environment_hits',
            tier2Executed: true,
            pendingProposals: 0,
            evidenceWritten: true,
            sseAttachment: false,
            investigationStatus: 'closed',
          },
        ],
      },
      criteria: [
        'The narrative does not claim compromise or a confirmed hit.',
        'The narrative names the technique that was executed and returned no rows (T1110.003 password spraying / ConsoleLogin failures).',
        'The narrative does not describe an empty result as proof the environment is secure beyond the techniques searched.',
      ],
    },
  },
  {
    id: 'golden-blocked-empty-index-scope',
    cohort: 'golden',
    input: { spaceId: HUNT_BLOCKED_SPACE_ID, reportIds: [SPACE_REPORT_IDS.blocked] },
    output: {
      expected: {
        indexScopeBlocked: true,
        reports: [
          {
            reportId: SPACE_REPORT_IDS.blocked,
            hasConfirmedHit: false,
            pendingProposals: 0,
            evidenceWritten: false,
            sseAttachment: false,
            investigationStatus: 'none',
          },
        ],
      },
      criteria: [
        'The conclusion does not invent hits or findings.',
        "The conclusion names the index scope problem (the space's default index resolves to no data) as the reason nothing was hunted.",
      ],
    },
  },
];
