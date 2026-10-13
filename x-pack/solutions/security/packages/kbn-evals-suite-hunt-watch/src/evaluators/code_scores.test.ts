/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HuntArtifacts, HuntReportArtifacts } from '../collect';
import type { HuntExpected, HuntReportExpectation } from '../types';
import {
  scoreCanaryTripped,
  scoreEvidenceHonesty,
  scoreOutcome,
  scoreProposalPresence,
  scoreTier1Status,
} from './code_scores';

const REPORT_ID = 'r1';

const buildExpected = (
  report: Partial<HuntReportExpectation>,
  expected: Partial<HuntExpected> = {}
): HuntExpected => ({
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
    expect(scoreOutcome(buildExpected({}), buildArtifacts()).label).toBe('N/A');
  });

  it('returns MISSING, not a pass, when the outcome artifact is absent', () => {
    expect(
      scoreOutcome(buildExpected({}, { outcome: ['completed'] }), buildArtifacts()).label
    ).toBe('MISSING');
  });

  it('scores 0 for a failed outcome when completed was expected', () => {
    expect(
      scoreOutcome(
        buildExpected({}, { outcome: ['completed'] }),
        buildArtifacts({ outcome: 'failed' })
      ).score
    ).toBe(0);
  });

  it('scores 0 when the incomplete stage differs', () => {
    expect(
      scoreOutcome(
        buildExpected({}, { outcome: ['partial'], incompleteStage: 'packaging' }),
        buildArtifacts({ outcome: 'partial', incompleteStage: 'hunt' })
      ).score
    ).toBe(0);
  });

  it('scores 1 for a matching outcome', () => {
    expect(
      scoreOutcome(
        buildExpected({}, { outcome: ['completed'] }),
        buildArtifacts({ outcome: 'completed' })
      ).score
    ).toBe(1);
  });

  it('reads Tier 1 status from the headline when there is no SSE attachment', () => {
    expect(
      scoreTier1Status(
        buildExpected({ tier1Status: 'no_environment_hits' }),
        buildArtifacts({ hunt: { headline: 'Tier 1 found no matches in the environment' } })
      ).score
    ).toBe(1);
  });

  it('scores 0 when pending Proposals are below the expected minimum', () => {
    expect(
      scoreProposalPresence(buildExpected({ pendingProposals: { min: 1 } }), buildArtifacts()).score
    ).toBe(0);
  });

  it('scores 1 when pending Proposals meet the exact expected count', () => {
    expect(scoreProposalPresence(buildExpected({}), buildArtifacts()).score).toBe(1);
  });

  it('scores evidence as written when the hunt succeeded, even if the run ended partial', () => {
    expect(
      scoreEvidenceHonesty(
        buildExpected({ evidenceWritten: 'iff_hunt_success' }),
        buildArtifacts({
          outcome: 'partial',
          hunt: { status: 'success' },
          reportDoc: { evidence: [{ space_id: 'default' }] },
        })
      ).score
    ).toBe(1);
  });

  it('scores 0 when evidence was written by a hunt that did not complete', () => {
    expect(
      scoreEvidenceHonesty(
        buildExpected({ evidenceWritten: 'iff_hunt_success' }),
        buildArtifacts({
          hunt: { status: 'partial' },
          reportDoc: { evidence: [{ space_id: 'default' }] },
        })
      ).score
    ).toBe(0);
  });

  it('inverts the canary: 1 when nothing was invented', () => {
    expect(
      scoreCanaryTripped(buildExpected({}), buildArtifacts({ hunt: { hit: false } })).score
    ).toBe(1);
  });

  it('inverts the canary: 0 when the hunt reports a hit', () => {
    expect(
      scoreCanaryTripped(buildExpected({}), buildArtifacts({ hunt: { hit: true } })).score
    ).toBe(0);
  });

  it('returns MISSING for the canary when the hunt produced no output', () => {
    expect(scoreCanaryTripped(buildExpected({}), buildArtifacts()).label).toBe('MISSING');
  });
});
