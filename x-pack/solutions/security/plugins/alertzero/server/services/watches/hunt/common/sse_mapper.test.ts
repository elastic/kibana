/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { ScopedModel } from '@kbn/agent-builder-server';
import dateMath from '@kbn/datemath';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { significantSecurityEventAttachmentDataSchema } from '../../../../../common/significant_security_event_schema';
import { huntCoordinator } from '../hunt_coordinator';
import type { HuntCoordinatorCoreResult } from '../hunt_coordinator';
import { buildSseData, buildSseAttachmentId } from './sse_mapper';

const huntResultOf = (entry: ReturnType<typeof buildSseData>[number]) => {
  const huntResult = entry.data.hunt_result;
  if (!huntResult) throw new Error('expected hunt_result on the SSE entry');
  return huntResult;
};

jest.mock('./resolve_index_scope', () => ({
  resolveHuntScope: jest.fn().mockResolvedValue({
    status: 'ok',
    resolution: 'universe',
    // A wildcard pattern matching what resolveHuntScope returns in production
    // (`logs-aws.*`), not a concrete `_index` bucket name. The fixture must use
    // the pattern so `matchesRequired`'s regex logic is exercised correctly.
    index_patterns: ['logs-aws.*'],
    missing: [],
    discovered: [],
    report_matches: ['logs-aws.*'],
    actionable_indices: ['logs-endpoint.events.process-*'],
    window: { from: 'now-24h', to: 'now' },
    row_limit: 100,
  }),
}));

const HIT_TIER1_RESULT = {
  status: 'environment_hits_found' as const,
  has_confirmed_hit: true,
  searched_iocs: 1,
  searched_techniques: 0,
  resolved_iocs: [{ type: 'hash' as const, value: '9f2b1e7c4a6d8e0f1b3c5d7e9f0a1b2c' }],
  resolved_techniques: [],
  time_range: { from: '2026-07-30T13:00:00.000Z', to: '2026-07-30T15:00:00.000Z' },
  counts: { total_hits: 4, returned_hits: 4, affected_hosts: 1, affected_users: 1 },
  hits: [
    {
      // Data stream hits report the backing index, not the data stream name.
      index: '.ds-logs-aws.cloudtrail-default-2026.07.30-000001',
      id: 'evt-1',
      timestamp: '2026-07-30T13:05:00.000Z',
    },
    {
      index: '.alerts-security.alerts-default',
      id: 'evt-2',
      timestamp: '2026-07-30T13:06:00.000Z',
    },
  ],
  affected_assets: {
    hosts: [{ name: 'ci-deploy-runner-07', hit_count: 1 }],
    users: [{ name: 'svc-deploy-bot', hit_count: 3 }],
    services: [{ name: 'ci-deploy-role', hit_count: 2 }],
  },
  per_index: [
    {
      index: '.ds-logs-aws.cloudtrail-default-2026.07.30-000001',
      hit_count: 3,
      required: true,
    },
    {
      index: '.alerts-security.alerts-default',
      hit_count: 1,
      required: true,
    },
  ],
};

const CLEAN_TIER1_RESULT = {
  status: 'no_environment_hits' as const,
  has_confirmed_hit: false,
  searched_iocs: 0,
  searched_techniques: 0,
  resolved_iocs: [],
  resolved_techniques: [],
  time_range: { from: '2026-07-30T13:00:00.000Z', to: '2026-07-30T15:00:00.000Z' },
  counts: { total_hits: 0, returned_hits: 0, affected_hosts: 0, affected_users: 0 },
  hits: [],
  affected_assets: { hosts: [], users: [], services: [] },
  per_index: [],
};

const HIT_TIER2_RESULT_TWO_BEHAVIORS = {
  status: 'behaviors_proposed' as const,
  behaviors: [
    {
      technique_id: 'T1078.004',
      evidence_quote: 'AssumeRole into OrgAdminBoundary',
      llm_confidence: 0.82,
      confidence: 0.82,
      technique_name: 'Valid Accounts: Cloud Accounts',
      reference: 'https://attack.mitre.org/techniques/T1078/004/',
      tactic_ids: ['TA0001', 'TA0004'],
      validated_esql: 'FROM logs-aws.cloudtrail-default | WHERE ...',
      title: 'AssumeRole into high-risk policy boundary',
      severity: 'high' as const,
      risk_score: 73,
      execution: { executed: true, row_count: 2, hit: true },
      affected_hosts: ['WIN-ANALYST01'],
      affected_users: ['svc-deploy-bot'],
      hits: [
        {
          id: 't2-evt-1',
          index: '.ds-logs-aws.cloudtrail-default-2026.07.30-000001',
          timestamp: '2026-07-30T14:00:00.000Z',
        },
      ],
    },
    {
      technique_id: 'T1552.001',
      evidence_quote: 'credential-file-read on ci-deploy-runner-07',
      llm_confidence: 0.71,
      confidence: 0.71,
      technique_name: 'Unsecured Credentials: Credentials In Files',
      reference: 'https://attack.mitre.org/techniques/T1552/001/',
      tactic_ids: ['TA0006'],
      validated_esql: 'FROM logs-endpoint.alerts-default | WHERE ...',
      title: 'Credential file read on CI runner',
      severity: 'medium' as const,
      risk_score: 51,
      execution: { executed: true, row_count: 1, hit: true },
      affected_hosts: ['ci-deploy-runner-07'],
      hits: [
        {
          id: 't2-evt-2',
          index: '.ds-logs-endpoint.events.file-default-2026.07.30-000001',
          timestamp: '2026-07-30T14:05:00.000Z',
        },
      ],
    },
  ],
  indexed_behaviors: [],
  has_hit: true as const,
  next_step: 'Review the proposed rules.',
};

// The coordinator loads the report when only report_id is given; these tests
// supply text and IOCs themselves, so the loader returns an empty context.
jest.mock('./load_report_context', () => ({
  loadReportHuntContext: jest.fn().mockResolvedValue({ iocs: [], techniques: [] }),
}));

jest.mock('../tier1/hunt_for_threat', () => ({
  ...jest.requireActual('../tier1/hunt_for_threat'),
  huntForThreat: jest.fn(),
}));

jest.mock('../tier2/hunt_behavior', () => ({
  huntBehavior: jest.fn(),
}));

const logger = loggingSystemMock.createLogger();

