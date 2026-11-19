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
  message: 'IOC Hunt: no_environment_hits.',
  next_step: 'n/a',
  has_confirmed_hit: false,
  completeness: 'complete',
  completed_successfully: true,
  ...overrides,
});

const hitTier1 = (overrides: Partial<HuntForThreatResult> = {}): HuntCoordinatorTier1 =>
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
    ...overrides,
  });

const ctx = {
  reportTitle: 'CloudTrail retrospective: AdministratorAccess attach',
};

const TECHNOLOGY_WORD = /technolog/i;

describe('buildHuntNarrative', () => {
  it('lists every IOC from matched.iocs when present on the sample hits', () => {
    const narrative = buildHuntNarrative(
      result({
        tier1: hitTier1({
          hits: [
            {
              id: 'e1',
              index: 'logs-aws.cloudtrail.2026.09.25',
              matched: {
                ioc: { type: 'ip', value: '192.0.2.30' },
                field: 'source.ip',
                iocs: [
                  { type: 'ip', value: '192.0.2.30', field: 'source.ip' },
                  { type: 'ip', value: '192.0.2.31', field: 'destination.ip' },
                ],
              },
            },
          ],
        }),
        has_confirmed_hit: true,
      }),
      ctx
    );

    expect(narrative).toContain(
      '- **Indicators seen in the sample:** `192.0.2.30` and `192.0.2.31`'
    );
  });

  it('tells the IOC Hunt and Behavior Hunt story for a run both tiers confirmed, as markdown sections', () => {
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
        'Hunt Watch confirmed a hit for threat report **"CloudTrail retrospective: AdministratorAccess attach"** (`ti-report-aws-iam-historic-01`): IOC Hunt matched the report\'s indicators in the environment and Behavior Hunt confirmed 1 behavior derived from the report text.',
        [
          '**What was searched**',
          '- **Window:** 2026-08-26T00:00:00.000Z to 2026-09-25T00:00:00.000Z',
          '- **Indices:** `logs-*` and `-logs-elastic_agent*`',
          "- **Behavior Hunt targets:** `logs-aws.cloudtrail-*` and `logs-endpoint.events.process-*` (from the report's vendor or product, IOC Hunt hits and process telemetry)",
          '- **Indicators (3):** ip `192.0.2.30` and `192.0.2.31`; email `dev-user@corp.example`',
          '- **ATT&CK techniques (2):** `T1078.004` and `T1562.008`',
        ].join('\n'),
        [
          '**IOC Hunt: indicator and technique search**',
          'IOC Hunt matched 121 documents across 3 indices, which confirms the hit.',
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
          '**Behavior Hunt: behaviors derived from the report**',
          'Behavior Hunt derived 2 behaviors from the report text and validated them against the ATT&CK catalog; 2 executed as ES|QL against the Behavior Hunt targets and 1 matched live activity.',
          '- **T1078.004 Cloud Accounts** ("AssumeRole into escalated-role", critical, confidence 90%): executed and matched 5 rows involving host `WIN-ANALYST01` and users `dev-user` and `escalated-role`.',
          '- **T1562.008 Disable or Modify Cloud Logs** ("StopLogging", critical, confidence 90%): executed and matched no rows in the hunt window.',
        ].join('\n'),
        '_Hunt run `run-1`._',
      ].join('\n\n')
    );
    expect(narrative).not.toMatch(TECHNOLOGY_WORD);
  });

  it('names the Behavior Hunt target sources on the searched section', () => {
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
      '- **Behavior Hunt targets:** `logs-aws.cloudtrail-*` (from a model match)'
    );
    expect(narrative).not.toMatch(TECHNOLOGY_WORD);
  });

  it('names an IOC Hunt only hit and says Behavior Hunt found nothing to execute', () => {
    const narrative = buildHuntNarrative(
      result({ tier1: hitTier1(), tier2: tier2([]), has_confirmed_hit: true }),
      ctx
    );

    expect(narrative).toContain(
      "IOC Hunt matched the report's indicators in the environment. Behavior Hunt derived no executable behaviors from the report text."
    );
    expect(narrative).toContain(
      '**Behavior Hunt: behaviors derived from the report**\nBehavior Hunt read the report text and derived no behaviors to hunt.'
    );
    expect(narrative).not.toMatch(TECHNOLOGY_WORD);
  });

  it('names a Behavior Hunt only hit when IOC Hunt found nothing', () => {
    const narrative = buildHuntNarrative(
      result({
        tier1: tier1({ resolved_techniques: ['T1078.004'], searched_techniques: 1 }),
        tier2: tier2([behavior()]),
        has_confirmed_hit: true,
      }),
      ctx
    );

    expect(narrative).toContain(
      'IOC Hunt found no indicator matches, but Behavior Hunt confirmed 1 behavior derived from the report text.'
    );
    expect(narrative).toContain(
      '**IOC Hunt: indicator and technique search**\nIOC Hunt found no documents matching those indicators or techniques in the window.'
    );
    expect(narrative).toContain('- **Indicators:** none searchable');
    expect(narrative).not.toMatch(TECHNOLOGY_WORD);
  });

  it('names adjudicated-out indicators in What was searched when excluded_report_iocs is set', () => {
    expect(
      buildHuntNarrative(
        result({
          excluded_report_iocs: { count: 1 },
        }),
        ctx
      )
    ).toContain('- **Not searched (adjudicated out):** 1 indicator');
  });

  it('pluralizes the adjudicated-out indicators line', () => {
    expect(
      buildHuntNarrative(
        result({
          excluded_report_iocs: { count: 2 },
        }),
        ctx
      )
    ).toContain('- **Not searched (adjudicated out):** 2 indicators');
  });

  it('omits the adjudicated-out line when excluded_report_iocs is absent', () => {
    expect(buildHuntNarrative(result({}), ctx)).not.toContain('Not searched (adjudicated out)');
  });

  it('explains no_searchable_terms as adjudication when excluded indicators remain', () => {
    expect(
      buildHuntNarrative(
        result({
          tier1: tier1({ status: 'no_searchable_terms', resolved_iocs: [], searched_iocs: 0 }),
          excluded_report_iocs: { count: 7 },
        }),
        ctx
      )
    ).toContain(
      'IOC Hunt had nothing to search: no eligible indicators remained (7 indicators excluded by adjudication) and the report exposed no searchable techniques.'
    );
  });

  it('names the model tiers that were unavailable when Behavior Hunt could not run for want of a model', () => {
    const narrative = buildHuntNarrative(
      result({
        status: 'tier1_only',
        tier2_skipped_reason: 'no_inference',
        unavailable_model_tiers: ['efficient', 'balanced', 'frontier'],
      }),
      ctx
    );

    // Efficient and Balanced are unavailable too, but Tier 2 has no consumer for either, so
    // neither is blamed.
    expect(narrative).toContain('no model was available for the Frontier tier');
    expect(narrative).not.toContain('Efficient');
    expect(narrative).not.toContain('Balanced');
  });

  it('says the dataset-match call failed, not that a model is missing, when the skip carries a detail', () => {
    const narrative = buildHuntNarrative(
      result({
        status: 'tier1_only',
        tier2_skipped_reason: 'no_inference',
        tier2_skip_detail: 'connector down',
        unavailable_model_tiers: ['efficient'],
      }),
      ctx
    );

    expect(narrative).toContain(
      'the model call that chooses where to hunt failed (connector down)'
    );
    expect(narrative).not.toContain('no model to choose where to hunt');
    expect(narrative).not.toContain('no GenAI connector');
  });

  it('explains every Behavior Hunt skip reason in plain words under the Behavior Hunt heading', () => {
    const skipped = (reason: HuntCoordinatorCoreResult['tier2_skipped_reason']) =>
      buildHuntNarrative(result({ status: 'tier1_only', tier2_skipped_reason: reason }), ctx);

    expect(skipped('configured_never')).toContain(
      '**Behavior Hunt: behaviors derived from the report**\nBehavior Hunt was turned off for this run.'
    );
    expect(skipped('no_environment_hits')).toContain('only escalates to Behavior Hunt on a hit');
    expect(skipped('no_inference')).toContain('no GenAI connector was available');
    expect(skipped('no_report_text')).toContain('no body text to derive behaviors from');
    expect(skipped('no_searchable_input')).toContain('exposed nothing to search for');
    expect(skipped('no_tier2_targets')).toContain(
      'no index could be chosen for it: the report matched no dataset, IOC Hunt hit no index, and no index in the default data view carries process telemetry'
    );
  });

  it('narrates an unenriched report as terminal, without claiming anything was searched', () => {
    const pending = result({
      status: 'tier1_only',
      index_patterns: [],
      tier2_targets: [],
      tier2_target_sources: [],
      tier1: tier1({ status: 'no_searchable_terms' }),
      tier2_skipped_reason: 'extraction_pending',
      completeness: 'incomplete_retryable',
      completed_successfully: false,
      incomplete: [{ reason: 'extraction_pending', detail: 'not enriched' }],
    });
    const narrative = buildHuntNarrative(pending, ctx);
    const headline = buildHuntHeadline(pending);

    expect(narrative).toContain('Hunt Watch did not hunt this report yet');
    expect(narrative).toContain('not been enriched yet');
    expect(headline).toContain('hunt skipped, the report has not been enriched yet');
    for (const text of [narrative, headline]) {
      expect(text).not.toContain('What was searched');
      expect(text).not.toContain('IOC Hunt had nothing to search');
      expect(text).not.toContain('not visible in this space');
    }
  });

  it('renders the coordinator own coverage gaps on a non-terminal run', () => {
    const narrative = buildHuntNarrative(
      result({
        completeness: 'incomplete_final',
        incomplete: [{ reason: 'input_truncated', detail: 'D' }],
      }),
      ctx
    );

    expect(narrative).toContain('- input truncated: D');
  });

  it('says a retryable run with no hit leaves the report unmarked and eligible', () => {
    const narrative = buildHuntNarrative(
      result({ completeness: 'incomplete_retryable', completed_successfully: false }),
      ctx
    );

    expect(narrative).toContain('the report is not marked as hunted, stays eligible');
  });

  it('says the hit of a retryable run stands, makes no eligibility claim and does not claim the write', () => {
    const narrative = buildHuntNarrative(
      result({
        tier1: hitTier1(),
        has_confirmed_hit: true,
        completeness: 'incomplete_retryable',
        completed_successfully: false,
      }),
      ctx
    );

    expect(narrative).toContain('The confirmed hit stands');
    expect(narrative).not.toContain('recorded on the report');
    expect(narrative).not.toContain('stays eligible');
  });

  it('lists the techniques still to be searched when the run is retryable, and says they are continued', () => {
    const narrative = buildHuntNarrative(
      result({
        completeness: 'incomplete_retryable',
        completed_successfully: false,
        tier2: tier2([], {
          incomplete: [
            { reason: 'generation_budget', detail: 'over budget', technique_id: 'T1059' },
            { reason: 'execute_failed', detail: 'failed', technique_id: 'T1105' },
            { reason: 'collapsed', detail: 'shared', technique_id: 'T1566' },
          ],
        }),
      }),
      ctx
    );

    expect(narrative).toContain('**Still to be searched (2):** `T1059` and `T1105`.');
    expect(narrative).toContain('while the report is still inside the sweep');
    expect(narrative).toContain('techniques this run already searched are not repeated');
    expect(narrative).not.toContain('`T1566`.');
  });

  it('does not promise a later search for a technique the run gave up on', () => {
    const narrative = buildHuntNarrative(
      result({
        completeness: 'incomplete_retryable',
        completed_successfully: false,
        pending_technique_ids: ['T1105'],
        tier2: tier2([], {
          incomplete: [
            { reason: 'generation_budget', detail: 'not returned', technique_id: 'T1059' },
            { reason: 'execute_failed', detail: 'failed', technique_id: 'T1105' },
          ],
        }),
      }),
      ctx
    );

    expect(narrative).toContain('**Still to be searched (1):** `T1105`.');
    expect(narrative).not.toContain('`T1059`.');
    // The gap itself is still reported.
    expect(narrative).toContain('not returned');
  });

  it('lists nothing to continue on a run that is not retryable', () => {
    const narrative = buildHuntNarrative(
      result({
        completeness: 'incomplete_final',
        tier2: tier2([], {
          incomplete: [{ reason: 'collapsed', detail: 'shared', technique_id: 'T1566' }],
        }),
      }),
      ctx
    );

    expect(narrative).not.toContain('Still to be searched');
  });

  it('carries the Behavior Hunt failure message when Behavior Hunt threw', () => {
    const narrative = buildHuntNarrative(
      result({
        status: 'tier1_only',
        tier1: hitTier1(),
        tier2_skipped_reason: 'tier2_failed',
        message: 'IOC Hunt: environment_hits_found. Behavior Hunt failed: connector timeout',
        has_confirmed_hit: true,
        completed_successfully: false,
      }),
      ctx
    );

    expect(narrative).toContain(
      'Behavior Hunt failed before it could finish. IOC Hunt: environment_hits_found. Behavior Hunt failed: connector timeout'
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

describe('buildHuntNarrative when no search ran', () => {
  const NOT_CLEAN = 'This is not a statement that the environment is clean.';
  const nothingSearchedGap = {
    reason: 'nothing_searched' as const,
    detail: 'IOC Hunt mapped no searchable term and Behavior Hunt executed no query.',
  };

  const nothingSearched = (
    overrides: Partial<HuntCoordinatorCoreResult> = {}
  ): HuntCoordinatorCoreResult =>
    result({
      status: 'tier1_only',
      tier1: tier1({ status: 'no_searchable_terms' }),
      tier2_targets: [],
      tier2_target_sources: [],
      incomplete: [nothingSearchedGap],
      completeness: 'incomplete_final',
      ...overrides,
    });

  const expectedText = (reason: string, runId = 'run-1') =>
    `### Hunt Watch searched nothing for this report\n${reason} ${NOT_CLEAN}\n\n_Hunt run \`${runId}\`._`;

  const noIocs = 'The report has nothing IOC Hunt could search';

  it('says Hunt Watch could not work out which indices to search when scope resolution failed', () => {
    const narrative = buildHuntNarrative(
      result({
        status: 'tier1_only',
        index_patterns: [],
        tier2_targets: [],
        tier2_target_sources: [],
        tier1: tier1({ status: 'no_searchable_terms' }),
        completeness: 'incomplete_final',
      }),
      ctx
    );
    expect(narrative).toBe(expectedText('Hunt Watch could not work out which indices to search.'));
  });

  describe('the Behavior Hunt clause, with nothing for IOC Hunt to search', () => {
    const unexecuted = behavior({ execution: { executed: false, row_count: 0, hit: false } });

    it.each([
      [
        '1: behaviors derived and none executed',
        { tier2: tier2([unexecuted, unexecuted, unexecuted]) },
        'Behavior Hunt derived 3 behaviors from the report, but none produced a query that could run',
      ],
      [
        '2: no behaviors and Behavior Hunt recorded gaps',
        {
          tier2: tier2([], {
            incomplete: [{ reason: 'generation_failed', detail: 'catalog unavailable' }],
          }),
        },
        'Behavior Hunt could not derive a searchable behavior from the report',
      ],
      [
        '3: configured_never',
        { tier2_skipped_reason: 'configured_never' as const },
        'Behavior Hunt was turned off for this run',
      ],
      [
        '4: no_inference with a detail',
        {
          tier2_skipped_reason: 'no_inference' as const,
          tier2_skip_detail: 'ECONNRESET to gateway',
        },
        'the model call that chooses where Behavior Hunt runs failed',
      ],
      [
        '5: no_inference',
        { tier2_skipped_reason: 'no_inference' as const },
        'no model was available for Behavior Hunt',
      ],
      [
        '6: no_tier2_targets',
        { tier2_skipped_reason: 'no_tier2_targets' as const },
        'this space has no data source Behavior Hunt can run on',
      ],
      [
        '7: no_report_text',
        { tier2_skipped_reason: 'no_report_text' as const },
        'the report has no body text for Behavior Hunt',
      ],
      [
        '8: tier2_failed',
        { tier2_skipped_reason: 'tier2_failed' as const },
        'Behavior Hunt failed before running a query',
      ],
      [
        '9: no_searchable_input',
        { tier2_skipped_reason: 'no_searchable_input' as const },
        'the report gave Behavior Hunt nothing to work from',
      ],
      [
        '10: Behavior Hunt ran clean and found no behavior',
        { tier2: tier2([]) },
        'Behavior Hunt found no behavior in the report to search for',
      ],
    ])('row %s', (_label, overrides, clause) => {
      expect(buildHuntNarrative(nothingSearched(overrides), ctx)).toBe(
        expectedText(`${noIocs}, and ${clause}.`)
      );
    });

    it('names one behavior in the singular', () => {
      expect(buildHuntNarrative(nothingSearched({ tier2: tier2([unexecuted]) }), ctx)).toContain(
        'derived 1 behavior from the report'
      );
    });

    it('never repeats the raw skip detail', () => {
      const narrative = buildHuntNarrative(
        nothingSearched({
          tier2_skipped_reason: 'no_inference',
          tier2_skip_detail: 'ECONNRESET to gateway',
        }),
        ctx
      );
      expect(narrative).not.toContain('ECONNRESET');
      expect(narrative).not.toContain('gateway');
    });
  });

  describe('the IOC clause', () => {
    it('counts excluded indicators in the plural', () => {
      expect(
        buildHuntNarrative(
          nothingSearched({
            excluded_report_iocs: { count: 3 },
            tier2_skipped_reason: 'configured_never',
          }),
          ctx
        )
      ).toBe(
        expectedText(
          'IOC Hunt had nothing left to search after 3 indicators were excluded as not worth searching, and Behavior Hunt was turned off for this run.'
        )
      );
    });

    it('counts one excluded indicator in the singular', () => {
      expect(
        buildHuntNarrative(
          nothingSearched({
            excluded_report_iocs: { count: 1 },
            tier2_skipped_reason: 'no_inference',
          }),
          ctx
        )
      ).toContain('after 1 indicator was excluded as not worth searching');
    });

    it('gives both facts when indicators were excluded and Behavior Hunt derived behaviors that could not run', () => {
      const unexecuted = behavior({ execution: { executed: false, row_count: 0, hit: false } });
      expect(
        buildHuntNarrative(
          nothingSearched({
            excluded_report_iocs: { count: 2 },
            tier2: tier2([unexecuted, unexecuted]),
          }),
          ctx
        )
      ).toBe(
        expectedText(
          'IOC Hunt had nothing left to search after 2 indicators were excluded as not worth searching, and Behavior Hunt derived 2 behaviors from the report, but none produced a query that could run.'
        )
      );
    });
  });

  it('leaves out the search scope, the coverage section and the report title', () => {
    const narrative = buildHuntNarrative(
      nothingSearched({ tier2_skipped_reason: 'configured_never' }),
      ctx
    );
    expect(narrative).not.toContain('What was searched');
    expect(narrative).not.toContain('Coverage');
    expect(narrative).not.toContain(ctx.reportTitle);
  });

  it('says the report stays eligible when the run is retryable', () => {
    const narrative = buildHuntNarrative(
      nothingSearched({
        tier2_skipped_reason: 'no_inference',
        completeness: 'incomplete_retryable',
        retryable_reasons: ['generation_failed'],
        incomplete: [
          { reason: 'generation_failed', detail: 'requested but could not run' },
          nothingSearchedGap,
        ],
      }),
      ctx
    );

    expect(narrative).toBe(
      expectedText(`${noIocs}, and no model was available for Behavior Hunt.`).replace(
        NOT_CLEAN,
        `${NOT_CLEAN} The report stays eligible for a later sweep.`
      )
    );
  });

  it('does not mention a later sweep when the run is final', () => {
    expect(
      buildHuntNarrative(nothingSearched({ tier2_skipped_reason: 'configured_never' }), ctx)
    ).not.toContain('later sweep');
  });

  it('stays under 400 characters with a UUID run id and a three-digit count', () => {
    const unexecuted = behavior({ execution: { executed: false, row_count: 0, hit: false } });
    const narrative = buildHuntNarrative(
      nothingSearched({
        run_id: '8522435f-2add-564e-917a-93436c64a5dc',
        excluded_report_iocs: { count: 120 },
        tier2: tier2(Array.from({ length: 120 }, () => unexecuted)),
      }),
      ctx
    );
    expect(narrative.length).toBeLessThan(400);
  });

  describe('keeps the long form', () => {
    it('when IOC Hunt found no environment hits and Behavior Hunt was skipped', () => {
      const narrative = buildHuntNarrative(
        result({
          tier1: tier1({ status: 'no_environment_hits' }),
          tier2_skipped_reason: 'configured_never',
        }),
        ctx
      );
      expect(narrative).toContain('What was searched');
      expect(narrative).not.toContain('searched nothing');
    });

    it('when IOC Hunt had nothing to search but one behavior executed and matched no rows', () => {
      const executedNoRows = behavior({ execution: { executed: true, row_count: 0, hit: false } });
      const narrative = buildHuntNarrative(
        result({
          tier1: tier1({ status: 'no_searchable_terms' }),
          tier2: tier2([executedNoRows]),
        }),
        ctx
      );
      expect(narrative).toContain('What was searched');
      expect(narrative).not.toContain('searched nothing');
    });

    it('when IOC Hunt found no environment hits and there was no model', () => {
      const narrative = buildHuntNarrative(
        result({
          tier1: tier1({ status: 'no_environment_hits' }),
          tier2_skipped_reason: 'no_inference',
          unavailable_model_tiers: ['frontier'],
        }),
        ctx
      );
      expect(narrative).toContain('What was searched');
      expect(narrative).not.toContain('searched nothing');
    });

    it('when the run has no report id, because the short form speaks of the report', () => {
      const narrative = buildHuntNarrative(nothingSearched({ report_id: undefined }), ctx);
      expect(narrative).toContain('What was searched');
      expect(narrative).not.toContain('searched nothing for this report');
    });
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
    ).toBe(
      'confirmed hit: IOC Hunt matched 121 documents; Behavior Hunt confirmed 1 of 2 behaviors'
    );
  });

  it('summarizes a clean run with a skipped Behavior Hunt', () => {
    expect(
      buildHuntHeadline(
        result({ status: 'tier1_only', tier2_skipped_reason: 'no_environment_hits' })
      )
    ).toBe('no confirmed hits: IOC Hunt found no matches; Behavior Hunt skipped');
  });

  it('summarizes IOC Hunt matches without optional-only wording', () => {
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
    ).toBe('no confirmed hits: IOC Hunt matched 5 documents; Behavior Hunt derived no behaviors');
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
