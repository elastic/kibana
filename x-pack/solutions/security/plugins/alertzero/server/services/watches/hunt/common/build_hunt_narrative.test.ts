/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HuntForThreatResult } from '@kbn/alertzero-common';
import {
  buildHuntHeadline,
  buildHuntNarrative,
  MAX_HUNT_NARRATIVE_CHARS,
} from './build_hunt_narrative';
import type {
  HuntCoordinatorCoreResult,
  HuntCoordinatorTier1,
  HuntCoordinatorTier2,
} from '../hunt_coordinator';
import type { ValidatedBehavior } from '../tier2/types';

const window = { from: '2026-08-26T00:00:00.000Z', to: '2026-09-25T00:00:00.000Z' };

const tier1 = (overrides: Partial<HuntForThreatResult> = {}): HuntCoordinatorTier1 => ({
  tier: 1,
  status: 'no_environment_hits',
  has_confirmed_hit: false,
  searched_iocs: 0,
  searched_techniques: 0,
  resolved_iocs: [],
  resolved_techniques: [],
  time_range: window,
  counts: { total_hits: 0, returned_hits: 0, affected_hosts: 0, affected_users: 0 },
  hits: [],
  affected_assets: { hosts: [], users: [], services: [] },
  per_index: [],
  ...overrides,
});

const behavior = (overrides: Partial<ValidatedBehavior> = {}): ValidatedBehavior => ({
  technique_id: 'T1078.004',
  technique_name: 'Cloud Accounts',
  evidence_quote: 'sts.AssumeRole into escalated-role',
  llm_confidence: 0.9,
  confidence: 0.9,
  reference: 'https://attack.mitre.org/techniques/T1078/004/',
  tactic_ids: ['TA0004'],
  validated_esql: 'FROM logs-aws.* | WHERE event.action == "AssumeRole"',
  title: 'AssumeRole into escalated-role',
  severity: 'critical',
  risk_score: 90,
  execution: { executed: true, row_count: 5, hit: true },
  affected_hosts: ['WIN-ANALYST01'],
  affected_users: ['dev-user', 'escalated-role'],
  ...overrides,
});

const tier2 = (
  behaviors: ValidatedBehavior[],
  overrides: Partial<HuntCoordinatorTier2> = {}
): HuntCoordinatorTier2 => ({
  tier: 2,
  status: behaviors.length > 0 ? 'behaviors_proposed' : 'no_behaviors_found',
  behaviors,
  indexed_behaviors: [],
  has_hit: behaviors.some((b) => b.execution?.hit),
  next_step: 'n/a',
  ...overrides,
});

const result = (overrides: Partial<HuntCoordinatorCoreResult> = {}): HuntCoordinatorCoreResult => ({
  status: 'tier1_and_tier2',
  report_id: 'ti-report-aws-iam-historic-01',
  run_id: 'run-1',
  index_patterns: ['logs-*', '-logs-elastic_agent*'],
  tier2_targets: ['logs-aws.cloudtrail-*', 'logs-endpoint.events.process-*'],
  tier2_target_sources: ['report_match', 'tier1_hits', 'actionable'],
  report_intent_targets: [],
  actionable_indices: ['logs-endpoint.events.process-*'],
  tier1: tier1(),
  message: 'Tier 1: no_environment_hits.',
  next_step: 'n/a',
  has_confirmed_hit: false,
  completeness: 'complete',
  completed_successfully: true,
  ...overrides,
});

const hitTier1 = (): HuntCoordinatorTier1 =>
  tier1({
    status: 'environment_hits_found',
    has_confirmed_hit: true,
    searched_iocs: 3,
    searched_techniques: 2,
    resolved_iocs: [
      { type: 'ip', value: '192.0.2.30' },
      { type: 'ip', value: '192.0.2.31' },
      { type: 'email', value: 'dev-user@corp.example' },
    ],
    resolved_techniques: ['T1078.004', 'T1562.008'],
    counts: { total_hits: 121, returned_hits: 25, affected_hosts: 2, affected_users: 1 },
    hits: [
      {
        id: 'e1',
        index: 'logs-aws.cloudtrail.2026.09.25',
        matched: { ioc: { type: 'ip', value: '192.0.2.30' }, field: 'source.ip' },
      },
      {
        id: 'a1',
        index: '.internal.alerts-security.alerts-default-000001',
        matched: { technique_id: 'T1078.004' },
      },
    ],
    affected_assets: {
      hosts: [
        { name: 'WIN-ANALYST01', hit_count: 20 },
        { name: 'ci-runner-03', hit_count: 4 },
      ],
      users: [{ name: 'dev-user', hit_count: 18 }],
      services: [{ name: 'escalated-role', hit_count: 6 }],
    },
    per_index: [
      { index: 'logs-aws.cloudtrail.2026.09.25', hit_count: 20, required: true },
      {
        index: '.internal.alerts-security.alerts-default-000001',
        hit_count: 33,
        required: true,
      },
      {
        index: 'logs-endpoint.events.f56865fe.2026.09.25',
        hit_count: 68,
        required: true,
      },
    ],
  });