const esClient = {} as ElasticsearchClient;
/** Truthy stand-in so the coordinator does not skip Tier 2 with `no_inference`. */
const mockModel = {} as ScopedModel;

const DEFAULT_INDEX_PATTERNS = ['logs-aws.*'];

const runCoordinator = (
  params: Omit<Parameters<typeof huntCoordinator>[3], 'indexPatterns'> & {
    indexPatterns?: string[];
  }
): ReturnType<typeof huntCoordinator> =>
  huntCoordinator({ esClient, reportsEsClient: esClient }, mockModel, logger, {
    indexPatterns: DEFAULT_INDEX_PATTERNS,
    ...params,
  });

type TestBehavior = NonNullable<HuntCoordinatorCoreResult['tier2']>['behaviors'][number];

/** A coordinator result the coordinator itself considers valid, Tier 1 only. */
const tier1Result = (
  over: Partial<HuntCoordinatorCoreResult['tier1']>
): HuntCoordinatorCoreResult => ({
  status: 'tier1_only',
  run_id: 'run-1',
  index_patterns: ['logs-aws.*'],
  tier2_targets: ['logs-aws.*'],
  tier2_target_sources: ['report_match'],
  actionable_indices: ['logs-endpoint.events.process-*'],
  has_confirmed_hit: true,
  completeness: 'complete',
  completed_successfully: true,
  message: '',
  next_step: '',
  tier1: {
    tier: 1,
    status: 'environment_hits_found',
    has_confirmed_hit: true,
    searched_iocs: 1,
    searched_techniques: 0,
    resolved_iocs: [{ type: 'hash', value: 'abc' }],
    resolved_techniques: [],
    time_range: { from: '2026-07-30T13:00:00.000Z', to: '2026-07-30T15:00:00.000Z' },
    counts: { total_hits: 1, returned_hits: 1, affected_hosts: 0, affected_users: 0 },
    hits: [],
    affected_assets: { hosts: [], users: [], services: [] },
    per_index: [{ index: 'logs-aws.cloudtrail-default', hit_count: 1, required: true }],
    ...over,
  },
});

const behaviorFixture = (over: Partial<TestBehavior> = {}): TestBehavior => ({
  technique_id: 'T1078.004',
  evidence_quote: 'AssumeRole into OrgAdminBoundary',
  llm_confidence: 0.9,
  confidence: 0.9,
  technique_name: 'Valid Accounts: Cloud Accounts',
  reference: 'https://attack.mitre.org/techniques/T1078/004/',
  tactic_ids: ['TA0001'],
  validated_esql: 'FROM logs-aws.cloudtrail-default | WHERE true',
  title: 'AssumeRole into high-risk policy boundary',
  severity: 'high',
  risk_score: 73,
  execution: { executed: true, row_count: 1, hit: true },
  ...over,
});

const withBehaviors = (
  result: HuntCoordinatorCoreResult,
  behaviors: TestBehavior[]
): HuntCoordinatorCoreResult => ({
  ...result,
  status: 'tier1_and_tier2',
  tier2: {
    tier: 2,
    status: 'behaviors_proposed',
    behaviors,
    indexed_behaviors: [],
    has_hit: behaviors.some((behavior) => behavior.execution?.hit === true),
    next_step: 'n/a',
  },
});

const schemaIssues = (result: HuntCoordinatorCoreResult): string[] => {
  const [entry] = buildSseData(result, 'tr-1', { spaceId: 'default' });
  const parsed = significantSecurityEventAttachmentDataSchema.safeParse(entry.data);
  return parsed.success
    ? []
    : parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
};

describe('buildSseAttachmentId', () => {
  it('is deterministic and technique-scoped', () => {
    const withTechnique = buildSseAttachmentId({
      spaceId: 'default',
      reportId: 'tr-1',
      techniqueId: 'T1078.004',
    });
    const withoutTechnique = buildSseAttachmentId({ spaceId: 'default', reportId: 'tr-1' });

    expect(withTechnique).toMatch(/^sse-[0-9a-f]{64}$/);
    expect(withoutTechnique).toMatch(/^sse-[0-9a-f]{64}$/);
    expect(withTechnique).not.toEqual(withoutTechnique);
    expect(
      buildSseAttachmentId({ spaceId: 'default', reportId: 'tr-1', techniqueId: 'T1078.004' })
    ).toEqual(withTechnique);
  });

  it('keeps a report id containing the subject separator distinct from a technique scope', () => {
    // Nothing constrains a report id's characters, and this id is the idempotency key for a
    // re-hunt: colliding subjects mean one report's finding overwrites another's.
    expect(buildSseAttachmentId({ spaceId: 'default', reportId: 'r|T1078.004' })).not.toEqual(
      buildSseAttachmentId({ spaceId: 'default', reportId: 'r', techniqueId: 'T1078.004' })
    );
    expect(buildSseAttachmentId({ spaceId: 'default|r', reportId: 'x' })).not.toEqual(
      buildSseAttachmentId({ spaceId: 'default', reportId: 'r|x' })
    );
  });
});

