/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MAX_INVESTIGATION_SUMMARY_CHARS,
  buildCleanInvestigationSummary,
  buildInvestigationSummary,
} from './build_investigation_summary';
import type { CurrentRunState } from './types';

const state = (overrides: Partial<CurrentRunState> = {}): CurrentRunState => ({
  runId: 'run-1',
  reportId: 'rpt-1',
  sseCount: 1,
  hasConfirmedHit: true,
  confidence: 0.9,
  titles: ['Hunt: Cloud Accounts (T1078.004)'],
  evidenceLines: ['Tier 2 executed T1078.004 with 2 required-index row(s).'],
  techniques: ['T1078.004'],
  findings: [],
  techniqueNames: { 'T1078.004': 'Cloud Accounts' },
  users: ['escalated-role', 'dev-user'],
  window: { from: '2026-09-08T17:48:43.364Z', to: '2026-10-08T17:48:43.364Z' },
  corroboratedTechniques: ['T1078.004'],
  services: [],
  hasUnnamedIdentityEntity: false,
  hasIocIndicator: false,
  allEventsActionable: false,
  hasProcessBearingEvent: false,
  manualRemediation: [],
  hosts: [{ name: 'WIN-ANALYST01', enrolled: true, agentId: 'a1', capabilities: [] }],
  processSelectors: [],
  evidence: { tier1HitCount: 0, tier2Confirmed: [{ techniqueId: 'T1078.004', rowCount: 2 }] },
  ...overrides,
});

const decided = {
  dismiss: false,
  proposals: [
    {
      subjectKey: 'k1',
      conversationId: 'c1',
      title: 'Isolate host WIN-ANALYST01',
      comment: 'c',
      category: 'respond',
    },
  ],
};

describe('buildInvestigationSummary', () => {
  it('states the outcome with its hit source and window', () => {
    expect(buildInvestigationSummary({ state: state(), decided })).toContain(
      'Outcome: confirmed hit (tier2). Window: 2026-09-08 → 2026-10-08.'
    );
  });

  it('names the corroborated technique with its name', () => {
    expect(buildInvestigationSummary({ state: state(), decided })).toContain(
      'Techniques corroborated: Cloud Accounts (T1078.004)'
    );
  });

  it('lists the full user names', () => {
    expect(buildInvestigationSummary({ state: state(), decided })).toContain(
      'Users: escalated-role, dev-user'
    );
  });

  it('words the minted actions as proposed', () => {
    expect(buildInvestigationSummary({ state: state(), decided })).toContain(
      'Packaging: proposed 1 action: Isolate host WIN-ANALYST01'
    );
  });

  it('says dismissed when nothing was proposed', () => {
    expect(
      buildInvestigationSummary({ state: state(), decided: { dismiss: true, proposals: [] } })
    ).toContain('Packaging: dismissed, no proposals');
  });

  it('keeps every evidence line rather than the first five', () => {
    const evidenceLines = Array.from({ length: 12 }, (_, i) => `Evidence line ${i + 1}`);

    expect(
      buildInvestigationSummary({ state: state({ evidenceLines }), decided }).split('\n- ')
    ).toHaveLength(13);
  });

  describe('over the attribute cap', () => {
    const evidenceLines = Array.from(
      { length: 400 },
      (_, i) => `Evidence line ${i + 1} ${'x'.repeat(60)}`
    );
    const summary = buildInvestigationSummary({ state: state({ evidenceLines }), decided });

    it('stays within the cap', () => {
      expect(summary.length).toBeLessThanOrEqual(MAX_INVESTIGATION_SUMMARY_CHARS);
    });

    it('counts the omitted evidence lines', () => {
      expect(summary).toMatch(/\(\+\d+ evidence lines omitted\)/);
    });

    it('never cuts a kept line mid-string with an ellipsis', () => {
      expect(summary).not.toMatch(/…|\.\.\./);
    });

    it('keeps the packaging line ahead of the omitted evidence', () => {
      expect(summary).toContain('Packaging: proposed 1 action');
    });
  });
});

describe('buildInvestigationSummary packaging outcome', () => {
  it.each([
    [
      'the existing-Proposal guard suppressed the mint',
      { mintSuppression: 'existing_proposals' as const },
      'Packaging: no new proposals, the Investigation already has proposals from an earlier run',
    ],
    [
      'the existing-Proposal check failed',
      { mintSuppression: 'check_failed' as const },
      'Packaging: no new proposals, existing proposals could not be checked',
    ],
  ])('says no new proposals when %s', (_label, args, expected) => {
    expect(
      buildInvestigationSummary({
        state: state(),
        decided: { dismiss: false, proposals: [] },
        ...args,
      })
    ).toContain(expected);
  });

  it('does not claim actions were proposed when the mint was suppressed', () => {
    expect(
      buildInvestigationSummary({
        state: state(),
        decided: { dismiss: false, proposals: [] },
        mintSuppression: 'existing_proposals',
      })
    ).not.toContain('proposed');
  });

  it('says the Investigation was left open when a dismissal was held for a pending proposal', () => {
    expect(
      buildInvestigationSummary({
        state: state(),
        decided: { dismiss: true, proposals: [] },
        dismissHold: 'open_proposal',
      })
    ).toContain(
      'Packaging: no new proposals, left open for a pending proposal from an earlier run'
    );
  });
});

describe('buildCleanInvestigationSummary', () => {
  it('says the Investigation was left open when a pending proposal holds it', () => {
    expect(buildCleanInvestigationSummary({ inputs: {}, dismissHold: 'open_proposal' })).toContain(
      'left open for a pending proposal'
    );
  });

  it('describes an inconclusive execution as inconclusive rather than 0 rows', () => {
    expect(
      buildCleanInvestigationSummary({
        inputs: {
          behaviors: [
            {
              technique_id: 'T1110.003',
              confidence: 0.9,
              validated_esql: 'FROM logs-aws.cloudtrail-* | LIMIT 5',
              execution: {
                executed: true,
                row_count: 0,
                hit: false,
                inconclusive_reason: 'rows_unclassifiable',
              },
            },
          ],
        },
      })
    ).toContain('T1110.003 (inconclusive)');
  });

  it('states a clean outcome', () => {
    expect(buildCleanInvestigationSummary({ inputs: {} })).toContain('Outcome: no confirmed hits.');
  });

  it('names the report title when it was loaded', () => {
    expect(
      buildCleanInvestigationSummary({
        inputs: {},
        reportContext: { title: 'Sign-in watch bulletin' },
      })
    ).toContain('Report: Sign-in watch bulletin');
  });

  it('lists the executed behaviors with their row counts', () => {
    expect(
      buildCleanInvestigationSummary({
        inputs: {
          behaviors: [
            {
              technique_id: 'T1110.003',
              technique_name: 'Password Spraying',
              confidence: 0.9,
              validated_esql: 'FROM logs-aws.cloudtrail-* | LIMIT 5',
              execution: { executed: true, row_count: 0, hit: false },
            },
          ],
        },
      })
    ).toContain('Behaviors executed: Password Spraying (T1110.003) (0 rows)');
  });

  it('says dismissed', () => {
    expect(buildCleanInvestigationSummary({ inputs: {} })).toContain(
      'Packaging: dismissed, no proposals'
    );
  });
});
