/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HuntResult } from '@kbn/alertzero-common';
import type { HuntArtifacts, HuntReportArtifacts } from '../collect';
import type { HuntExpected, HuntReportExpectation } from '../types';
import type { ProposalWithMetadata } from '@kbn/proposals-common';
import {
  actionedSubjectFingerprint,
  scoreCandidateSelection,
  scoreCanaryTripped,
  scoreEvidenceHonesty,
  scoreHitConsistency,
  scoreOutcome,
  scoreProposalConvergence,
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

const RUN_STARTED_AT = '2026-01-01T12:00:00.000Z';

const proposalAt = (createdAt: string, status: ProposalWithMetadata['status']) =>
  ({ id: `p-${createdAt}`, status, createdAt } as ProposalWithMetadata);

const buildArtifacts = (report: Partial<HuntReportArtifacts> = {}): HuntArtifacts => ({
  spaceId: 'default',
  workflowExecutionId: 'w',
  executionStatus: 'completed',
  runStartedAt: RUN_STARTED_AT,
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

  it('does not hold a completed run to the incomplete stage pinned for its partial alternative', () => {
    const expected = buildExpected(
      {},
      { outcome: ['completed', 'partial'], incompleteStage: 'hunt' }
    );
    expect(scoreOutcome(expected, buildArtifacts({ outcome: 'completed' })).score).toBe(1);
    expect(
      scoreOutcome(expected, buildArtifacts({ outcome: 'partial', incompleteStage: 'hunt' })).score
    ).toBe(1);
    expect(
      scoreOutcome(expected, buildArtifacts({ outcome: 'partial', incompleteStage: 'packaging' }))
        .score
    ).toBe(0);
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
    expect(
      scoreProposalPresence(
        buildExpected({ pendingProposals: 1 }),
        buildArtifacts({ proposals: [proposalAt('2026-01-01T12:05:00.000Z', 'pending')] })
      ).score
    ).toBe(1);
  });

  it('returns N/A when the Proposal count is not pinned', () => {
    expect(
      scoreProposalPresence(buildExpected({ pendingProposals: undefined }), buildArtifacts()).label
    ).toBe('N/A');
  });

  it('scores 0 for a zero row when the run minted a Proposal and already executed it', () => {
    const result = scoreProposalPresence(
      buildExpected({ pendingProposals: 0 }),
      buildArtifacts({ proposals: [proposalAt('2026-01-01T12:05:00.000Z', 'succeeded')] })
    );
    expect(result.score).toBe(0);
    expect(result.explanation).toContain('1 Proposal(s) created by this run, report 0');
  });

  it('scores 1 for a zero row when the only Proposals predate the run', () => {
    expect(
      scoreProposalPresence(
        buildExpected({ pendingProposals: 0 }),
        buildArtifacts({
          proposals: [
            proposalAt('2025-12-31T12:00:00.000Z', 'no_action'),
            proposalAt('2025-12-31T13:00:00.000Z', 'succeeded'),
          ],
        })
      ).score
    ).toBe(1);
  });

  it('scores evidence as written when the coordinator retired the report as incomplete_final, even though the hunt child reports partial', () => {
    expect(
      scoreEvidenceHonesty(
        buildExpected({ evidenceWritten: 'iff_completed_successfully' }),
        buildArtifacts({
          outcome: 'partial',
          hunt: { status: 'partial' },
          coordinator: { completeness: 'incomplete_final', completed_successfully: true },
          reportDoc: {
            evidence: [{ space_id: 'default', last_hunted_at: '2026-01-01T12:00:00.000Z' }],
          },
        })
      ).score
    ).toBe(1);
  });

  it('scores 0 when a retryable hunt with no hit, which must leave the report eligible, stamped it', () => {
    expect(
      scoreEvidenceHonesty(
        buildExpected({ evidenceWritten: 'iff_completed_successfully' }),
        buildArtifacts({
          hunt: { status: 'partial' },
          coordinator: {
            completeness: 'incomplete_retryable',
            completed_successfully: false,
            has_confirmed_hit: false,
          },
          reportDoc: {
            evidence: [{ space_id: 'default', last_hunted_at: '2026-01-01T12:00:00.000Z' }],
          },
        })
      ).score
    ).toBe(0);
  });

  it('scores 1 when a retryable hunt with no hit left only the coverage ledger, not a stamp', () => {
    expect(
      scoreEvidenceHonesty(
        buildExpected({ evidenceWritten: 'iff_completed_successfully' }),
        buildArtifacts({
          hunt: { status: 'partial' },
          coordinator: {
            completeness: 'incomplete_retryable',
            completed_successfully: false,
            has_confirmed_hit: false,
          },
          reportDoc: {
            evidence: [
              { space_id: 'default', hunted_technique_ids: ['T1001'], coverage_pending: true },
            ],
          },
        })
      ).score
    ).toBe(1);
  });

  it('scores 1 when a confirmed hit on a retryable hunt was stamped', () => {
    expect(
      scoreEvidenceHonesty(
        buildExpected({ evidenceWritten: 'iff_completed_successfully' }),
        buildArtifacts({
          hunt: { status: 'partial' },
          coordinator: {
            completeness: 'incomplete_retryable',
            completed_successfully: false,
            has_confirmed_hit: true,
          },
          reportDoc: {
            evidence: [{ space_id: 'default', last_hunted_at: '2026-01-01T12:00:00.000Z' }],
          },
        })
      ).score
    ).toBe(1);
  });

  it('scores 0 when a confirmed hit on a retryable hunt was not stamped', () => {
    expect(
      scoreEvidenceHonesty(
        buildExpected({ evidenceWritten: 'iff_completed_successfully' }),
        buildArtifacts({
          hunt: { status: 'partial' },
          coordinator: {
            completeness: 'incomplete_retryable',
            completed_successfully: false,
            has_confirmed_hit: true,
          },
          reportDoc: { evidence: [] },
        })
      ).score
    ).toBe(0);
  });

  it('scores 0 when no coordinator read completed but evidence was written', () => {
    expect(
      scoreEvidenceHonesty(
        buildExpected({ evidenceWritten: 'iff_completed_successfully' }),
        buildArtifacts({
          hunt: { status: 'failed' },
          reportDoc: {
            evidence: [{ space_id: 'default', last_hunted_at: '2026-01-01T12:00:00.000Z' }],
          },
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

  it('inverts the canary: 0 when the hunt failed without searching, even though nothing was invented', () => {
    const result = scoreCanaryTripped(
      buildExpected({ tier1Status: 'no_searchable_terms' }),
      buildArtifacts({ outcome: 'failed', hunt: { status: 'failed', hit: false, behaviors: [] } })
    );
    expect(result.score).toBe(0);
    expect(result.explanation).toContain('did not reach a verdict');
  });

  it('inverts the canary: 0 when Tier 1 did not report no_searchable_terms', () => {
    expect(
      scoreCanaryTripped(
        buildExpected({ tier1Status: 'no_searchable_terms' }),
        buildArtifacts({
          outcome: 'completed',
          hunt: { status: 'completed', hit: false, headline: 'Tier 1 found no matches' },
        })
      ).score
    ).toBe(0);
  });

  it('inverts the canary: MISSING when Tier 1 is pinned but cannot be read from the run', () => {
    expect(
      scoreCanaryTripped(
        buildExpected({ tier1Status: 'no_searchable_terms' }),
        buildArtifacts({ outcome: 'completed', hunt: { status: 'completed', hit: false } })
      ).label
    ).toBe('MISSING');
  });

  it('inverts the canary: 1 when the hunt completed with nothing searchable and nothing invented', () => {
    expect(
      scoreCanaryTripped(
        buildExpected({ tier1Status: 'no_searchable_terms' }),
        buildArtifacts({
          outcome: 'completed',
          hunt: { status: 'completed', hit: false, headline: 'Report had no searchable terms' },
        })
      ).score
    ).toBe(1);
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

const actionedProposal = (
  overrides: Partial<ProposalWithMetadata> & Pick<ProposalWithMetadata, 'id' | 'conversationId'>
): ProposalWithMetadata =>
  ({
    spaceId: 'default',
    title: 'Mark user extreme impact',
    comment: 'Raise criticality.',
    status: 'pending',
    impact: 'high',
    confidence: 'medium',
    origin: 'alertzero',
    createdAt: '2026-01-01T00:00:00.000Z',
    actionWorkflowId: 'system-alertzero-action-set-asset-criticality',
    actionInput: {
      id_field: 'user.name',
      id_value: 'dev-user',
      criticality_level: 'extreme_impact',
    },
    ...overrides,
  } as ProposalWithMetadata);

describe('scoreProposalConvergence', () => {
  const multiExpected: HuntExpected = {
    indexScopeBlocked: false,
    proposalConvergence: true,
    reports: [
      {
        reportId: 'r1',
        hasConfirmedHit: true,
        pendingProposals: { min: 0 },
        evidenceWritten: true,
        sseAttachment: true,
        investigationStatus: 'open',
      },
      {
        reportId: 'r2',
        hasConfirmedHit: true,
        pendingProposals: { min: 0 },
        evidenceWritten: true,
        sseAttachment: true,
        investigationStatus: 'open',
      },
    ],
  };

  const multiArtifacts = ({
    proposalsInSpace,
    r2Summary,
    r2Narrative,
  }: {
    proposalsInSpace: ProposalWithMetadata[];
    r2Summary?: string;
    r2Narrative?: string;
  }): HuntArtifacts => ({
    spaceId: 'default',
    workflowExecutionId: 'w',
    executionStatus: 'completed',
    runStartedAt: RUN_STARTED_AT,
    selectedIds: ['r1', 'r2'],
    skipped: [],
    pendingProposalsInSpace: proposalsInSpace,
    reports: {
      r1: {
        reportId: 'r1',
        selected: true,
        stages: {},
        sseEvents: [],
        proposals: proposalsInSpace.filter((p) => p.conversationId === 'conv-1'),
        narrative: '',
        conversation: { id: 'conv-1' },
      },
      r2: {
        reportId: 'r2',
        selected: true,
        stages: {},
        sseEvents: [],
        proposals: proposalsInSpace.filter((p) => p.conversationId === 'conv-2'),
        narrative: r2Narrative ?? '',
        packaging: r2Summary ? { summary: r2Summary } : undefined,
        conversation: { id: 'conv-2' },
      },
    },
  });

  it('returns N/A when proposalConvergence is not pinned', () => {
    expect(scoreProposalConvergence(buildExpected({}), buildArtifacts()).label).toBe('N/A');
  });

  it('returns 0 when the same actioned subject is pending under two Investigations', () => {
    expect(
      scoreProposalConvergence(
        multiExpected,
        multiArtifacts({
          proposalsInSpace: [
            actionedProposal({ id: 'p1', conversationId: 'conv-1' }),
            actionedProposal({ id: 'p2', conversationId: 'conv-2' }),
          ],
          r2Summary: 'Packaging: no new proposals, 1 already raised by another Investigation',
        })
      ).score
    ).toBe(0);
  });

  it('returns 0 when subjects are unique but no convergence note is recorded', () => {
    expect(
      scoreProposalConvergence(
        multiExpected,
        multiArtifacts({
          proposalsInSpace: [actionedProposal({ id: 'p1', conversationId: 'conv-1' })],
        })
      ).score
    ).toBe(0);
  });

  it('returns 1 when one Investigation owns the subject and another records the convergence note', () => {
    expect(
      scoreProposalConvergence(
        multiExpected,
        multiArtifacts({
          proposalsInSpace: [
            actionedProposal({
              id: 'p1',
              conversationId: 'conv-1',
              comment:
                'Mark user extreme impact.\n\nAlso raised by [Investigation](/app/alertzero?selectedConversationId=conv-2).',
            }),
          ],
          r2Summary: 'Packaging: no new proposals, 1 already raised by another Investigation',
        })
      ).score
    ).toBe(1);
  });

  it('returns 1 when the converging Investigation narrative carries the no-second-Proposal line', () => {
    expect(
      scoreProposalConvergence(
        multiExpected,
        multiArtifacts({
          proposalsInSpace: [actionedProposal({ id: 'p1', conversationId: 'conv-1' })],
          r2Narrative:
            'A Proposal for "Mark user extreme impact" is already awaiting a decision, raised by [another Investigation](/app/alertzero?selectedConversationId=conv-1). This run found the same thing, so no second Proposal was created. This Investigation was added to it.',
        })
      ).score
    ).toBe(1);
  });
});

describe('actionedSubjectFingerprint', () => {
  it('returns undefined for a recommendation with no action workflow', () => {
    expect(
      actionedSubjectFingerprint(
        actionedProposal({
          id: 'p',
          conversationId: 'c',
          actionWorkflowId: undefined,
          actionInput: undefined,
        })
      )
    ).toBeUndefined();
  });

  it('returns the same fingerprint for two Proposals on the same user and action', () => {
    expect(actionedSubjectFingerprint(actionedProposal({ id: 'p1', conversationId: 'c1' }))).toBe(
      actionedSubjectFingerprint(actionedProposal({ id: 'p2', conversationId: 'c2' }))
    );
  });

  it('returns different fingerprints when the same target is asked for at two criticality levels', () => {
    expect(
      actionedSubjectFingerprint(actionedProposal({ id: 'p1', conversationId: 'c1' }))
    ).not.toBe(
      actionedSubjectFingerprint(
        actionedProposal({
          id: 'p2',
          conversationId: 'c2',
          actionInput: {
            id_field: 'user.name',
            id_value: 'dev-user',
            criticality_level: 'high_impact',
          },
        })
      )
    );
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
