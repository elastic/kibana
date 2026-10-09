/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deriveCleanCoverageSubjects } from './derive_clean_coverage_subjects';
import type { ReportHuntContext } from './load_report_hunt_context';
import type { CoordinatorInputs } from './types';

const SPRAY_ESQL =
  '// Generated from hunt.hunt_behavior\nFROM logs-aws.cloudtrail-*\n| WHERE event.action == "ConsoleLogin"\n| LIMIT 25';
const SPRAY_SUBTECHNIQUE_ESQL =
  'FROM logs-aws.cloudtrail-*\n| WHERE event.outcome == "failure"\n| LIMIT 25';

/** The shape of run `ti-report-aws-iam-clean-historic-10`: two executed queries, zero rows. */
const inputs: CoordinatorInputs = {
  reportIntentTargets: ['logs-aws.cloudtrail-*'],
  behaviors: [
    {
      technique_id: 'T1110.003',
      technique_name: 'Password Spraying',
      title: 'Hunt: Password Spraying (T1110.003) [ti-repor]',
      evidence_quote: 'ConsoleLogin failures across eu-central-1 from a small set of source IPs.',
      confidence: 0.92,
      validated_esql: SPRAY_ESQL,
      execution: { executed: true, row_count: 0, hit: false },
    },
    {
      technique_id: 'T1110',
      technique_name: 'Brute Force',
      confidence: 0.7,
      validated_esql: SPRAY_SUBTECHNIQUE_ESQL,
      execution: { executed: true, row_count: 0, hit: false },
    },
  ],
};

const reportContext: ReportHuntContext = {
  title: 'Sign-in watch bulletin: ConsoleLogin failures across eu-central-1',
  severity: 'medium',
  techniques: ['T1110.003'],
  iocs: [
    { type: 'ip', value: '203.0.113.60' },
    { type: 'ip', value: '203.0.113.61' },
    { type: 'email', value: 'signin-watch@lab-demo.test' },
  ],
  vendor: 'Amazon',
  bodyText: 'Analysts observed repeated console sign-in failures.',
};

const defaultArgs = {
  spaceId: 'default',
  reportId: 'ti-report-aws-iam-clean-historic-10',
  inputs,
  reportContext,
  severity: 'medium',
  investigationSummary: 'Outcome: no confirmed hits.',
  investigationConversationId: 'conv-1',
};

describe('deriveCleanCoverageSubjects', () => {
  it('returns the report-scoped subject plus one per executed technique', () => {
    expect(deriveCleanCoverageSubjects(defaultArgs).map((s) => s.technique)).toEqual([
      undefined,
      'T1110.003',
      'T1110',
    ]);
  });

  it('returns report-intent data sources without the endpoint padding', () => {
    expect(deriveCleanCoverageSubjects(defaultArgs)[0].dataSources).toEqual([
      'logs-aws.cloudtrail-*',
    ]);
  });

  it('gives the technique subject its own executed query', () => {
    expect(
      deriveCleanCoverageSubjects(defaultArgs).find((s) => s.technique === 'T1110')?.validatedEsql
    ).toBe(SPRAY_SUBTECHNIQUE_ESQL);
  });

  it('gives the report-scoped subject the highest-confidence query', () => {
    expect(deriveCleanCoverageSubjects(defaultArgs)[0].validatedEsql).toBe(SPRAY_ESQL);
  });

  it('flags every query as executed_no_rows', () => {
    expect(deriveCleanCoverageSubjects(defaultArgs).map((s) => s.esqlStatus)).toEqual([
      'executed_no_rows',
      'executed_no_rows',
      'executed_no_rows',
    ]);
  });

  it('leads the threat summary with the report quote behind the top behavior', () => {
    expect(
      deriveCleanCoverageSubjects(defaultArgs)[0].threatSummary?.startsWith(
        'ConsoleLogin failures across eu-central-1 from a small set of source IPs.\n'
      )
    ).toBe(true);
  });

  it('follows the quote with the report title, techniques, indicators, and vendor', () => {
    expect(deriveCleanCoverageSubjects(defaultArgs)[0].threatSummary).toContain(
      'Techniques: T1110.003\nIndicators: ip: 203.0.113.60, ip: 203.0.113.61, email: signin-watch@lab-demo.test\nVendor/product: Amazon'
    );
  });

  it('prefixes a technique subject headline with the technique name', () => {
    expect(
      deriveCleanCoverageSubjects(defaultArgs).find((s) => s.technique === 'T1110.003')?.title
    ).toBe('Password Spraying: Sign-in watch bulletin: ConsoleLogin failures across eu-central-1');
  });

  it('uses the report title alone as the report-scoped headline', () => {
    expect(deriveCleanCoverageSubjects(defaultArgs)[0].title).toBe(
      'Sign-in watch bulletin: ConsoleLogin failures across eu-central-1'
    );
  });

  it('puts the longer report excerpt last in content', () => {
    expect(
      deriveCleanCoverageSubjects(defaultArgs)[0].content.endsWith(
        'Report excerpt:\nAnalysts observed repeated console sign-in failures.'
      )
    ).toBe(true);
  });

  it('states the query status in content without the query text', () => {
    expect(deriveCleanCoverageSubjects(defaultArgs)[0].content).toContain(
      'ES|QL: executed_no_rows, 0 rows, 2 behaviors executed'
    );
  });

  it('does not flag a confirmed hit', () => {
    expect(deriveCleanCoverageSubjects(defaultArgs).every((s) => !s.hasConfirmedHit)).toBe(true);
  });

  describe('without coordinator inputs', () => {
    const noInputs = { ...defaultArgs, inputs: {} };

    it('returns only the report-scoped subject', () => {
      expect(deriveCleanCoverageSubjects(noInputs)).toHaveLength(1);
    });

    it('falls back to a vendor wildcard for the data source', () => {
      expect(deriveCleanCoverageSubjects(noInputs)[0].dataSources).toEqual(['logs-aws.*']);
    });

    it('omits the query', () => {
      expect(deriveCleanCoverageSubjects(noInputs)[0].validatedEsql).toBeUndefined();
    });

    it('says in content that no behavior executed', () => {
      expect(deriveCleanCoverageSubjects(noInputs)[0].content).toContain(
        'ES|QL: omitted: no behavior executed'
      );
    });
  });

  it('omits data sources when there are no inputs and the report names no vendor', () => {
    expect(
      deriveCleanCoverageSubjects({
        ...defaultArgs,
        inputs: {},
        reportContext: { title: 'Bulletin' },
      })[0].dataSources
    ).toEqual([]);
  });

  it('keeps a thin report from losing its body: a title-only report gets a body lead-in', () => {
    expect(
      deriveCleanCoverageSubjects({
        ...defaultArgs,
        inputs: {},
        reportContext: { title: 'Bulletin', bodyText: 'The campaign targets console logins.' },
      })[0].threatSummary
    ).toBe('Bulletin\nThe campaign targets console logins.');
  });
});