describe('buildSseData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns one SSE entry per corroborated technique on a tier1_and_tier2 hit', async () => {
    const { huntForThreat } = jest.requireMock('../tier1/hunt_for_threat');
    const { huntBehavior } = jest.requireMock('../tier2/hunt_behavior');
    huntForThreat.mockResolvedValue(HIT_TIER1_RESULT);
    huntBehavior.mockResolvedValue(HIT_TIER2_RESULT_TWO_BEHAVIORS);

    const coordinatorResult = await runCoordinator({
      report_id: 'tr-aws-iam-assumerole-2026-07-28',
      spaceId: 'default',
      text: 'AssumeRole chain from a rarely used identity',
      trigger: 'scheduled',
      run_id: 'run-hunt-20260730T160000Z',
      tier2_when: 'on_hits',
    });

    expect(coordinatorResult.status).toBe('tier1_and_tier2');

    const entries = buildSseData(coordinatorResult, 'tr-aws-iam-assumerole-2026-07-28', {
      spaceId: 'default',
    });

    // Both behaviors executed and hit, so both earn an entry.
    expect(entries).toHaveLength(2);
    expect(entries.map((e) => e.attachment_id)).toEqual([
      buildSseAttachmentId({
        spaceId: 'default',
        reportId: 'tr-aws-iam-assumerole-2026-07-28',
        techniqueId: 'T1078.004',
      }),
      buildSseAttachmentId({
        spaceId: 'default',
        reportId: 'tr-aws-iam-assumerole-2026-07-28',
        techniqueId: 'T1552.001',
      }),
    ]);
    // Every entry's ids are distinct (no collisions across techniques).
    expect(new Set(entries.map((e) => e.attachment_id)).size).toBe(2);

    const [entry] = entries;
    expect(entry.data.report_id).toBe('tr-aws-iam-assumerole-2026-07-28');
    expect(entry.data.run_id).toBe('run-hunt-20260730T160000Z');
    expect(entry.data.source_watch).toBe('system-security-hunt-continuous-threat-hunt');

    expect(huntResultOf(entry).has_confirmed_hit).toBe(true);
    expect(huntResultOf(entry).hit_sources).toEqual(expect.arrayContaining(['tier1', 'tier2']));
    expect(huntResultOf(entry).tier1.status).toBe('environment_hits_found');
    expect(huntResultOf(entry).tier1.counts.total_hits).toBe(4);
    expect(huntResultOf(entry).tier1.per_index).toEqual([
      {
        index: '.ds-logs-aws.cloudtrail-default-2026.07.30-000001',
        hit_count: 3,
        required: true,
      },
      {
        index: '.alerts-security.alerts-default',
        hit_count: 1,
        required: true,
      },
    ]);
    expect(huntResultOf(entry).tier1.resolved_iocs).toEqual([
      { type: 'hash', value: '9f2b1e7c4a6d8e0f1b3c5d7e9f0a1b2c' },
    ]);
    expect(huntResultOf(entry).tier2).toBeDefined();
    expect(huntResultOf(entry).tier2?.status).toBe('behaviors_proposed');
    expect(huntResultOf(entry).tier2?.behaviors[0].technique_id).toBe('T1078.004');
    expect(huntResultOf(entry).tier2?.behaviors[0].validated_esql).toContain(
      'FROM logs-aws.cloudtrail-default'
    );
    expect(huntResultOf(entry).tier2?.behaviors[0].execution).toEqual({
      executed: true,
      row_count: 2,
      hit: true,
    });
    expect(entry.data.title).toBe('AssumeRole into high-risk policy boundary');
    expect(entry.data.severity).toBe('high');
    expect(entry.data.status).toBe('open');
    expect(entry.data.evaluation_record_ref).toContain('eval:hunt:');
    // The coordinator's own recommendations land in manual_remediation; every other
    // maps_to_proposal field (category, actionWorkflowId, …) stays unset until packaging mints.
    expect(entry.data.maps_to_proposal).toEqual({
      manual_remediation: expect.arrayContaining([expect.any(String)]),
    });

    expect(entry.data.entities).toEqual(
      expect.arrayContaining([
        { field: 'host.name', value: 'ci-deploy-runner-07' },
        { field: 'host.name', value: 'WIN-ANALYST01' },
        { field: 'user.name', value: 'svc-deploy-bot' },
        { field: 'service.name', value: 'ci-deploy-role' },
      ])
    );

    // Hits from a hidden alerts index are alerts, not events: the attachment
    // schema rejects a hidden index as an event source and has `alerts[]` for them.
    expect(entry.data.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          event_id: 'evt-1',
          source_index: '.ds-logs-aws.cloudtrail-default-2026.07.30-000001',
        }),
        expect.objectContaining({
          event_id: 't2-evt-1',
          source_index: '.ds-logs-aws.cloudtrail-default-2026.07.30-000001',
          matched: { technique_id: 'T1078.004', field: '_id' },
        }),
      ])
    );
    // Sibling technique's Tier 2 ref stays off this entry.
    expect(entry.data.events?.some((e) => e.event_id === 't2-evt-2')).toBe(false);
    expect(entry.data.alerts).toEqual([
      {
        alert_id: 'evt-2',
        index: '.alerts-security.alerts-default',
        timestamp: '2026-07-30T13:06:00.000Z',
      },
    ]);

    // Discovery-first hunts no longer emit technology indicators from the result.
    expect(entry.data.security_knowledge_indicators.some((i) => i.type === 'technology')).toBe(
      false
    );

    // `report_id` is its own top-level field (asserted separately below);
    // it's no longer duplicated into `security_knowledge_indicators`.
    expect(entry.data.report_id).toBe('tr-aws-iam-assumerole-2026-07-28');

    // Actionable process-bearing indices ride along when the scope named any.
    expect(huntResultOf(entry).actionable_indices).toEqual(['logs-endpoint.events.process-*']);
    expect(huntResultOf(entry).tier2_targets).toEqual(expect.arrayContaining(['logs-aws.*']));

    const iocIndicator = entry.data.security_knowledge_indicators.find((i) => i.type === 'ioc');
    expect(iocIndicator?.ioc).toEqual({ type: 'hash', value: '9f2b1e7c4a6d8e0f1b3c5d7e9f0a1b2c' });

    // Per-technique filtering: the first entry is scoped to T1078.004 alone.
    // The second technique's behavior/rule name must not leak onto it, since
    // the SSE is meant to be 1:1 with a Proposal.
    const techniqueIndicators = entry.data.security_knowledge_indicators.filter(
      (i) => i.type === 'technique'
    );
    expect(techniqueIndicators.map((i) => i.technique_id)).toEqual(['T1078.004']);

    // The second entry (T1552.001) is scoped the other way: confirms
    // filtering isn't a no-op that happens to pass on the first entry alone.
    const [, secondEntry] = entries;
    const secondTechniqueIndicators = secondEntry.data.security_knowledge_indicators.filter(
      (i) => i.type === 'technique'
    );
    expect(secondTechniqueIndicators.map((i) => i.technique_id)).toEqual(['T1552.001']);
    expect(huntResultOf(secondEntry).tier2?.behaviors.map((b) => b.technique_id)).toEqual([
      'T1552.001',
    ]);
  });

  it('returns a single report-scoped entry when Tier 2 produced no behaviors', async () => {
    const { huntForThreat } = jest.requireMock('../tier1/hunt_for_threat');
    const { huntBehavior } = jest.requireMock('../tier2/hunt_behavior');
    huntForThreat.mockResolvedValue(HIT_TIER1_RESULT);
    huntBehavior.mockResolvedValue({
      status: 'no_behaviors_found',
      behaviors: [],
      indexed_behaviors: [],
      has_hit: false,
      next_step: 'Lower threshold.',
    });

    const coordinatorResult = await runCoordinator({
      report_id: 'tr-hit-no-behaviors',
      spaceId: 'default',
      text: 'AssumeRole chain',
      trigger: 'scheduled',
      run_id: 'run-hunt-no-behaviors',
      tier2_when: 'on_hits',
    });

    const entries = buildSseData(coordinatorResult, 'tr-hit-no-behaviors', { spaceId: 'default' });

    expect(entries).toHaveLength(1);
    expect(entries[0].attachment_id).toEqual(
      buildSseAttachmentId({ spaceId: 'default', reportId: 'tr-hit-no-behaviors' })
    );
    expect(huntResultOf(entries[0]).has_confirmed_hit).toBe(true);
    expect(huntResultOf(entries[0]).hit_sources).toEqual(['tier1']);
    expect(huntResultOf(entries[0]).tier2?.status).toBe('no_behaviors_found');
  });

  it('emits a Tier 2-only hit with tier2 hit_sources and Tier 2 entities', async () => {
    const { huntForThreat } = jest.requireMock('../tier1/hunt_for_threat');
    const { huntBehavior } = jest.requireMock('../tier2/hunt_behavior');
    huntForThreat.mockResolvedValue(CLEAN_TIER1_RESULT);
    huntBehavior.mockResolvedValue({
      status: 'behaviors_proposed',
      behaviors: [
        {
          technique_id: 'T1078.004',
          evidence_quote: 'AssumeRole into OrgAdminBoundary',
          llm_confidence: 0.9,
          confidence: 0.9,
          technique_name: 'Valid Accounts: Cloud Accounts',
          reference: 'https://attack.mitre.org/techniques/T1078/004/',
          tactic_ids: ['TA0001'],
          validated_esql: 'FROM logs-aws.cloudtrail-default | WHERE true',
          title: 'AssumeRole into high-risk policy boundary',
          severity: 'high' as const,
          risk_score: 73,
          execution: { executed: true, row_count: 3, hit: true },
          affected_hosts: ['WIN-ANALYST01'],
          hits: [
            {
              id: 't2-only-1',
              index: '.ds-logs-aws.cloudtrail-default-2026.07.30-000001',
              timestamp: '2026-07-30T14:00:00.000Z',
            },
          ],
        },
      ],
      indexed_behaviors: [],
      has_hit: true,
      next_step: 'Review.',
    });

    const coordinatorResult = await runCoordinator({
      report_id: 'tr-behavior-only',
      spaceId: 'default',
      text: 'behavior only',
      trigger: 'manual',
      run_id: 'run-tier2-only',
      tier2_when: 'always',
    });

    expect(coordinatorResult.has_confirmed_hit).toBe(true);
    const entries = buildSseData(coordinatorResult, 'tr-behavior-only', { spaceId: 'default' });
    expect(entries).toHaveLength(1);
    expect(huntResultOf(entries[0]).has_confirmed_hit).toBe(true);
    expect(huntResultOf(entries[0]).hit_sources).toEqual(['tier2']);
    expect(entries[0].data.entities).toEqual([{ field: 'host.name', value: 'WIN-ANALYST01' }]);
    expect(entries[0].data.events).toEqual([
      expect.objectContaining({
        event_id: 't2-only-1',
        matched: { technique_id: 'T1078.004', field: '_id' },
      }),
    ]);

    const parsed = significantSecurityEventAttachmentDataSchema.safeParse(entries[0].data);
    expect(parsed.success).toBe(true);
  });

  it('returns a single report-scoped entry for a tier1_only clean result', async () => {
    const { huntForThreat } = jest.requireMock('../tier1/hunt_for_threat');
    const { huntBehavior } = jest.requireMock('../tier2/hunt_behavior');
    huntForThreat.mockResolvedValue(CLEAN_TIER1_RESULT);
    huntBehavior.mockResolvedValue({
      status: 'no_behaviors_found',
      behaviors: [],
      indexed_behaviors: [],
      has_hit: false,
      next_step: 'n/a',
    });

    const coordinatorResult = await runCoordinator({
      report_id: 'tr-clean-2026-07-28',
      spaceId: 'default',
      text: 'clean report',
      trigger: 'scheduled',
      run_id: 'run-hunt-clean',
      // Skip Tier 2 so the result stays tier1_only with no tier2 block.
      tier2_when: 'never',
    });

    const entries = buildSseData(coordinatorResult, 'tr-clean-2026-07-28', { spaceId: 'default' });

    expect(entries).toHaveLength(1);
    expect(huntResultOf(entries[0]).has_confirmed_hit).toBe(false);
    expect(huntResultOf(entries[0]).hit_sources).toEqual([]);
    expect(huntResultOf(entries[0]).tier2).toBeUndefined();
    expect(entries[0].data.entities).toEqual([]);
    expect(entries[0].data.events).toEqual([]);
    expect(entries[0].data.alerts).toEqual([]);
  });
});