const ctx = {
  reportTitle: 'CloudTrail retrospective: AdministratorAccess attach',
};

const TECHNOLOGY_WORD = /technolog/i;

describe('buildHuntNarrative', () => {
  it('tells the Tier 1 and Tier 2 story for a run both tiers confirmed, as markdown sections', () => {
    const narrative = buildHuntNarrative(
      result({
        tier1: hitTier1(),
        tier2: tier2([
          behavior(),
          behavior({
            technique_id: 'T1562.008',
            technique_name: 'Disable or Modify Cloud Logs',
            title: 'StopLogging',
            execution: { executed: true, row_count: 0, hit: false },
          }),
        ]),
        has_confirmed_hit: true,
      }),
      ctx
    );

    expect(narrative).toBe(
      [
        '### Hunt Watch confirmed a hit',
        'Hunt Watch confirmed a hit for threat report **"CloudTrail retrospective: AdministratorAccess attach"** (`ti-report-aws-iam-historic-01`): Tier 1 matched the report\'s indicators in the environment and Tier 2 confirmed 1 behavior derived from the report text.',
        [
          '**What was searched**',
          '- **Window:** 2026-08-26T00:00:00.000Z to 2026-09-25T00:00:00.000Z',
          '- **Indices:** `logs-*` and `-logs-elastic_agent*`',
          "- **Tier 2 targets:** `logs-aws.cloudtrail-*` and `logs-endpoint.events.process-*` (from the report's vendor or product, Tier 1 hits and process telemetry)",
          '- **Indicators (3):** ip `192.0.2.30` and `192.0.2.31`; email `dev-user@corp.example`',
          '- **ATT&CK techniques (2):** `T1078.004` and `T1562.008`',
        ].join('\n'),
        [
          '**Tier 1: indicator and technique search**',
          'Tier 1 matched 121 documents across 3 indices, which confirms the hit.',
          '- `logs-endpoint.events.f56865fe.2026.09.25`: 68',
          '- `.internal.alerts-security.alerts-default-000001`: 33',
          '- `logs-aws.cloudtrail.2026.09.25`: 20',
          '- **Indicators seen in the sample:** `192.0.2.30`',
          '- **Alerts tagged with:** `T1078.004`',
          '- **Affected hosts:** `WIN-ANALYST01` (20) and `ci-runner-03` (4)',
          '- **Affected users:** `dev-user` (18)',
          '- **Affected services:** `escalated-role` (6)',
        ].join('\n'),
        [
          '**Tier 2: behavior hunts derived from the report**',
          'Tier 2 derived 2 behaviors from the report text and validated them against the ATT&CK catalog; 2 executed as ES|QL against the Tier 2 targets and 1 matched live activity.',
          '- **T1078.004 Cloud Accounts** ("AssumeRole into escalated-role", critical, confidence 90%): executed and matched 5 rows involving host `WIN-ANALYST01` and users `dev-user` and `escalated-role`.',
          '- **T1562.008 Disable or Modify Cloud Logs** ("StopLogging", critical, confidence 90%): executed and matched no rows in the hunt window.',
        ].join('\n'),
        '_Hunt run `run-1`._',
      ].join('\n\n')
    );
    expect(narrative).not.toMatch(TECHNOLOGY_WORD);
  });

  it('names the Tier 2 target sources on the searched section', () => {
    const narrative = buildHuntNarrative(
      result({
        tier1: hitTier1(),
        tier2: tier2([]),
        tier2_targets: ['logs-aws.cloudtrail-*'],
        tier2_target_sources: ['model'],
        report_intent_targets: [],
        has_confirmed_hit: true,
      }),
      ctx
    );

    expect(narrative).toContain(
      '- **Tier 2 targets:** `logs-aws.cloudtrail-*` (from a model match)'
    );
    expect(narrative).not.toMatch(TECHNOLOGY_WORD);
  });

  it('names a Tier 1 only hit and says Tier 2 found nothing to execute', () => {
    const narrative = buildHuntNarrative(
      result({ tier1: hitTier1(), tier2: tier2([]), has_confirmed_hit: true }),
      ctx
    );

    expect(narrative).toContain(
      "Tier 1 matched the report's indicators in the environment. Tier 2 derived no executable behaviors from the report text."
    );
    expect(narrative).toContain(
      '**Tier 2: behavior hunts derived from the report**\nTier 2 read the report text and derived no behaviors to hunt.'
    );
    expect(narrative).not.toMatch(TECHNOLOGY_WORD);
  });

  it('names a Tier 2 only hit when Tier 1 found nothing', () => {
    const narrative = buildHuntNarrative(
      result({
        tier1: tier1({ resolved_techniques: ['T1078.004'], searched_techniques: 1 }),
        tier2: tier2([behavior()]),
        has_confirmed_hit: true,
      }),
      ctx
    );

    expect(narrative).toContain(
      'Tier 1 found no indicator matches, but Tier 2 confirmed 1 behavior derived from the report text.'
    );
    expect(narrative).toContain(
      '**Tier 1: indicator and technique search**\nTier 1 found no documents matching those indicators or techniques in the window.'
    );
    expect(narrative).toContain('- **Indicators:** none searchable');
    expect(narrative).not.toMatch(TECHNOLOGY_WORD);
  });

  it('explains every Tier 2 skip reason in plain words under the Tier 2 heading', () => {
    const skipped = (reason: HuntCoordinatorCoreResult['tier2_skipped_reason']) =>
      buildHuntNarrative(result({ status: 'tier1_only', tier2_skipped_reason: reason }), ctx);

    expect(skipped('configured_never')).toContain(
      '**Tier 2: behavior hunts derived from the report**\nTier 2 behavior hunting was turned off for this run.'
    );
    expect(skipped('no_environment_hits')).toContain('only escalates to Tier 2 on a hit');
    expect(skipped('no_inference')).toContain('no GenAI connector was available');
    expect(skipped('no_report_text')).toContain('no body text to derive behaviors from');
    expect(skipped('no_searchable_input')).toContain('exposed nothing to search for');
    expect(skipped('no_tier2_targets')).toContain(
      'no index could be chosen for it: the report matched no dataset, Tier 1 hit no index, and no index in the default data view carries process telemetry'
    );
  });

  it('carries the Tier 2 failure message when Tier 2 threw', () => {
    const narrative = buildHuntNarrative(
      result({
        status: 'tier1_only',
        tier1: hitTier1(),
        tier2_skipped_reason: 'tier2_failed',
        message: 'Tier 1: environment_hits_found. Tier 2 failed: connector timeout',
        has_confirmed_hit: true,
        completed_successfully: false,
      }),
      ctx
    );

    expect(narrative).toContain(
      'Tier 2 behavior hunting failed before it could finish. Tier 1: environment_hits_found. Tier 2 failed: connector timeout'
    );
  });

  it('says nothing was searched when the scope is blocked', () => {
    const narrative = buildHuntNarrative(
      result({
        status: 'blocked',
        index_patterns: [],
        tier2_targets: [],
        tier2_target_sources: [],
        report_intent_targets: [],
        actionable_indices: [],
        tier1: tier1({ status: 'scope_blocked' }),
        tier2_skipped_reason: 'scope_blocked',
        completed_successfully: false,
      }),
      ctx
    );

    expect(narrative).toBe(
      [
        '### Hunt Watch could not hunt this report',
        'Hunt Watch could not hunt threat report **"CloudTrail retrospective: AdministratorAccess attach"** (`ti-report-aws-iam-historic-01`): no index in the space\'s default data view is visible to this hunt, so nothing was searched.',
        '_Hunt run `run-1`._',
      ].join('\n\n')
    );
    expect(narrative).not.toMatch(TECHNOLOGY_WORD);
  });

  it('says the report was not visible when it was not found', () => {
    const narrative = buildHuntNarrative(
      result({
        status: 'tier1_only',
        index_patterns: [],
        tier2_targets: [],
        tier2_target_sources: [],
        report_intent_targets: [],
        actionable_indices: [],
        tier1: tier1({ status: 'no_searchable_terms' }),
        tier2_skipped_reason: 'report_not_found',
        completed_successfully: false,
      })
    );

    expect(narrative).toContain(
      'Hunt Watch could not hunt threat report `ti-report-aws-iam-historic-01`: the report is not visible in this space, so nothing was searched.'
    );
  });

  it('falls back to the report id when no title is known', () => {
    const narrative = buildHuntNarrative(result({ tier2: tier2([]) }));

    expect(narrative).toContain(
      'Hunt Watch found no confirmed hits for threat report `ti-report-aws-iam-historic-01`.'
    );
    expect(narrative).not.toMatch(TECHNOLOGY_WORD);
  });

  it('narrates at most eight behaviors and counts the rest', () => {
    const twelve = Array.from({ length: 12 }, (_, i) => behavior({ technique_id: `T${1000 + i}` }));
    const narrative = buildHuntNarrative(
      result({ tier1: hitTier1(), tier2: tier2(twelve), has_confirmed_hit: true }),
      ctx
    );

    expect(narrative).toContain('**T1007 Cloud Accounts**');
    expect(narrative).not.toContain('**T1008 Cloud Accounts**');
    expect(narrative).toContain('- 4 further behaviors are recorded on the attached findings.');
  });

  it('caps the narrative under the journal note limit', () => {
    const many = Array.from({ length: 100 }, (_, i) =>
      behavior({
        technique_id: `T${1000 + i}`,
        title: 'x'.repeat(400),
        affected_hosts: Array.from({ length: 6 }, (__, j) => `host-${i}-${j}-${'y'.repeat(60)}`),
      })
    );
    const narrative = buildHuntNarrative(
      result({ tier1: hitTier1(), tier2: tier2(many), has_confirmed_hit: true }),
      ctx
    );

    expect(narrative.length).toBeLessThanOrEqual(MAX_HUNT_NARRATIVE_CHARS);
    expect(narrative.endsWith('…')).toBe(true);
  });
});

