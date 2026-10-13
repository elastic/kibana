/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HuntArtifacts, HuntReportArtifacts } from '../collect';
import type { HuntReportExpectation, HuntWatchExample } from '../types';
import {
  scoreCanaryTripped,
  scoreOutcome,
  scoreProposalPresence,
  scoreTier1Status,
} from './code_scores';

const REPORT_ID = 'r1';

const buildExample = (
  report: Partial<HuntReportExpectation>,
  expected: Partial<HuntWatchExample['output']['expected']> = {}
): HuntWatchExample => ({
  id: 'ex',
  cohort: 'golden',
  input: { spaceId: 'default', reportIds: [REPORT_ID] },
  output: {
    criteria: [],
    expected: {
      indexScopeBlocked: false,
      reports: [
        {
          reportId: REPORT_ID,
          hasConfirmedHit: false,
          pendingProposals: 0,
          evidenceWritten: false,
          sseAttachment: false,
          ...report,
        },
      ],
      ...expected,
    },
  },
});

const buildArtifacts = (report: Partial<HuntReportArtifacts> = {}): HuntArtifacts => ({
  spaceId: 'default',
  workflowExecutionId: 'w',
  executionStatus: 'completed',
  selectedIds: [REPORT_ID],
  skipped: [],
  reports: {
    [REPORT_ID]: {
      reportId: REPORT_ID,
      selected: true,
      stages: {},
      sseEvents: [],
      proposals: [],
      narrative: '',
      ...report,
    },
  },
});

describe('code scores', () => {
  it('returns N/A when the outcome is not pinned', () => {
    expect(scoreOutcome(buildExample({}), buildArtifacts()).label).toBe('N/A');
  });

  it('returns MISSING, not a pass, when the outcome artifact is absent', () => {
    expect(scoreOutcome(buildExample({}, { outcome: ['completed'] }), buildArtifacts()).label).toBe(
      'MISSING'
    );
  });

  it('scores 0 for a failed outcome when completed was expected', () => {
    expect(
      scoreOutcome(
        buildExample({}, { outcome: ['completed'] }),
        buildArtifacts({ outcome: 'failed' })
      ).score
    ).toBe(0);
  });

  it('scores 0 when the incomplete stage differs', () => {
    expect(
      scoreOutcome(
        buildExample({}, { outcome: ['partial'], incompleteStage: 'packaging' }),
        buildArtifacts({ outcome: 'partial', incompleteStage: 'hunt' })
      ).score
    ).toBe(0);
  });

  it('scores 1 for a matching outcome', () => {
    expect(
      scoreOutcome(
        buildExample({}, { outcome: ['completed'] }),
        buildArtifacts({ outcome: 'completed' })
      ).score
    ).toBe(1);
  });

  it('reads Tier 1 status from the headline when there is no SSE attachment', () => {
    expect(
      scoreTier1Status(
        buildExample({ tier1Status: 'no_environment_hits' }),
        buildArtifacts({ hunt: { headline: 'Tier 1 found no matches in the environment' } })
      ).score
    ).toBe(1);
  });

  it('scores 0 when pending Proposals are below the expected minimum', () => {
    expect(
      scoreProposalPresence(buildExample({ pendingProposals: { min: 1 } }), buildArtifacts()).score
    ).toBe(0);
  });

  it('scores 1 when pending Proposals meet the exact expected count', () => {
    expect(scoreProposalPresence(buildExample({}), buildArtifacts()).score).toBe(1);
  });

  it('inverts the canary: 1 when nothing was invented', () => {
    expect(
      scoreCanaryTripped(buildExample({}), buildArtifacts({ hunt: { hit: false } })).score
    ).toBe(1);
  });

  it('inverts the canary: 0 when the hunt reports a hit', () => {
    expect(
      scoreCanaryTripped(buildExample({}), buildArtifacts({ hunt: { hit: true } })).score
    ).toBe(0);
  });

  it('returns MISSING for the canary when the hunt produced no output', () => {
    expect(scoreCanaryTripped(buildExample({}), buildArtifacts()).label).toBe('MISSING');
  });
});