/**
 * An SSE is a finding, so a technique earns one only when this run corroborated
 * it. Fanning out over every *proposed* technique opens a rule-named,
 * model-severity, `status: open` event for each behavior Tier 2 guessed at, on
 * the strength of one unrelated technique clearing the hit bar.
 */
describe('buildSseData publishes an entry only for a corroborated technique', () => {
  type RawTier1 = Omit<HuntCoordinatorCoreResult['tier1'], 'tier'>;

  const proposedBehavior = ({
    techniqueId,
    ruleName,
    hit,
  }: {
    techniqueId: string;
    ruleName: string;
    hit: boolean;
  }): TestBehavior =>
    behaviorFixture({
      technique_id: techniqueId,
      technique_name: `Technique ${techniqueId}`,
      reference: `https://attack.mitre.org/techniques/${techniqueId}/`,
      evidence_quote: `report quote for ${techniqueId}`,
      title: ruleName,
      execution: { executed: true, row_count: hit ? 2 : 0, hit },
    });

  const run = async (
    tier1: RawTier1,
    behaviors: TestBehavior[]
  ): Promise<HuntCoordinatorCoreResult> => {
    const { huntForThreat } = jest.requireMock('../tier1/hunt_for_threat');
    const { huntBehavior } = jest.requireMock('../tier2/hunt_behavior');
    huntForThreat.mockResolvedValue(tier1);
    huntBehavior.mockResolvedValue({
      status: 'behaviors_proposed',
      behaviors,
      indexed_behaviors: [],
      has_hit: behaviors.some((behavior) => behavior.execution?.hit === true),
      next_step: 'Review the proposed rules.',
    });
    return runCoordinator({
      report_id: 'tr-corroboration',
      spaceId: 'default',
      text: 'candidate behaviors',
      trigger: 'scheduled',
      run_id: 'run-corroboration',
      tier2_when: 'always',
    });
  };

  const entriesFor = (result: HuntCoordinatorCoreResult) =>
    buildSseData(result, 'tr-corroboration', { spaceId: 'default' });

  const idFor = (techniqueId?: string) =>
    buildSseAttachmentId({ spaceId: 'default', reportId: 'tr-corroboration', techniqueId });

  it('leaves out a technique that executed and found nothing', async () => {
    const result = await run(CLEAN_TIER1_RESULT, [
      proposedBehavior({
        techniqueId: 'T1078.004',
        ruleName: 'AssumeRole into high-risk policy boundary',
        hit: true,
      }),
      proposedBehavior({
        techniqueId: 'T1552.001',
        ruleName: 'Credential file read on CI runner',
        hit: false,
      }),
    ]);

    // The route publishes on the report-wide flag, which the one hitting technique sets.
    expect(result.has_confirmed_hit).toBe(true);

    const entries = entriesFor(result);

    expect(entries).toHaveLength(1);
    expect(entries[0].attachment_id).toEqual(idFor('T1078.004'));
    expect(entries[0].data.title).toBe('AssumeRole into high-risk policy boundary');
    expect(huntResultOf(entries[0]).tier2?.behaviors.map((b) => b.technique_id)).toEqual([
      'T1078.004',
    ]);
  });

  it('falls back to one report-scoped entry when Tier 1 hit and no technique did', async () => {
    // `HIT_TIER1_RESULT`'s hits carry no `matched.technique_id`, so they are shared
    // context for the report rather than corroboration of either proposal.
    const result = await run(HIT_TIER1_RESULT, [
      proposedBehavior({
        techniqueId: 'T1078.004',
        ruleName: 'AssumeRole into high-risk policy boundary',
        hit: false,
      }),
      proposedBehavior({
        techniqueId: 'T1552.001',
        ruleName: 'Credential file read on CI runner',
        hit: false,
      }),
    ]);

    const entries = entriesFor(result);

    expect(entries).toHaveLength(1);
    expect(entries[0].attachment_id).toEqual(idFor());
    expect(entries[0].data.title).toBe('Hunt confirmed for tr-corroboration');
    expect(huntResultOf(entries[0]).hit_sources).toEqual(['tier1']);
    // The proposals are not lost: the report-scoped entry carries all of them, and
    // the ones that executed clean are stated as evidence against.
    expect(huntResultOf(entries[0]).tier2?.behaviors.map((b) => b.technique_id)).toEqual([
      'T1078.004',
      'T1552.001',
    ]);
    expect(entries[0].data.evidence_against).toEqual([
      'Tier 2 executed 2 proposed technique(s) with no required-index rows: T1078.004, T1552.001.',
    ]);
    expect(significantSecurityEventAttachmentDataSchema.safeParse(entries[0].data).success).toBe(
      true
    );
  });

  it('does not let a Tier 1 hit attributed to another technique corroborate this one', async () => {
    const result = await run(
      {
        ...HIT_TIER1_RESULT,
        counts: { total_hits: 1, returned_hits: 1, affected_hosts: 1, affected_users: 1 },
        hits: [
          {
            index: '.ds-logs-aws.cloudtrail-default-2026.07.30-000001',
            id: 'evt-other-technique',
            timestamp: '2026-07-30T13:05:00.000Z',
            matched: { field: 'file.hash.md5', technique_id: 'T1003.001' },
          },
        ],
        per_index: [
          {
            index: '.ds-logs-aws.cloudtrail-default-2026.07.30-000001',
            hit_count: 1,
            required: true,
          },
        ],
      },
      [
        proposedBehavior({
          techniqueId: 'T1552.001',
          ruleName: 'Credential file read on CI runner',
          hit: false,
        }),
      ]
    );

    const entries = entriesFor(result);

    expect(entries).toHaveLength(1);
    expect(entries[0].attachment_id).toEqual(idFor());
  });

  it('publishes a technique entry for a technique a Tier 1 hit was attributed to', async () => {
    const result = await run(
      {
        ...HIT_TIER1_RESULT,
        counts: { total_hits: 1, returned_hits: 1, affected_hosts: 1, affected_users: 1 },
        hits: [
          {
            index: '.ds-logs-aws.cloudtrail-default-2026.07.30-000001',
            id: 'evt-attributed',
            timestamp: '2026-07-30T13:05:00.000Z',
            matched: { field: 'file.hash.md5', technique_id: 'T1552.001' },
          },
        ],
        per_index: [
          {
            index: '.ds-logs-aws.cloudtrail-default-2026.07.30-000001',
            hit_count: 1,
            required: true,
          },
        ],
      },
      [
        proposedBehavior({
          techniqueId: 'T1552.001',
          ruleName: 'Credential file read on CI runner',
          hit: false,
        }),
      ]
    );

    const entries = entriesFor(result);

    expect(entries).toHaveLength(1);
    expect(entries[0].attachment_id).toEqual(idFor('T1552.001'));
    expect(huntResultOf(entries[0]).hit_sources).toEqual(['tier1']);
    // `counts.total_hits` is the report's total and spans optional indices, so the
    // sentence says whose count it is, that it is a match count rather than a
    // confirmed one, and how much of it this entry carries.
    expect(entries[0].data.evidence_for).toContain(
      'Tier 1 matched 1 event(s) for this report in the hunt window, at least one in a required index; 1 are referenced here (see hunt_result.tier1.per_index for the required/optional split).'
    );
  });

  it('does not let an optional-index hit attributed to a technique promote it', async () => {
    // Tier 1 samples required and optional indices together but sets `has_confirmed_hit` from
    // a count over the required patterns alone, so the hit that cleared the bar and the hit
    // attributed to this technique need not be the same one.
    const result = await run(
      {
        ...HIT_TIER1_RESULT,
        counts: { total_hits: 2, returned_hits: 2, affected_hosts: 1, affected_users: 1 },
        hits: [
          {
            // Cleared the bar, but belongs to no technique.
            index: '.ds-logs-aws.cloudtrail-default-2026.07.30-000001',
            id: 'evt-required-unattributed',
            timestamp: '2026-07-30T13:05:00.000Z',
          },
          {
            // Attributed to the technique, but from an optional index.
            index: '.alerts-security.alerts-default',
            id: 'alert-optional-attributed',
            timestamp: '2026-07-30T13:06:00.000Z',
            matched: { field: 'file.hash.md5', technique_id: 'T1552.001' },
          },
        ],
        per_index: [
          {
            index: '.ds-logs-aws.cloudtrail-default-2026.07.30-000001',
            hit_count: 1,
            required: true,
          },
          {
            index: '.alerts-security.alerts-default',
            hit_count: 1,
            required: false,
          },
        ],
      },
      [
        proposedBehavior({
          techniqueId: 'T1552.001',
          ruleName: 'Credential file read on CI runner',
          hit: false,
        }),
      ]
    );

    const entries = entriesFor(result);

    expect(entries).toHaveLength(1);
    expect(entries[0].attachment_id).toEqual(idFor());
  });

  it('publishes one entry for a technique proposed twice', async () => {
    const result = await run(CLEAN_TIER1_RESULT, [
      proposedBehavior({
        techniqueId: 'T1078.004',
        ruleName: 'AssumeRole into high-risk policy boundary',
        hit: true,
      }),
      proposedBehavior({
        techniqueId: 'T1078.004',
        ruleName: 'AssumeRole from an unused identity',
        hit: true,
      }),
    ]);

    const entries = entriesFor(result);

    // Two entries would share one `attachment_id`, so the second `ai.attachment.add`
    // would overwrite the first.
    expect(entries).toHaveLength(1);
    expect(entries[0].attachment_id).toEqual(idFor('T1078.004'));
    expect(huntResultOf(entries[0]).tier2?.behaviors.map((b) => b.title)).toEqual([
      'AssumeRole into high-risk policy boundary',
      'AssumeRole from an unused identity',
    ]);
  });

  it('resolves the window once per run, not once per entry', async () => {
    const result = await run(
      { ...CLEAN_TIER1_RESULT, time_range: { from: 'now-24h', to: 'now' } },
      [
        proposedBehavior({
          techniqueId: 'T1078.004',
          ruleName: 'AssumeRole into high-risk policy boundary',
          hit: true,
        }),
        proposedBehavior({
          techniqueId: 'T1552.001',
          ruleName: 'Credential file read on CI runner',
          hit: true,
        }),
      ]
    );

    const parseSpy = jest.spyOn(dateMath, 'parse');
    const entries = entriesFor(result);
    expect(entries).toHaveLength(2);

    // A `now` taken per entry lets sibling findings from one hunt report different
    // windows, so the clock has to be one object shared by the whole run.
    const clocks = new Set(parseSpy.mock.calls.map(([, options]) => options?.forceNow));
    expect(clocks.size).toBe(1);
    expect(huntResultOf(entries[0]).time_range).toEqual(huntResultOf(entries[1]).time_range);
    parseSpy.mockRestore();
  });
});

