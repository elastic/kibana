/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deriveCoverageSubjects } from './derive_coverage_subjects';
import type { CoverageSubjectState } from './derive_coverage_subjects';
import type { CurrentRunFinding } from './types';

const ASSUME_ROLE_ESQL =
  'FROM logs-aws.cloudtrail-*\n| WHERE event.action == "AssumeRole"\n| LIMIT 25';
const CLOUDTRAIL_BACKING = '.ds-logs-aws.cloudtrail-default-2026.10.08-000001';
const WINDOW = { from: '2026-09-08T17:48:43.364Z', to: '2026-10-08T17:48:43.364Z' };

const finding = (overrides: Partial<CurrentRunFinding> = {}): CurrentRunFinding => ({
  title: 'Hunt: Cloud Accounts (T1078.004) [ti-repor]',
  hypothesis: 'Brief on T1078.004 AssumeRole into escalated-role in 123456789012.',
  severity: 'critical',
  corroboratedTechniqueId: 'T1078.004',
  eventRefs: [
    { index: CLOUDTRAIL_BACKING, techniqueId: 'T1078.004' },
    { index: CLOUDTRAIL_BACKING, techniqueId: 'T1078.004' },
  ],
  tier1Indices: [],
  behaviors: [
    {
      techniqueId: 'T1078.004',
      techniqueName: 'Cloud Accounts',
      confidence: 0.85,
      validatedEsql: ASSUME_ROLE_ESQL,
      rowCount: 2,
      hit: true,
    },
  ],
  tier2Targets: ['logs-aws.cloudtrail-*', 'logs-endpoint.events.process-*'],
  actionableIndices: ['logs-endpoint.events.process-*'],
  window: WINDOW,
  evidenceLines: ['Tier 2 executed T1078.004 with 2 required-index row(s).'],
  hosts: ['WIN-ANALYST01'],
  users: ['escalated-role'],
  ...overrides,
});

const hitState = (overrides: Partial<CoverageSubjectState> = {}): CoverageSubjectState => ({
  reportId: 'ti-report-aws-iam-behavior-only-historic-10',
  hasConfirmedHit: true,
  techniques: ['T1078.004'],
  corroboratedTechniques: ['T1078.004'],
  findings: [finding()],
  techniqueNames: { 'T1078.004': 'Cloud Accounts' },
  window: WINDOW,
  severity: 'critical',
  investigationSummary: 'Outcome: confirmed hit (tier2).',
  ...overrides,
});

const derive = (state: CoverageSubjectState) =>
  deriveCoverageSubjects({
    spaceId: 'default',
    investigationConversationId: 'conv-1',
    state,
  });

