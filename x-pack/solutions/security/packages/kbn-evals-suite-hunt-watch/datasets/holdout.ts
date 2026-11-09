/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_EVAL_SPACE_ID, HOLDOUT_REPORT_IDS } from '../src/constants';
import type { HuntWatchExample } from '../src/types';

/**
 * Holdout cohort: the same three paths as the iteration rows (confirmed hit, IOC-only difficult
 * hit, clean no-hit) on report ids the iteration cohorts never trigger, the `historic-03` slot
 * of the other aws-iam scenarios. It measures generalisation: a score that holds here and on
 * the iteration rows is a capability, a score that holds only on the iteration rows is
 * overfit to them. Run on demand (`HUNT_WATCH_HOLDOUT=1`), never as part of the weekly step,
 * and compare against the iteration cohorts with `evaluation.gap-report`.
 *
 * Expectations mirror the iteration sibling of each path and pin nothing the sibling does not.
 */
const [ASSUME_ROLE_HOLDOUT, IOC_ONLY_HOLDOUT, CLEAN_HOLDOUT] = HOLDOUT_REPORT_IDS;

export const holdoutDataset: HuntWatchExample[] = [
  {
    // Endpoint-led AssumeRole story: the process chain is the leading indicator, the Tier 2
    // AssumeRole query the confirmation. Tier 1 is left unpinned because this scenario's IOCs
    // are live telemetry values, unlike the golden hit's article-only decoys.
    //
    // Mirrors the assume-role report inside `hard-multi-candidate`, not the golden hit: on this
    // scenario Tier 2 often ends `incomplete_retryable` (a derived technique it cannot ground a
    // query or quote for), so the run is `partial` with no evidence written. The row therefore
    // accepts either label and checks evidence against the hunt's own success, and does not pin
    // Tier 2 execution, which is zero when every generated query fails. A partial run may only
    // stop at `hunt`, and still has to confirm the hit, attach an SSE and raise a Proposal. See
    // the README's "Known Worker behavior" section for the run history and when to tighten this.
    id: 'holdout-hit-aws-iam-assume-role',
    cohort: 'holdout',
    input: { spaceId: DEFAULT_EVAL_SPACE_ID, reportIds: [ASSUME_ROLE_HOLDOUT] },
    output: {
      expected: {
        outcome: ['completed', 'partial'],
        incompleteStage: 'hunt',
        indexScopeBlocked: false,
        reports: [
          {
            reportId: ASSUME_ROLE_HOLDOUT,
            hasConfirmedHit: true,
            pendingProposals: { min: 1 },
            evidenceWritten: 'iff_completed_successfully',
            sseAttachment: true,
            investigationStatus: 'open',
          },
        ],
      },
      criteria: [
        'The narrative states a confirmed hit and ties it to the AssumeRole escalation the report describes.',
        'The narrative is grounded in what the hunt actually executed and found.',
      ],
    },
  },
  {
    // Mirrors `hard-difficult-hit-ioc-only`: Proposal count unpinned, partial only at `hunt`.
    id: 'holdout-difficult-hit-aws-iam-ioc-only',
    cohort: 'holdout',
    input: { spaceId: DEFAULT_EVAL_SPACE_ID, reportIds: [IOC_ONLY_HOLDOUT] },
    output: {
      expected: {
        outcome: ['completed', 'partial'],
        incompleteStage: 'hunt',
        indexScopeBlocked: false,
        reports: [
          {
            reportId: IOC_ONLY_HOLDOUT,
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
        'The hit narrative is grounded in the environment IOCs the report names.',
        'The narrative does not claim a technique-level finding, since the report names no technique to hunt.',
      ],
    },
  },
  {
    // Same pin as the golden clean row: no hit, benign close, Investigation closed.
    id: 'holdout-clean-aws-iam-clean',
    cohort: 'holdout',
    input: { spaceId: DEFAULT_EVAL_SPACE_ID, reportIds: [CLEAN_HOLDOUT] },
    output: {
      expected: {
        outcome: ['completed'],
        indexScopeBlocked: false,
        reports: [
          {
            reportId: CLEAN_HOLDOUT,
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
        'The narrative states that no matching activity was found and does not claim a hit.',
        'The narrative does not claim the placeholder IP addresses from the advisory were observed in the environment.',
      ],
    },
  },
];
