/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProposalWithMetadata } from '@kbn/proposals-common';
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

  it('states both close reasons packaging uses for a closed no-hit Investigation', () => {
    const groundTruth = buildGroundTruth(buildOutput({ investigationStatus: 'closed' }));
    expect(groundTruth).toContain('as benign when the whole report was searched');
    expect(groundTruth).toContain('as other when the report is retired');
  });

  it("states the Investigation's recorded status and close reason", () => {
    const groundTruth = buildGroundTruth(
      buildOutput({ investigationStatus: 'closed' }),
      buildArtifacts({
        conversation: { id: 'c', metadata: { status: 'closed', close_reason: 'other' } },
      })
    );
    expect(groundTruth).toContain(
      "The Investigation's recorded state is closed, close_reason other."
    );
    expect(
      buildGroundTruth(
        buildOutput(),
        buildArtifacts({ conversation: { id: 'c', metadata: { status: 'open' } } })
      )
    ).toContain("The Investigation's recorded state is open.");
    expect(buildGroundTruth(buildOutput(), buildArtifacts())).not.toContain('recorded state');
  });

  it('names the indicators IOC Hunt searched and the report indicators it left out', () => {
    const groundTruth = buildGroundTruth(
      buildOutput(),
      buildArtifacts({
        reportDoc: {
          extracted: {
            iocs: [
              { type: 'ip', value: '192.0.2.30' },
              { type: 'user', value: 'dev-user' },
            ],
          },
        },
        coordinator: { tier1: { resolved_iocs: [{ type: 'ip', value: '192.0.2.30' }] } },
        hunt: {
          coverage_gaps: [
            {
              reason: 'input_truncated',
              detail: '1 IOC(s) beyond the first 100 were never searched.',
            },
            { reason: 'generation_failed', technique_id: 'T1059.001' },
          ],
        },
      })
    );
    expect(groundTruth).toContain('report indicators (2): ip 192.0.2.30, user dev-user');
    expect(groundTruth).toContain('IOC Hunt searched 1 indicator(s); not searched: user dev-user');
    expect(groundTruth).toContain(
      'coverage gaps: input_truncated 1 IOC(s) beyond the first 100 were never searched. | ' +
        'generation_failed T1059.001'
    );
  });

  it('states the searched count without a skipped list when every indicator was searched', () => {
    const iocs = [{ type: 'ip', value: '192.0.2.30' }];
    const groundTruth = buildGroundTruth(
      buildOutput(),
      buildArtifacts({
        reportDoc: { extracted: { iocs } },
        coordinator: { tier1: { resolved_iocs: iocs } },
      })
    );
    expect(groundTruth).toContain('IOC Hunt searched 1 indicator(s).');
    expect(groundTruth).not.toContain('not searched');
  });

  it('adds the report metadata, search scope and behaviors the narrative quotes', () => {
    const groundTruth = buildGroundTruth(
      buildOutput(),
      buildArtifacts({
        reportDoc: {
          content: { title: 'Advisory: password spray', published_at: '2026-06-30T00:00:00Z' },
          source: { name: 'Advisory feed', type: 'rss' },
          severity: { level: 'medium', score: 40 },
          extracted: {
            iocs: [{ type: 'ip', value: '203.0.113.60' }],
            ttps: { techniques: ['T1110.003'] },
          },
        },
        coordinator: {
          index_patterns: ['logs-*'],
          tier2_targets: ['logs-aws.cloudtrail-*'],
          tier1: { time_range: { from: '2026-10-01T00:00:00Z', to: '2026-11-01T00:00:00Z' } },
        },
        hunt: {
          behaviors: [
            { technique_name: 'Password Spraying', execution: { executed: true, row_count: 0 } },
            { technique_name: 'Role Assumption', execution: { executed: true } },
          ],
        },
      })
    );
    for (const fact of [
      'title "Advisory: password spray"',
      'source "Advisory feed"',
      'published 2026-06-30T00:00:00Z',
      'source severity medium',
      'indicators (1): ip 203.0.113.60',
      'ATT&CK techniques: T1110.003',
      'hunt window 2026-10-01T00:00:00Z to 2026-11-01T00:00:00Z',
      'IOC Hunt indices: logs-*',
      'Behavior Hunt targets: logs-aws.cloudtrail-*',
      'Password Spraying executed, 0 row(s)',
      'Role Assumption executed, row count not recorded',
    ]) {
      expect(groundTruth).toContain(fact);
    }
  });

  it('names the technique, rating, hosts and users of each executed behavior', () => {
    const groundTruth = buildGroundTruth(
      buildOutput(),
      buildArtifacts({
        reportDoc: { content: { title: 'A' } },
        hunt: {
          behaviors: [
            {
              technique_name: 'Cloud Accounts',
              technique_id: 'T1078.004',
              severity: 'critical',
              confidence: 1,
              execution: { executed: true, hit: true, row_count: 2 },
              affected_hosts: ['WIN-ANALYST01'],
              affected_users: ['escalated-role', 'dev-user'],
            },
            { technique_name: 'Password Spraying', execution: { executed: false } },
          ],
        },
      })
    );
    expect(groundTruth).toContain(
      'Behavior Hunt behaviors: T1078.004 Cloud Accounts (critical, confidence 100%) executed, ' +
        '2 row(s), hosts WIN-ANALYST01, users escalated-role, dev-user | Password Spraying not executed'
    );
  });

  it('states no indicators only when the report recorded an empty indicator list', () => {
    const withReport = (reportDoc: Record<string, unknown>) =>
      buildGroundTruth(buildOutput(), buildArtifacts({ reportDoc }));
    expect(withReport({ content: { title: 'A' }, extracted: { iocs: [] } })).toContain(
      'no indicators'
    );
    expect(withReport({ content: { title: 'A' } })).not.toContain('no indicators');
    expect(withReport({})).not.toContain('facts:');
  });

  it('records empty techniques, the run id, IOC hit counts and an empty behavior list', () => {
    const groundTruth = buildGroundTruth(
      buildOutput(),
      buildArtifacts({
        reportDoc: { content: { title: 'A' }, extracted: { ttps: { techniques: [] } } },
        coordinator: {
          run_id: 'run-1',
          tier1: {
            counts: { total_hits: 21 },
            per_index: [
              { index: 'logs-aws', hit_count: 12 },
              { index: 'logs-endpoint', hit_count: 9 },
            ],
            affected_assets: {
              hosts: [{ name: 'WIN-ANALYST01', hit_count: 15 }],
              users: [{ name: 'dev-user', hit_count: 12 }],
              services: [{ name: 'escalated-role' }],
            },
          },
        },
        hunt: { behaviors: [] },
      })
    );
    for (const fact of [
      'ATT&CK techniques: none',
      'hunt run run-1',
      'IOC Hunt matched 21 document(s) across 2 index(es): logs-aws (12), logs-endpoint (9)',
      'affected hosts: WIN-ANALYST01 (15)',
      'affected users: dev-user (12)',
      'affected services: escalated-role',
      'Behavior Hunt derived no behaviors',
    ]) {
      expect(groundTruth).toContain(fact);
    }
  });

  it('omits techniques, run id, hit counts and behaviors when they were not recorded', () => {
    const groundTruth = buildGroundTruth(
      buildOutput(),
      buildArtifacts({ reportDoc: { content: { title: 'A' } } })
    );
    for (const fact of [
      'ATT&CK techniques',
      // trailing space: the fixed preamble says "The hunt runs IOC Hunt first"
      'hunt run ',
      'IOC Hunt matched',
      'Behavior Hunt derived',
      'Behavior Hunt behaviors',
    ]) {
      expect(groundTruth).not.toContain(fact);
    }
  });

  it('splits pending Proposals in the space by the Investigation that raised them', () => {
    const proposal = (conversationId: string, title?: string) =>
      ({
        id: title ?? 'untitled',
        status: 'pending',
        title,
        conversationId,
      } as ProposalWithMetadata);
    const base = buildArtifacts({ conversation: { id: 'own' } });
    const artifacts: HuntArtifacts = {
      ...base,
      pendingProposalsInSpace: [
        proposal('other', 'Kill aws.exe'),
        proposal('own', 'Analyst recommendation'),
        proposal('other', 'Isolate host'),
        proposal('other'),
      ],
    };
    const groundTruth = buildGroundTruth(buildOutput(), artifacts);
    expect(groundTruth).toContain(
      `Pending Proposals raised by this run's Investigation: "Analyst recommendation".`
    );
    expect(groundTruth).toContain(
      'Pending Proposals already raised by other Investigations in the space: "Kill aws.exe", "Isolate host".'
    );
    expect(buildGroundTruth(buildOutput(), buildArtifacts())).not.toContain('Pending Proposals');
  });

  it('adds no report facts when the report doc was not collected', () => {
    expect(buildGroundTruth(buildOutput(), buildArtifacts())).not.toContain('facts:');
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

  it('reads threat_report published_at from content.published_at rather than @timestamp', () => {
    const artifacts = buildArtifacts({
      reportDoc: {
        '@timestamp': '2026-05-16T12:00:00.000Z',
        content: {
          title: 'Advisory',
          published_at: '2026-05-01T00:00:00.000Z',
        },
      },
    });
    const reportCall = buildToolCallHistory(artifacts).find((c) => c.tool_id === 'threat_report');
    expect(reportCall?.result).toMatchObject({
      published_at: '2026-05-01T00:00:00.000Z',
    });
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

  describe('Factuality scores the judge verdict, not the claim mean', () => {
    const correctnessAnalysis = (factualAccuracySummary: string) => ({
      summary: {
        factual_accuracy_summary: factualAccuracySummary,
        relevance_summary: 'RELEVANT',
        sequence_accuracy_summary: 'NOT_APPLICABLE',
      },
      analysis: [
        {
          claim: 'No activity matched.',
          centrality: 'central',
          centrality_reason: 'the verdict',
          verdict: 'FULLY_SUPPORTED',
          sequence_match: 'NOT_APPLICABLE',
          justification_snippet: undefined,
          explanation: 'pinned',
        },
        {
          claim: 'The report was published on 1 May.',
          centrality: 'peripheral',
          centrality_reason: 'context',
          verdict: 'NOT_IN_GROUND_TRUTH',
          sequence_match: 'NOT_APPLICABLE',
          justification_snippet: undefined,
          explanation: 'not pinned',
        },
      ],
    });
    const scoreFor = async (factualAccuracySummary: string) => {
      const [factuality] = createJudgeEvaluators();
      return factuality.evaluate(
        evaluatorArgs(buildOutput(), {
          ...buildArtifacts(),
          correctnessAnalysis: correctnessAnalysis(factualAccuracySummary),
        })
      );
    };

    it('passes MINOR_INACCURACIES even though the claim mean is below 0.8', async () => {
      const result = await scoreFor('MINOR_INACCURACIES');
      expect(result.score).toBe(1);
      expect(result.metadata?.claimScore).toBeCloseTo(Math.sqrt(0.5));
    });

    it('passes ACCURATE', async () => {
      expect((await scoreFor('ACCURATE')).score).toBe(1);
    });

    it('fails MAJOR_INACCURACIES', async () => {
      expect((await scoreFor('MAJOR_INACCURACIES')).score).toBe(0);
    });

    it('leaves Relevance on its claim score', async () => {
      const [, relevance] = createJudgeEvaluators();
      const result = await relevance.evaluate(
        evaluatorArgs(buildOutput(), {
          ...buildArtifacts(),
          correctnessAnalysis: correctnessAnalysis('ACCURATE'),
        })
      );
      expect(result.metadata?.claimScore).toBeUndefined();
    });
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