describe('deriveCoverageSubjects', () => {
  describe('a corroborated technique on a hit run', () => {
    it('returns a headline naming the technique and what was tested', () => {
      expect(derive(hitState())[0].title).toBe(
        'Cloud Accounts: Brief on T1078.004 AssumeRole into escalated-role in 123456789012'
      );
    });

    it('returns a one-sentence description naming the outcome and the technique', () => {
      expect(derive(hitState())[0].description).toBe(
        'Confirmed in environment. Coverage review needed for Cloud Accounts (T1078.004).'
      );
    });

    it('returns the hypothesis as the threat summary', () => {
      expect(derive(hitState())[0].threatSummary).toBe(
        'Brief on T1078.004 AssumeRole into escalated-role in 123456789012.'
      );
    });

    it('returns the dataset pattern the hit events landed in', () => {
      expect(derive(hitState())[0].dataSources).toEqual(['logs-aws.cloudtrail-*']);
    });

    it('returns the executed query', () => {
      expect(derive(hitState())[0].validatedEsql).toBe(ASSUME_ROLE_ESQL);
    });

    it('returns executed_hit as the query status', () => {
      expect(derive(hitState())[0].esqlStatus).toBe('executed_hit');
    });

    it('opens content with the threat story', () => {
      expect(derive(hitState())[0].content.startsWith('Threat:\nBrief on T1078.004')).toBe(true);
    });

    it('lists the data sources in content', () => {
      expect(derive(hitState())[0].content).toContain('Data sources: logs-aws.cloudtrail-*');
    });

    it('states the query status and window in content', () => {
      expect(derive(hitState())[0].content).toContain(
        'ES|QL: executed_hit, 2 rows, window 2026-09-08 → 2026-10-08'
      );
    });

    it('does not repeat the query text in content', () => {
      expect(derive(hitState())[0].content).not.toContain('event.action == "AssumeRole"');
    });

    it('does not carry a report excerpt when the finding has a hypothesis', () => {
      expect(derive(hitState())[0].content).not.toContain('Report excerpt:');
    });

    it('does not put the report id in the title or description', () => {
      const [subject] = derive(hitState());

      expect(`${subject.title} ${subject.description}`).not.toContain('ti-report');
    });

    it('flags the subject as a confirmed hit', () => {
      expect(derive(hitState())[0].hasConfirmedHit).toBe(true);
    });
  });

  it('never takes a data source from an alert-shaped index', () => {
    const [subject] = derive(
      hitState({
        findings: [
          finding({
            eventRefs: [
              { index: CLOUDTRAIL_BACKING, techniqueId: 'T1078.004' },
              {
                index: '.ds-logs-endpoint.alerts-default-2026.10.08-000001',
                techniqueId: 'T1078.004',
              },
            ],
          }),
        ],
      })
    );

    expect(subject.dataSources).toEqual(['logs-aws.cloudtrail-*']);
  });

  it('uses the first sentence of the hypothesis when the stripped title is only the technique label', () => {
    expect(
      derive(hitState({ findings: [finding({ title: 'Hunt: Cloud Accounts (T1078.004)' })] }))[0]
        .title
    ).toBe('Cloud Accounts: Brief on T1078.004 AssumeRole into escalated-role in 123456789012');
  });

  describe('a technique that was only proposed on a hit run', () => {
    const proposedState = () =>
      hitState({
        techniques: ['T1078.004', 'T1021.001'],
        corroboratedTechniques: ['T1078.004'],
        findings: [finding({ corroboratedTechniqueId: undefined })],
        coordinator: {
          tier2Targets: ['logs-aws.cloudtrail-*', 'logs-endpoint.events.process-*'],
          actionableIndices: ['logs-endpoint.events.process-*'],
        },
      });

    it('does not claim a confirmed hit', () => {
      expect(
        derive(proposedState()).find((s) => s.technique === 'T1021.001')?.hasConfirmedHit
      ).toBe(false);
    });

    it('takes its data sources from the report-intent targets, not from the other technique events', () => {
      expect(derive(proposedState()).find((s) => s.technique === 'T1021.001')?.dataSources).toEqual(
        ['logs-aws.cloudtrail-*']
      );
    });

    it('describes the outcome as no environment hit', () => {
      expect(derive(proposedState()).find((s) => s.technique === 'T1021.001')?.description).toBe(
        'No environment hit in the hunt window. Coverage review needed for T1021.001.'
      );
    });
  });

  it('falls back to a report-scoped subject when the run named no techniques', () => {
    const subjects = derive(
      hitState({
        techniques: [],
        corroboratedTechniques: [],
        findings: [finding({ corroboratedTechniqueId: undefined })],
      })
    );

    expect(subjects.map((s) => s.technique)).toEqual([undefined]);
  });

  it('describes a report-scoped subject without a technique', () => {
    const [subject] = derive(
      hitState({
        techniques: [],
        corroboratedTechniques: [],
        findings: [finding({ corroboratedTechniqueId: undefined })],
      })
    );

    expect(subject.description).toBe(
      'Confirmed in environment. Coverage review needed for the reported behavior.'
    );
  });

  it('adds the report excerpt when the finding has no hypothesis and the report was loaded', () => {
    const [subject] = derive(
      hitState({
        findings: [finding({ hypothesis: undefined })],
        reportContext: {
          title: 'CloudTrail brief',
          bodyText: 'AssumeRole into a shadow admin role.',
        },
      })
    );

    expect(subject.content).toContain('Report excerpt:\nAssumeRole into a shadow admin role.');
  });

  it('carries the caller-resolved severity and investigation summary', () => {
    expect(derive(hitState())[0]).toMatchObject({
      severity: 'critical',
      investigationSummary: 'Outcome: confirmed hit (tier2).',
    });
  });

  it('gives each technique its own data sources and query', () => {
    const subjects = derive(
      hitState({
        techniques: ['T1078.004', 'T1110.003'],
        corroboratedTechniques: ['T1078.004', 'T1110.003'],
        findings: [
          finding(),
          finding({
            corroboratedTechniqueId: 'T1110.003',
            title: 'Hunt: Password Spraying (T1110.003) [ti-repor]',
            eventRefs: [
              { index: '.ds-logs-okta.system-default-2026.10.08-000001', techniqueId: 'T1110.003' },
            ],
            behaviors: [
              {
                techniqueId: 'T1110.003',
                confidence: 0.9,
                validatedEsql: 'FROM logs-okta.system-*\n| LIMIT 5',
                rowCount: 1,
                hit: true,
              },
            ],
          }),
        ],
      })
    );

    expect(subjects.map((s) => [s.technique, s.dataSources, s.validatedEsql])).toEqual([
      ['T1078.004', ['logs-aws.cloudtrail-*'], ASSUME_ROLE_ESQL],
      ['T1110.003', ['logs-okta.system-*'], 'FROM logs-okta.system-*\n| LIMIT 5'],
    ]);
  });

  describe('hit events and data sources', () => {
    const PACK_INDEX = 'logs-endpoint.events.c4d1e7d4.2026.10.08';

    it('prefers the events matched to the technique over unmatched shared IOC events', () => {
      const [subject] = derive(
        hitState({
          findings: [
            finding({
              eventRefs: [
                { index: CLOUDTRAIL_BACKING },
                {
                  index: '.ds-logs-endpoint.events.process-default-2026.10.08-000001',
                  techniqueId: 'T1078.004',
                },
              ],
            }),
          ],
        })
      );

      expect(subject.dataSources).toEqual(['logs-endpoint.events.process-*']);
    });

    it('omits data sources when the technique hit events that name no dataset', () => {
      const [subject] = derive(
        hitState({
          findings: [finding({ eventRefs: [{ index: PACK_INDEX, techniqueId: 'T1078.004' }] })],
          coordinator: {
            tier2Targets: ['logs-aws.cloudtrail-*'],
            actionableIndices: [],
          },
        })
      );

      expect(subject.dataSources).toEqual([]);
    });
  });

  describe('a finding with the generic mapper title', () => {
    const genericState = () =>
      hitState({
        techniques: [],
        corroboratedTechniques: [],
        findings: [
          finding({
            title: 'Hunt confirmed for ti-report-aws-iam-ioc-only-historic-10',
            hypothesis: undefined,
            corroboratedTechniqueId: undefined,
            behaviors: [],
          }),
        ],
        reportContext: { title: 'Indicator bulletin: mailbox and IP join keys' },
      });

    it('uses the report title as the headline', () => {
      expect(derive(genericState())[0].title).toBe('Indicator bulletin: mailbox and IP join keys');
    });

    it('does not put the report id in the headline', () => {
      expect(derive(genericState())[0].title).not.toContain('ti-report');
    });
  });
});
