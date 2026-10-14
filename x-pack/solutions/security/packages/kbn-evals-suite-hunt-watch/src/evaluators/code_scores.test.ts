/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HuntResult } from '@kbn/alertzero-common';
import type { HuntArtifacts, HuntReportArtifacts } from '../collect';
import type { HuntExpected, HuntReportExpectation } from '../types';
import {
  scoreCandidateSelection,
  scoreCanaryTripped,
  scoreEvidenceHonesty,
  scoreHitConsistency,
  scoreOutcome,
  scoreProposalPresence,
  scoreSseAttachment,
  scoreStageProgression,
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

const CLEAN_HUNT_RESULT: HuntResult = {
  has_confirmed_hit: false,
  hit_sources: [],
  time_range: { from: '2026-01-01T00:00:00.000Z', to: '2026-01-02T00:00:00.000Z' },
  tier1: {
    status: 'no_environment_hits',
    counts: { total_hits: 0, returned_hits: 0, affected_hosts: 0, affected_users: 0 },
    per_index: [],
    resolved_iocs: [],
  },
};

const buildArtifacts = (report: Partial<HuntReportArtifacts> = {}): HuntArtifacts => ({
  spaceId: 'default',
  workflowExecutionId: 'w',
  executionStatus: 'completed',
  selectedIds: [REPORT_ID],
  skipped: [],
  pendingProposalsInSpace: [],
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

  it('scores 1 for an SSE attachment whose hunt_result passed huntResultSchema', () => {
    expect(
      scoreSseAttachment(
        buildExpected({ sseAttachment: true }),
        buildArtifacts({
          conversation: { id: 'c' },
          sseEvents: [{ severity: 'low', hunt_result: CLEAN_HUNT_RESULT }],
        })
      ).score
    ).toBe(1);
  });

  it('scores 0 for an SSE attachment whose hunt_result failed huntResultSchema', () => {
    expect(
      scoreSseAttachment(
        buildExpected({ sseAttachment: true }),
        buildArtifacts({
          conversation: { id: 'c' },
          sseEvents: [{ severity: 'low', hunt_result_error: 'tier1.status: invalid enum value' }],
        })
      ).score
    ).toBe(0);
  });

  it('scores hit consistency against the first SSE that carries a hunt_result', () => {
    expect(
      scoreHitConsistency(
        buildExpected({ hasConfirmedHit: false, tier1Status: 'no_environment_hits' }),
        buildArtifacts({
          hunt: { hit: false },
          sseEvents: [
            { severity: 'low', hunt_result_error: 'rejected' },
            { severity: 'high', hunt_result: { ...CLEAN_HUNT_RESULT, has_confirmed_hit: true } },
          ],
        })
      ).score
    ).toBe(0);
  });
});

describe('scoreCandidateSelection', () => {
  const missingId = 'r-missing';

  it('scores 0 when an expected skip reason was not reported', () => {
    expect(
      scoreCandidateSelection(buildExpected({}, { skipped: ['not_found'] }), buildArtifacts()).score
    ).toBe(0);
  });

  it('scores 1 for a row that names both a selected report and a skipped one', () => {
    expect(
      scoreCandidateSelection(buildExpected({}, { skipped: ['not_found'] }), {
        ...buildArtifacts(),
        skipped: [{ id: missingId, reason: 'not_found' }],
      }).score
    ).toBe(1);
  });

  it('scores 0 when a row expects no candidates but some were selected', () => {
    expect(
      scoreCandidateSelection(
        { indexScopeBlocked: false, skipped: ['not_found'], reports: [] },
        { ...buildArtifacts(), skipped: [{ id: missingId, reason: 'not_found' }] }
      ).explanation
    ).toMatch(/expected no candidates but selected/);
  });

  it('matches skip reasons exactly, not as substrings', () => {
    expect(
      scoreCandidateSelection(
        { indexScopeBlocked: false, skipped: ['not_found'], reports: [] },
        {
          ...buildArtifacts(),
          selectedIds: [],
          skipped: [{ id: missingId, reason: 'not_found_x' }],
        }
      ).score
    ).toBe(0);
  });
});

describe('scoreStageProgression', () => {
  const completed = (startedAt?: string) => ({ status: 'completed', startedAt });

  it('returns MISSING rather than out-of-order when a stage has no startedAt', () => {
    const result = scoreStageProgression(
      buildExpected({ tier1Status: 'no_environment_hits' }),
      buildArtifacts({
        stages: {
          find_or_create_investigation: completed('2026-01-01T00:00:00Z'),
          hunt: completed(),
          package_report: completed('2026-01-01T00:02:00Z'),
          write_run_conclusion: completed('2026-01-01T00:03:00Z'),
        },
      })
    );
    expect(result.label).toBe('MISSING');
    expect(result.explanation).toMatch(/hunt/);
  });

  it('scores 0 when the stages ran out of order', () => {
    expect(
      scoreStageProgression(
        buildExpected({ tier1Status: 'no_environment_hits' }),
        buildArtifacts({
          stages: {
            find_or_create_investigation: completed('2026-01-01T00:01:00Z'),
            hunt: completed('2026-01-01T00:00:00Z'),
            package_report: completed('2026-01-01T00:02:00Z'),
            write_run_conclusion: completed('2026-01-01T00:03:00Z'),
          },
        })
      ).score
    ).toBe(0);
  });
});
