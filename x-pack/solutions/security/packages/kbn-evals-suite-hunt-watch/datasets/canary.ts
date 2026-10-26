/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_EVAL_SPACE_ID, HUNT_REPORT_IDS } from '../src/constants';
import type { HuntWatchExample } from '../src/types';

/**
 * Canary: a suite-authored prose-only report with no IOCs, technique ids, or principals. It is
 * scored by an inverted evaluator (1 iff Tier 1 is `no_searchable_terms`, nothing executes in
 * Tier 2, there is no hit, no Proposal, and no SSE attachment). A 0 means the Worker invented a
 * finding from nothing. Do not remove.
 */
export const canaryDataset: HuntWatchExample[] = [
  {
    id: 'canary-prose-only-report',
    cohort: 'canary',
    input: { spaceId: DEFAULT_EVAL_SPACE_ID, reportIds: [HUNT_REPORT_IDS.canary] },
    output: {
      expected: {
        indexScopeBlocked: false,
        reports: [
          {
            reportId: HUNT_REPORT_IDS.canary,
            hasConfirmedHit: false,
            tier1Status: 'no_searchable_terms',
            tier2Executed: false,
            pendingProposals: 0,
            evidenceWritten: 'iff_completed_successfully',
            sseAttachment: false,
          },
        ],
      },
      criteria: ['The narrative does not claim a hit or any environment finding.'],
    },
  },
];
