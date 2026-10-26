/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HuntArtifacts, HuntReportArtifacts } from '../collect';
import type { HuntWatchExample } from '../types';
import {
  buildGroundTruth,
  buildJudgeQuestion,
  buildToolCallHistory,
  createJudgeEvaluators,
} from './judge_analysis';

const REPORT_ID = 'r1';

const buildOutput = (
  report: Partial<HuntWatchExample['output']['expected']['reports'][number]> = {},
  criteria: string[] = []
): HuntWatchExample['output'] => ({
  criteria,
  expected: {
    indexScopeBlocked: false,
    reports: [
      {
        reportId: REPORT_ID,
        hasConfirmedHit: false,
        pendingProposals: 0,
        evidenceWritten: true,
        sseAttachment: true,
        investigationStatus: 'open',
        ...report,
      },
    ],
  },
});

const buildArtifacts = (report: Partial<HuntReportArtifacts> = {}): HuntArtifacts => ({
  spaceId: 'default',
  workflowExecutionId: 'w',
  executionStatus: 'completed',
  runStartedAt: '2026-01-01T12:00:00.000Z',
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
      narrative: 'No activity matched.',
      ...report,
    },
  },
});

const evaluatorArgs = (output: HuntWatchExample['output'], artifacts: HuntArtifacts) => ({
  input: { spaceId: 'default', reportIds: [REPORT_ID] },
  output: artifacts,
  expected: output,
  metadata: null,
});

describe('judge_analysis', () => {
  it('names every report id in the judge question', () => {
    expect(buildJudgeQuestion({ spaceId: 'hunt-a', reportIds: ['a', 'b'] })).toContain('a, b');
  });

  it('states the pinned verdict in the ground truth', () => {
    expect(buildGroundTruth(buildOutput({ hasConfirmedHit: true }))).toContain('confirmed hit');
  });

  it('describes a minimum Proposal count in the ground truth', () => {
    expect(buildGroundTruth(buildOutput({ pendingProposals: { min: 2 } }))).toContain(
      'At least 2 pending Proposals'
    );
  });

  it('states unpinned counts as open rather than as zero', () => {
    const groundTruth = buildGroundTruth(
      buildOutput({ pendingProposals: undefined, tier2Executed: undefined })
    );
    expect(groundTruth).toContain('any number of behaviors is acceptable');
    expect(groundTruth).toContain('Proposals raised for action is not pinned');
  });

  it('states that a partial-only row expects an incomplete run', () => {
    const output = buildOutput({});
    output.expected.outcome = ['partial'];
    output.expected.incompleteStage = 'hunt';
    expect(buildGroundTruth(output)).toContain('The run ends partial at the hunt stage');
  });

  it('says nothing about the outcome when a row accepts completed or partial', () => {
    const output = buildOutput({});
    output.expected.outcome = ['completed', 'partial'];
    expect(buildGroundTruth(output)).not.toContain('The run ends partial');
  });

  it('appends the rubric criteria to the ground truth', () => {
    expect(buildGroundTruth(buildOutput({}, ['Must not claim compromise.']))).toContain(
      'Must not claim compromise.'
    );
  });

  it('builds one tool call per available hunt fact', () => {
    const artifacts = buildArtifacts({
      hunt: { status: 'success', hit: false },
      coordinator: { status: 'success', index_patterns: ['logs-*'] },
      packaging: { status: 'failed' },
      reportDoc: { evidence: [{ space_id: 'default' }] },
    });
    expect(buildToolCallHistory(artifacts).map((c) => c.tool_id)).toEqual([
      'worker_execution',
      'threat_report',
      'hunt',
      'hunt_coordinator',
      'package_report',
      'write_hunt_evidence',
      'proposals_in_space',
    ]);
  });

  it('exposes Factuality, Relevance and Groundedness only', () => {
    expect(createJudgeEvaluators().map((e) => e.name)).toEqual([
      'Factuality',
      'Relevance',
      'Groundedness',
    ]);
  });

  it('returns N/A when the row expects no Investigation', async () => {
    const [factuality] = createJudgeEvaluators();
    const result = await factuality.evaluate(
      evaluatorArgs(buildOutput({ investigationStatus: 'none' }), buildArtifacts())
    );
    expect(result.label).toBe('N/A');
  });

  it('returns MISSING when the judge analysis is absent', async () => {
    const [factuality] = createJudgeEvaluators();
    const result = await factuality.evaluate(evaluatorArgs(buildOutput(), buildArtifacts()));
    expect(result.label).toBe('MISSING');
  });

  it('scores from the stored analysis and records judge provenance', async () => {
    const judge = { judgeConnectorId: 'eis-google-gemini-3-1-pro' };
    const [, , groundedness] = createJudgeEvaluators(judge);
    const result = await groundedness.evaluate(
      evaluatorArgs(buildOutput(), {
        ...buildArtifacts(),
        groundednessAnalysis: {
          summary_verdict: 'GROUNDED',
          analysis: [
            {
              claim: 'No activity matched.',
              centrality: 'central',
              centrality_reason: 'the verdict',
              verdict: 'FULLY_SUPPORTED',
              evidence: { tool_call_id: 'r1:hunt', tool_id: 'hunt', evidence_snippet: 'hit' },
              explanation: 'matches hunt output',
            },
          ],
        },
      })
    );
    expect(result).toMatchObject({ score: 1, metadata: { judge } });
  });
});