describe('buildSseData output parses against the SSE attachment schema', () => {
  it('validates mapper output as-is (schema-complete, no caller fill)', async () => {
    const { huntForThreat } = jest.requireMock('../tier1/hunt_for_threat');
    const { huntBehavior } = jest.requireMock('../tier2/hunt_behavior');
    huntForThreat.mockResolvedValue(HIT_TIER1_RESULT);
    huntBehavior.mockResolvedValue(HIT_TIER2_RESULT_TWO_BEHAVIORS);

    const coordinatorResult = await runCoordinator({
      report_id: 'tr-aws-iam-assumerole-2026-07-28',
      spaceId: 'default',
      text: 'AssumeRole chain from a rarely used identity',
      trigger: 'scheduled',
      run_id: 'run-hunt-20260730T160000Z',
      tier2_when: 'on_hits',
    });

    const [entry] = buildSseData(coordinatorResult, 'tr-aws-iam-assumerole-2026-07-28', {
      spaceId: 'default',
    });

    const parsed = significantSecurityEventAttachmentDataSchema.safeParse(entry.data);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.report_id).toBe('tr-aws-iam-assumerole-2026-07-28');
      expect(parsed.data.hunt_result?.has_confirmed_hit).toBe(true);
      expect(parsed.data.hunt_result?.hit_sources).toEqual(
        expect.arrayContaining(['tier1', 'tier2'])
      );
      // `entry` is the first of two technique-scoped SSEs. hunt_result.tier2.behaviors
      // is filtered to this entry's own technique alone, so length 1, not 2.
      expect(parsed.data.hunt_result?.tier2?.behaviors).toHaveLength(1);
      expect(parsed.data.hunt_result?.tier2?.behaviors?.[0]?.technique_id).toBe('T1078.004');
      // A confirmed hit gets the coordinator's own recommendations in manual_remediation;
      // everything else on maps_to_proposal (category, actionWorkflowId, …) stays unset.
      expect(parsed.data.maps_to_proposal).toEqual({
        manual_remediation: expect.arrayContaining([expect.any(String)]),
      });
    }
  });
});

