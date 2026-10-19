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
 * aws-iam hits can resolve Tier 2 `incomplete_retryable` (seen in smoke runs), so hit rows accept
 * `completed` or `partial` and the evaluators check the outcome is consistent with evidence and
 * Proposal presence instead of pinning one label. The `partial` and `failed` rows at the end pin
 * one label each, because their faults are deterministic: a report over the per-hunt IOC bound,
 * and an Investigation the Worker is locked out of.
 */
export const hardCases: HuntWatchExample[] = [
  {
    // The three report ids share principals (dev-user, 192.0.2.30/31), so packaging must
    // mint each actioned subject once and converge the other Investigations onto that Proposal
    // (`Also raised by [Investigation]` / "no second Proposal was created"). Per-report Proposal
    // counts are not pinned because which Investigation holds the shared Proposal is packaging's
    // choice; `Proposal Convergence` asserts the count across the run instead (at least one
    // pending actioned Proposal, each subject minted once, the convergence note present).
    //
    // `partial` is accepted because Tier 2 on the assume-role scenario can end
    // `incomplete_retryable` (README, "Known Worker behavior"). A partial run still has to stop
    // at `hunt`, confirm the hit, attach a valid SSE, leave the Investigation open and converge
    // its Proposals, so a run that gave up fails those checks rather than passing on this label.
    id: 'hard-multi-candidate',
    cohort: 'hard',
    input: { spaceId: DEFAULT_EVAL_SPACE_ID, reportIds: [...HUNT_REPORT_IDS.multiCandidate] },
    output: {
      expected: {
        outcome: ['completed', 'partial'],
        incompleteStage: 'hunt',
        indexScopeBlocked: false,
        proposalConvergence: true,
        reports: [
          {
            reportId: HUNT_REPORT_IDS.multiCandidate[0],
            hasConfirmedHit: true,
            tier1Status: 'environment_hits_found',
            evidenceWritten: 'iff_completed_successfully',
            sseAttachment: true,
            investigationStatus: 'open',
          },
          {
            reportId: HUNT_REPORT_IDS.multiCandidate[1],
            hasConfirmedHit: true,
            tier1Status: 'environment_hits_found',
            evidenceWritten: 'iff_completed_successfully',
            sseAttachment: true,
            investigationStatus: 'open',
          },
          {
            reportId: HUNT_REPORT_IDS.multiCandidate[2],
            hasConfirmedHit: true,
            tier1Status: 'environment_hits_found',
            tier2Executed: false,
            evidenceWritten: 'iff_completed_successfully',
            sseAttachment: true,
            investigationStatus: 'open',
          },
        ],
      },
      criteria: [
        'Each of the three reports gets its own conclusion; findings from one report are not attributed to another.',
        "Each hit narrative is grounded in that report's IOCs or behaviors.",
        'When two Investigations find the same principal, only one actioned Proposal is raised and the other Investigation names that Proposal (Also raised by / no second Proposal).',
      ],
    },
  },
  {
    // A second clean report on a different id: the no-hit path must be stable across reports,
    // not just on the golden one.
    id: 'hard-clean-repeat',
    cohort: 'hard',
    input: { spaceId: DEFAULT_EVAL_SPACE_ID, reportIds: [HUNT_REPORT_IDS.cleanRepeat] },
    output: {
      expected: {
        outcome: ['completed'],
        indexScopeBlocked: false,
        reports: [
          {
            reportId: HUNT_REPORT_IDS.cleanRepeat,
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
    // IOC-only hit: Tier 1 matches the environment, there is no technique for Tier 2 to run.
    // Whether the matched principal is actionable enough to mint a Proposal is not pinned; the
    // hit, the SSE and the open Investigation are. A partial run may only stop at `hunt`.
    id: 'hard-difficult-hit-ioc-only',
    cohort: 'hard',
    input: { spaceId: DEFAULT_EVAL_SPACE_ID, reportIds: [HUNT_REPORT_IDS.difficultHit] },
    output: {
      expected: {
        outcome: ['completed', 'partial'],
        incompleteStage: 'hunt',
        indexScopeBlocked: false,
        reports: [
          {
            reportId: HUNT_REPORT_IDS.difficultHit,
            hasConfirmedHit: true,
            tier1Status: 'environment_hits_found',
            tier2Executed: false,
            evidenceWritten: 'iff_completed_successfully',
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
  {
    // One IOC over `MAX_HUNT_REPORT_IOCS`: the coordinator hunts the prefix and records the rest as
    // `input_truncated`, a gap no later run can close, so the run is `partial` at `hunt`, the
    // report retires with evidence marked incomplete, and no Proposal is minted on a clean prefix.
    id: 'hard-partial-ioc-dump',
    cohort: 'hard',
    input: { spaceId: DEFAULT_EVAL_SPACE_ID, reportIds: [HUNT_REPORT_IDS.iocDump] },
    output: {
      expected: {
        outcome: ['partial'],
        incompleteStage: 'hunt',
        indexScopeBlocked: false,
        reports: [
          {
            reportId: HUNT_REPORT_IDS.iocDump,
            hasConfirmedHit: false,
            tier1Status: 'no_environment_hits',
            pendingProposals: 0,
            evidenceWritten: true,
            sseAttachment: false,
            // Opened before the hunt and left open: an `incomplete_final` hunt writes evidence
            // but records no verdict, so nothing closes it.
            investigationStatus: 'open',
          },
        ],
      },
      criteria: [
        'The narrative says part of the report was not searched (indicators beyond what one hunt accepts) rather than calling the environment clean.',
        'The narrative does not claim compromise.',
      ],
    },
  },
  {
    // The Investigation already exists as a private conversation owned by someone else, so the
    // Worker's find_or_create cannot read it. The hunt child skips the coordinator rather than hunt
    // into an Investigation it cannot see, and the run ends `failed` with no evidence, no SSE and
    // no Proposal, leaving the report eligible for the next sweep.
    id: 'hard-failed-locked-investigation',
    cohort: 'hard',
    input: {
      spaceId: DEFAULT_EVAL_SPACE_ID,
      reportIds: [HUNT_REPORT_IDS.lockedInvestigation],
      fault: 'investigation_locked',
    },
    output: {
      expected: {
        outcome: ['failed'],
        incompleteStage: 'hunt',
        indexScopeBlocked: false,
        reports: [
          {
            reportId: HUNT_REPORT_IDS.lockedInvestigation,
            hasConfirmedHit: false,
            pendingProposals: 0,
            evidenceWritten: false,
            sseAttachment: false,
            // Not pinned: the conversation at the Investigation id is the staged private one
            // (no `metadata.status`), so neither `none` nor `open` describes what the Worker did.
          },
        ],
      },
      // No Investigation the Worker could write to, so there is no narrative to judge.
      criteria: [],
    },
  },
];