describe('buildHuntHeadline', () => {
  it('summarizes a run both tiers confirmed', () => {
    expect(
      buildHuntHeadline(
        result({
          tier1: hitTier1(),
          tier2: tier2([
            behavior(),
            behavior({ execution: { executed: true, row_count: 0, hit: false } }),
          ]),
          has_confirmed_hit: true,
        })
      )
    ).toBe('confirmed hit: Tier 1 matched 121 documents; Tier 2 confirmed 1 of 2 behaviors');
  });

  it('summarizes a clean run with a skipped Tier 2', () => {
    expect(
      buildHuntHeadline(
        result({ status: 'tier1_only', tier2_skipped_reason: 'no_environment_hits' })
      )
    ).toBe('no confirmed hits: Tier 1 found no matches; Tier 2 skipped');
  });

  it('summarizes Tier 1 matches without optional-only wording', () => {
    expect(
      buildHuntHeadline(
        result({
          tier1: tier1({
            status: 'environment_hits_found',
            counts: { total_hits: 5, returned_hits: 5, affected_hosts: 1, affected_users: 0 },
          }),
          tier2: tier2([]),
        })
      )
    ).toBe('no confirmed hits: Tier 1 matched 5 documents; Tier 2 derived no behaviors');
  });

  it('names a blocked scope and a missing report', () => {
    expect(
      buildHuntHeadline(
        result({
          status: 'blocked',
          index_patterns: [],
          tier2_targets: [],
          tier2_target_sources: [],
          report_intent_targets: [],
          actionable_indices: [],
          tier2_skipped_reason: 'scope_blocked',
        })
      )
    ).toBe("hunt blocked, no index in the space's default data view is visible to this hunt");
    expect(
      buildHuntHeadline(result({ status: 'tier1_only', tier2_skipped_reason: 'report_not_found' }))
    ).toBe('hunt failed, the report is not visible in this space');
  });
});
