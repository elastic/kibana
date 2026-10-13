/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_EVAL_SPACE_ID, HUNT_REPORT_IDS } from '../src/constants';
import type { HuntWatchExample } from '../src/types';

/**
 * Hard cohort: structural evaluators gate per example; LLM rubric scores are reported only.
 *
 * aws-iam hits can resolve Tier 2 `incomplete_retryable` (smoke Finding 2), so hit rows accept
 * `completed` or `partial` and the evaluators check the outcome is consistent with evidence and
 * Proposal presence instead of pinning one label. There is no `failed` row: no deterministic
 * failure inducer exists on main (follow-up kibana-58i.3.1).
 */
export const hardCases: HuntWatchExample[] = [
  {
    id: 'hard-multi-candidate',
    cohort: 'hard',
    input: { spaceId: DEFAULT_EVAL_SPACE_ID, reportIds: [...HUNT_REPORT_IDS.multiCandidate] },
    output: {
      expected: {
        outcome: ['completed', 'partial'],
        indexScopeBlocked: false,
        reports: [
          {
            reportId: HUNT_REPORT_IDS.multiCandidate[0],
            hasConfirmedHit: true,
            tier1Status: 'environment_hits_found',
            pendingProposals: { min: 0 },
            evidenceWritten: 'iff_completed',
            sseAttachment: true,
            investigationStatus: 'open',
          },
          {
            reportId: HUNT_REPORT_IDS.multiCandidate[1],
            hasConfirmedHit: true,
            tier1Status: 'environment_hits_found',
            pendingProposals: { min: 0 },
            evidenceWritten: 'iff_completed',
            sseAttachment: true,
            investigationStatus: 'open',
          },
          {
            reportId: HUNT_REPORT_IDS.multiCandidate[2],
            hasConfirmedHit: true,
            tier1Status: 'environment_hits_found',
            tier2Executed: false,
            pendingProposals: { min: 0 },
            evidenceWritten: 'iff_completed',
            sseAttachment: true,
            investigationStatus: 'open',
          },
        ],
      },
      criteria: [
        'Each of the three reports gets its own conclusion; findings from one report are not attributed to another.',
        "Each hit narrative is grounded in that report's IOCs or behaviors.",
      ],
    },
  },
  {
    // Labelled probe for the outcome state machine's `partial`: today a clean run concludes
    // `partial` / `incomplete_stage: package` because of the packaging gap.
    id: 'hard-partial-clean-probe',
    cohort: 'hard',
    input: { spaceId: DEFAULT_EVAL_SPACE_ID, reportIds: [HUNT_REPORT_IDS.partial] },
    output: {
      expected: {
        outcome: ['partial'],
        incompleteStage: 'packaging',
        indexScopeBlocked: false,
        reports: [
          {
            reportId: HUNT_REPORT_IDS.partial,
            hasConfirmedHit: false,
            tier1Status: 'no_environment_hits',
            tier2Executed: true,
            pendingProposals: 0,
            evidenceWritten: false,
            sseAttachment: false,
            investigationStatus: 'open',
          },
        ],
      },
      criteria: [
        'The narrative does not claim compromise.',
        'The narrative names the executed-but-empty technique.',
      ],
    },
  },
  {
    id: 'hard-no-candidates-missing-report',
    cohort: 'hard',
    input: { spaceId: DEFAULT_EVAL_SPACE_ID, reportIds: [HUNT_REPORT_IDS.missing] },
    output: {
      expected: {
        indexScopeBlocked: false,
        skipped: ['not_found'],
        reports: [],
      },
      criteria: ['The run does not invent a hunt or findings for a report that does not exist.'],
    },
  },
  {
    id: 'hard-difficult-hit-ioc-only',
    cohort: 'hard',
    input: { spaceId: DEFAULT_EVAL_SPACE_ID, reportIds: [HUNT_REPORT_IDS.difficultHit] },
    output: {
      expected: {
        outcome: ['completed', 'partial'],
        indexScopeBlocked: false,
        reports: [
          {
            reportId: HUNT_REPORT_IDS.difficultHit,
            hasConfirmedHit: true,
            tier1Status: 'environment_hits_found',
            tier2Executed: false,
            pendingProposals: { min: 0 },
            evidenceWritten: 'iff_completed',
            sseAttachment: true,
            investigationStatus: 'open',
          },
        ],
      },
      criteria: [
        'The hit narrative is grounded in the environment IOCs (IP addresses, user) the report names.',
        'The narrative does not claim a technique-level finding, since the report names no technique to hunt.',
      ],
    },
  },
];
