/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { ScopedModel } from '@kbn/agent-builder-server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { significantSecurityEventAttachmentDataSchema } from '../../../../../common/significant_security_event_schema';
import { huntCoordinator } from '../hunt_coordinator';
import type { HuntCoordinatorResult } from '../hunt_coordinator';
import { buildSseData, buildSseAttachmentId } from './sse_mapper';

const huntResultOf = (entry: ReturnType<typeof buildSseData>[number]) => {
  const huntResult = entry.data.hunt_result;
  if (!huntResult) throw new Error('expected hunt_result on the SSE entry');
  return huntResult;
};

jest.mock('./resolve_index_scope', () => ({
  resolveHuntScope: jest.fn().mockResolvedValue({
    technologies: ['aws_iam'],
    status: 'ok',
    // A wildcard pattern matching what resolveIndexScope returns in production
    // (`logs-aws.*`), not a concrete `_index` bucket name. The fixture must use
    // the pattern so `matchesRequired`'s regex logic is exercised correctly.
    required: ['logs-aws.*'],
    optional: ['.alerts-security.alerts-default'],
    missing: [],
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
    { index: '.ds-logs-aws.cloudtrail-default-2026.07.30-000001', hit_count: 3, required: true },
    { index: '.alerts-security.alerts-default', hit_count: 1, required: false },
  ],
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
      proposed_esql_rule: 'FROM logs-aws.cloudtrail-default | WHERE ...',
      rule_name: 'AssumeRole into high-risk policy boundary',
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
      proposed_esql_rule: 'FROM logs-endpoint.alerts-default | WHERE ...',
      rule_name: 'Credential file read on CI runner',
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

const runCoordinator = (
  params: Parameters<typeof huntCoordinator>[3]
): ReturnType<typeof huntCoordinator> =>
  huntCoordinator({ esClient, reportsEsClient: esClient }, mockModel, logger, params);

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
});

describe('buildSseData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns one SSE entry per confirmed technique on a tier1_and_tier2 hit', async () => {
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

    // One entry per confirmed technique (Tier 2 produced two behaviors here).
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
      { index: '.ds-logs-aws.cloudtrail-default-2026.07.30-000001', hit_count: 3, required: true },
      { index: '.alerts-security.alerts-default', hit_count: 1, required: false },
    ]);
    expect(huntResultOf(entry).tier1.resolved_iocs).toEqual([
      { type: 'hash', value: '9f2b1e7c4a6d8e0f1b3c5d7e9f0a1b2c' },
    ]);
    expect(huntResultOf(entry).tier2).toBeDefined();
    expect(huntResultOf(entry).tier2?.status).toBe('behaviors_proposed');
    expect(huntResultOf(entry).tier2?.behaviors[0].technique_id).toBe('T1078.004');
    expect(huntResultOf(entry).tier2?.behaviors[0].proposed_esql_rule).toContain(
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
    // Packaging fills maps_to_proposal after mint; mapper must leave it unset.
    expect('maps_to_proposal' in entry.data).toBe(false);

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

    // The hunted technologies ride along as technology indicators.
    const technologyIndicators = entry.data.security_knowledge_indicators.filter(
      (i) => i.type === 'technology'
    );
    expect(technologyIndicators).toEqual([{ type: 'technology', value: 'aws_iam' }]);

    // `report_id` is its own top-level field (asserted separately below);
    // it's no longer duplicated into `security_knowledge_indicators`.
    expect(entry.data.report_id).toBe('tr-aws-iam-assumerole-2026-07-28');

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
    huntForThreat.mockResolvedValue({
      status: 'no_environment_hits',
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
    });
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
          proposed_esql_rule: 'FROM logs-aws.cloudtrail-default | WHERE true',
          rule_name: 'AssumeRole into high-risk policy boundary',
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
    huntForThreat.mockResolvedValue({
      status: 'no_environment_hits',
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
    });
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
      expect(parsed.data.maps_to_proposal).toBeUndefined();
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
  const tier1Result = (over: Partial<HuntCoordinatorResult['tier1']>): HuntCoordinatorResult => ({
    status: 'tier1_only',
    run_id: 'run-1',
    technologies: ['aws_iam'],
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

  const schemaIssues = (result: HuntCoordinatorResult): string[] => {
    const [entry] = buildSseData(result, 'tr-1', { spaceId: 'default' });
    const parsed = significantSecurityEventAttachmentDataSchema.safeParse(entry.data);
    return parsed.success
      ? []
      : parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
  };

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

  it('keeps required per_index buckets when Tier 1 returns more than the schema cap', () => {
    // Tier 1 aggregates up to 500 `_index` buckets; the schema accepts 20.
    const perIndex = Array.from({ length: 25 }, (_, i) => ({
      index: `.ds-logs-aws.cloudtrail-default-2026.07.${String(i + 1).padStart(2, '0')}-000001`,
      hit_count: 1,
      required: i >= 5,
    }));
    const result = tier1Result({
      per_index: perIndex,
      counts: { total_hits: 25, returned_hits: 25, affected_hosts: 0, affected_users: 0 },
    });

    expect(schemaIssues(result)).toEqual([]);
    const [entry] = buildSseData(result, 'tr-1', { spaceId: 'default' });
    const kept = huntResultOf(entry).tier1.per_index;
    expect(kept).toHaveLength(20);
    expect(kept.every((row) => row.required)).toBe(true);
  });

  it('caps resolved IOCs and keeps the technique indicator ahead of the IOC echo', () => {
    // The request accepts 100 IOCs; the schema accepts 50 on both arrays that echo them.
    const resolvedIocs = Array.from({ length: 60 }, (_, i) => ({
      type: 'ip' as const,
      value: `10.0.0.${i}`,
    }));
    const result: HuntCoordinatorResult = {
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
            proposed_esql_rule: 'FROM logs-aws.cloudtrail-default | WHERE true',
            rule_name: 'AssumeRole into high-risk policy boundary',
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
    expect(entry.data.security_knowledge_indicators).toHaveLength(50);
    expect(
      entry.data.security_knowledge_indicators.some(
        (indicator) => indicator.type === 'technique' && indicator.technique_id === 'T1078.004'
      )
    ).toBe(true);
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
      ],
      counts: { total_hits: 3, returned_hits: 3, affected_hosts: 0, affected_users: 0 },
      per_index: [{ index: 'logs-aws.cloudtrail-default', hit_count: 3, required: true }],
    });

    expect(schemaIssues(result)).toEqual([]);
    const [entry] = buildSseData(result, 'tr-1', { spaceId: 'default' });
    const byId = new Map(entry.data.events?.map((event) => [event.event_id, event.timestamp]));
    expect(byId.get('evt-offset')).toBe('2026-07-30T13:05:00.000Z');
    expect(byId.get('evt-epoch')).toBe('2026-07-30T13:05:00.000Z');
    expect(byId.get('evt-garbage')).toBeUndefined();
    expect(entry.data.timeline).toHaveLength(2);
  });
});