/**
 * The coordinator echoes caller input and raw `_source` values that the SSE
 * schema is stricter about. Each case here is a coordinator result the
 * coordinator itself considers valid; the mapper must still produce an
 * attachment the schema accepts, or `ai.attachment.add` fails at demo time.
 */
describe('buildSseData holds coordinator output to the SSE schema bounds', () => {
  it('resolves a date-math window to ISO instants', () => {
    const [entry] = buildSseData(
      tier1Result({ time_range: { from: 'now-24h', to: 'now' } }),
      'tr-1',
      { spaceId: 'default' }
    );

    expect(huntResultOf(entry).time_range).toEqual({
      from: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T.*Z$/),
      to: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T.*Z$/),
    });
  });

  it('throws on a window that is neither a date nor date math', () => {
    expect(() =>
      buildSseData(tier1Result({ time_range: { from: 'yesterday', to: 'now' } }), 'tr-1', {
        spaceId: 'default',
      })
    ).toThrow(/time_range/);
  });

  it('keeps Tier 1 per_index order when the list overflows the schema cap', () => {
    // Tier 1 aggregates up to 500 `_index` buckets; the schema accepts 20. The mapper
    // no longer reorders confirming-first: it keeps Tier 1's order and truncates.
    const perIndex = Array.from({ length: 25 }, (_, i) => ({
      index: `.ds-logs-aws.cloudtrail-default-2026.07.${String(i + 1).padStart(2, '0')}-000001`,
      hit_count: 25 - i,
      required: true,
    }));
    const result = tier1Result({
      per_index: perIndex,
      counts: { total_hits: 325, returned_hits: 25, affected_hosts: 0, affected_users: 0 },
    });

    expect(schemaIssues(result)).toEqual([]);
    const [entry] = buildSseData(result, 'tr-1', { spaceId: 'default' });
    const kept = huntResultOf(entry).tier1.per_index;
    expect(kept).toHaveLength(20);
    expect(kept.map((row) => row.index)).toEqual(perIndex.slice(0, 20).map((row) => row.index));
    expect(huntResultOf(entry).tier1.per_index_truncated).toBe(true);
  });

  it('writes actionable_indices when present and omits them when empty', () => {
    const withActionable = tier1Result({});
    const [withEntry] = buildSseData(withActionable, 'tr-1', { spaceId: 'default' });
    expect(huntResultOf(withEntry).actionable_indices).toEqual(['logs-endpoint.events.process-*']);

    const withoutActionable: HuntCoordinatorCoreResult = {
      ...tier1Result({}),
      actionable_indices: [],
    };
    const [withoutEntry] = buildSseData(withoutActionable, 'tr-1', { spaceId: 'default' });
    expect(huntResultOf(withoutEntry).actionable_indices).toBeUndefined();
  });

  it('caps actionable_indices at 64', () => {
    const patterns = Array.from({ length: 70 }, (_, i) => `logs-endpoint.events.process-${i}-*`);
    const result: HuntCoordinatorCoreResult = {
      ...tier1Result({}),
      actionable_indices: patterns,
    };

    expect(schemaIssues(result)).toEqual([]);
    const [entry] = buildSseData(result, 'tr-1', { spaceId: 'default' });
    expect(huntResultOf(entry).actionable_indices).toEqual(patterns.slice(0, 64));
  });

  it('never emits a technology security_knowledge_indicator', () => {
    const [entry] = buildSseData(tier1Result({}), 'tr-1', { spaceId: 'default' });
    expect(
      entry.data.security_knowledge_indicators.some((indicator) => indicator.type === 'technology')
    ).toBe(false);
  });

  it('caps resolved IOCs and keeps the technique indicator ahead of the IOC echo', () => {
    // The request accepts 100 IOCs; the schema accepts 50 on both arrays that echo them.
    const resolvedIocs = Array.from({ length: 60 }, (_, i) => ({
      type: 'ip' as const,
      value: `10.0.0.${i}`,
    }));
    const result: HuntCoordinatorCoreResult = {
      ...tier1Result({ resolved_iocs: resolvedIocs }),
      tier2: {
        tier: 2,
        status: 'behaviors_proposed',
        behaviors: [
          {
            technique_id: 'T1078.004',
            evidence_quote: 'q',
            llm_confidence: 0.9,
            confidence: 0.9,
            technique_name: 'Valid Accounts: Cloud Accounts',
            reference: 'https://attack.mitre.org/techniques/T1078/004/',
            tactic_ids: ['TA0001'],
            validated_esql: 'FROM logs-aws.cloudtrail-default | WHERE true',
            title: 'AssumeRole into high-risk policy boundary',
            severity: 'high',
            risk_score: 73,
            execution: { executed: true, row_count: 1, hit: true },
          },
        ],
        indexed_behaviors: [],
        has_hit: true,
        next_step: 'n/a',
      },
    };

    expect(schemaIssues(result)).toEqual([]);
    const [entry] = buildSseData(result, 'tr-1', { spaceId: 'default' });
    expect(huntResultOf(entry).tier1.resolved_iocs).toHaveLength(50);
    expect(huntResultOf(entry).tier1.resolved_iocs_truncated).toBe(true);
    expect(entry.data.security_knowledge_indicators).toHaveLength(50);
    expect(
      entry.data.security_knowledge_indicators.some(
        (indicator) => indicator.type === 'technique' && indicator.technique_id === 'T1078.004'
      )
    ).toBe(true);
  });

  it('bounds the report-scoped fallback to the behaviors the schema accepts', () => {
    // Tier 2's generation budget caps how many proposals get a query, not how many validate,
    // so `behaviors` can arrive longer than 20. The fallback entry is the one that lists them
    // all, and it is the only SSE the run produces — an overflow loses the finding entirely.
    const behaviors = Array.from({ length: 21 }, (_, i) =>
      behaviorFixture({
        technique_id: `T90${String(i).padStart(2, '0')}`,
        title: `Proposed rule ${i}`,
        execution: { executed: true, row_count: 0, hit: false },
      })
    );
    const result = withBehaviors(tier1Result({}), behaviors);

    expect(schemaIssues(result)).toEqual([]);
    const [entry] = buildSseData(result, 'tr-1', { spaceId: 'default' });

    // Report-scoped: no technique corroborated, so nothing narrowed the list.
    expect(entry.attachment_id).toEqual(
      buildSseAttachmentId({ spaceId: 'default', reportId: 'tr-1' })
    );
    expect(huntResultOf(entry).tier2?.behaviors).toHaveLength(20);
    expect(huntResultOf(entry).tier2?.behaviors_truncated).toBe(true);
  });

  it('trims an affected host the schema would reject rather than losing the attachment', () => {
    // Tier 2 bounds how many host/user values it keeps, not how long each is, and an ES|QL
    // rule the model wrote can evaluate a column into something longer than the schema allows.
    const result = withBehaviors(tier1Result({}), [
      behaviorFixture({
        affected_hosts: ['h'.repeat(513)],
        affected_users: ['u'.repeat(600)],
      }),
    ]);

    expect(schemaIssues(result)).toEqual([]);
    const [entry] = buildSseData(result, 'tr-1', { spaceId: 'default' });
    const [behavior] = huntResultOf(entry).tier2?.behaviors ?? [];

    expect(behavior.affected_hosts?.[0]).toHaveLength(512);
    expect(behavior.affected_users?.[0]).toHaveLength(512);
  });

  it('does not count an execution that reached no verdict as evidence of a clean environment', () => {
    // Tier 2 reports `hit: false` both for "nothing there" and for rows it could not evaluate
    // against the required indices. Only the first is evidence the environment is clean.
    const result = withBehaviors(tier1Result({}), [
      behaviorFixture({
        technique_id: 'T1078.004',
        execution: { executed: true, row_count: 0, hit: false },
      }),
      behaviorFixture({
        technique_id: 'T1552.001',
        execution: {
          executed: true,
          row_count: 0,
          hit: false,
          inconclusive_reason: 'rows_unclassifiable',
        },
      }),
    ]);

    expect(schemaIssues(result)).toEqual([]);
    const [entry] = buildSseData(result, 'tr-1', { spaceId: 'default' });

    expect(entry.data.evidence_against).toEqual([
      'Tier 2 executed 1 proposed technique(s) with no required-index rows: T1078.004.',
    ]);
    // The reason survives in the structured payload, so the distinction is recoverable
    // rather than asserted in prose the schema cannot check.
    expect(huntResultOf(entry).tier2?.behaviors[1].execution).toEqual({
      executed: true,
      row_count: 0,
      hit: false,
      inconclusive_reason: 'rows_unclassifiable',
    });
  });

  it('shares the event cap between the tiers instead of letting Tier 1 fill it', () => {
    // Tier 1 returns up to the coordinator's `size: 100`, and `events` caps at 50, so
    // appending Tier 2 after Tier 1 drops every ref to the behavior that confirmed
    // the technique — the SSE keeps the report's sample and loses its own evidence.
    const hits = Array.from({ length: 50 }, (_, i) => ({
      id: `tier1-evt-${i}`,
      index: 'logs-aws.cloudtrail-default',
      timestamp: '2026-07-30T13:05:00.000Z',
    }));
    const result = withBehaviors(
      tier1Result({
        hits,
        counts: { total_hits: 50, returned_hits: 50, affected_hosts: 0, affected_users: 0 },
        per_index: [{ index: 'logs-aws.cloudtrail-default', hit_count: 50, required: true }],
      }),
      [
        behaviorFixture({
          hits: [
            {
              id: 't2-evt-1',
              index: 'logs-aws.cloudtrail-default',
              timestamp: '2026-07-30T14:00:00.000Z',
            },
          ],
        }),
      ]
    );

    expect(schemaIssues(result)).toEqual([]);
    const [entry] = buildSseData(result, 'tr-1', { spaceId: 'default' });

    expect(entry.data.events).toHaveLength(50);
    expect(entry.data.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          event_id: 't2-evt-1',
          matched: { technique_id: 'T1078.004', field: '_id' },
        }),
      ])
    );
    // The Tier 1 count quoted to the reader is the refs the entry carries, not the
    // ones it was offered.
    expect(entry.data.evidence_for).toContain(
      'Tier 1 matched 50 event(s) for this report in the hunt window, at least one in a required index; 49 are referenced here (see hunt_result.tier1.per_index for the required/optional split).'
    );
  });

  it('shares the entity cap between the tiers instead of letting Tier 1 fill it', () => {
    // 50 Tier 1 affected hosts are within the default `maxAssets`, and `entities` caps
    // at 50, so the technique's own host and user are the ones that fall off.
    const hosts = Array.from({ length: 50 }, (_, i) => ({
      name: `tier1-host-${i}`,
      hit_count: 1,
    }));
    const result = withBehaviors(
      tier1Result({
        affected_assets: { hosts, users: [], services: [] },
        counts: { total_hits: 1, returned_hits: 1, affected_hosts: 50, affected_users: 0 },
      }),
      [
        behaviorFixture({
          affected_hosts: ['ci-deploy-runner-07'],
          affected_users: ['svc-deploy-bot'],
        }),
      ]
    );

    expect(schemaIssues(result)).toEqual([]);
    const [entry] = buildSseData(result, 'tr-1', { spaceId: 'default' });

    expect(entry.data.entities).toHaveLength(50);
    expect(entry.data.entities).toEqual(
      expect.arrayContaining([
        { field: 'host.name', value: 'ci-deploy-runner-07' },
        { field: 'user.name', value: 'svc-deploy-bot' },
      ])
    );
    expect(entry.data.truncated).toBe(true);
    expect(entry.data.truncated_original_count).toBe(52);
  });

  it('does not call an entry truncated because both tiers named the same host', () => {
    const result = withBehaviors(
      tier1Result({
        affected_assets: {
          hosts: [{ name: 'ci-deploy-runner-07', hit_count: 1 }],
          users: [],
          services: [],
        },
        counts: { total_hits: 1, returned_hits: 1, affected_hosts: 1, affected_users: 0 },
      }),
      [behaviorFixture({ affected_hosts: ['ci-deploy-runner-07'] })]
    );

    const [entry] = buildSseData(result, 'tr-1', { spaceId: 'default' });

    expect(entry.data.entities).toEqual([{ field: 'host.name', value: 'ci-deploy-runner-07' }]);
    expect(entry.data.truncated).toBeUndefined();
    expect(entry.data.truncated_original_count).toBeUndefined();
  });

  it('normalizes offset and epoch hit timestamps to ISO and drops unparseable ones', () => {
    const result = tier1Result({
      hits: [
        {
          id: 'evt-offset',
          index: 'logs-aws.cloudtrail-default',
          timestamp: '2026-07-30T15:05:00+02:00',
        },
        { id: 'evt-epoch', index: 'logs-aws.cloudtrail-default', timestamp: '1785416700000' },
        { id: 'evt-garbage', index: 'logs-aws.cloudtrail-default', timestamp: 'not a time' },
        // Date math in a document is malformed data, not a relative instant.
        { id: 'evt-datemath', index: 'logs-aws.cloudtrail-default', timestamp: 'now-1d' },
      ],
      counts: { total_hits: 4, returned_hits: 4, affected_hosts: 0, affected_users: 0 },
      per_index: [{ index: 'logs-aws.cloudtrail-default', hit_count: 4, required: true }],
    });

    expect(schemaIssues(result)).toEqual([]);
    const [entry] = buildSseData(result, 'tr-1', { spaceId: 'default' });
    const byId = new Map(entry.data.events?.map((event) => [event.event_id, event.timestamp]));
    expect(byId.get('evt-offset')).toBe('2026-07-30T13:05:00.000Z');
    expect(byId.get('evt-epoch')).toBe('2026-07-30T13:05:00.000Z');
    expect(byId.get('evt-garbage')).toBeUndefined();
    expect(byId.get('evt-datemath')).toBeUndefined();
    expect(entry.data.timeline).toHaveLength(2);
  });
});
