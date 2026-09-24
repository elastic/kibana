/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { significantSecurityEventAttachmentDataSchema } from '../../../../../common/significant_security_event_schema';
import { huntCoordinator } from '../hunt_coordinator';
import { buildSseData, buildSseAttachmentId } from './sse_mapper';

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
      score: 1.2,
      '@timestamp': '2026-07-30T13:05:00.000Z',
    },
    {
      index: '.alerts-security.alerts-default',
      id: 'evt-2',
      score: 0.9,
      '@timestamp': '2026-07-30T13:06:00.000Z',
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
      hit_refs: [
        {
          event_id: 't2-evt-1',
          source_index: '.ds-logs-aws.cloudtrail-default-2026.07.30-000001',
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
      hit_refs: [
        {
          event_id: 't2-evt-2',
          source_index: '.ds-logs-endpoint.events.file-default-2026.07.30-000001',
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

    const coordinatorResult = await huntCoordinator(esClient, {} as never, logger, {
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

    expect(entry.data.hunt_result.has_confirmed_hit).toBe(true);
    expect(entry.data.hunt_result.tier1.status).toBe('environment_hits_found');
    expect(entry.data.hunt_result.tier1.counts.total_hits).toBe(4);
    expect(entry.data.hunt_result.tier1.per_index).toEqual([
      { index: '.ds-logs-aws.cloudtrail-default-2026.07.30-000001', hit_count: 3, required: true },
      { index: '.alerts-security.alerts-default', hit_count: 1, required: false },
    ]);
    expect(entry.data.hunt_result.tier1.resolved_iocs).toEqual([
      { type: 'hash', value: '9f2b1e7c4a6d8e0f1b3c5d7e9f0a1b2c' },
    ]);
    expect(entry.data.hunt_result.tier2).toBeDefined();
    expect(entry.data.hunt_result.tier2?.status).toBe('behaviors_proposed');
    expect(entry.data.hunt_result.tier2?.behaviors[0].technique_id).toBe('T1078.004');

    expect(entry.data.entities).toEqual(
      expect.arrayContaining([
        { field: 'host.name', value: 'ci-deploy-runner-07' },
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
    expect(secondEntry.data.hunt_result.tier2?.behaviors.map((b) => b.technique_id)).toEqual([
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

    const coordinatorResult = await huntCoordinator(esClient, {} as never, logger, {
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
    expect(entries[0].data.hunt_result.has_confirmed_hit).toBe(true);
    expect(entries[0].data.hunt_result.tier2?.status).toBe('no_behaviors_found');
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
      time_range: { from: 'now-24h', to: 'now' },
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

    const coordinatorResult = await huntCoordinator(esClient, {} as never, logger, {
      report_id: 'tr-clean-2026-07-28',
      spaceId: 'default',
      trigger: 'scheduled',
      run_id: 'run-hunt-clean',
      tier2_when: 'on_hits',
    });

    const entries = buildSseData(coordinatorResult, 'tr-clean-2026-07-28', { spaceId: 'default' });

    expect(entries).toHaveLength(1);
    expect(entries[0].data.hunt_result.has_confirmed_hit).toBe(false);
    expect(entries[0].data.hunt_result.tier2).toBeUndefined();
    expect(entries[0].data.entities).toEqual([]);
    expect(entries[0].data.events).toEqual([]);
    expect(entries[0].data.alerts).toEqual([]);
  });
});

describe('buildSseData output parses against the SSE attachment schema', () => {
  it('validates a full hit-with-behaviors entry against significantSecurityEventAttachmentDataSchema', async () => {
    const { huntForThreat } = jest.requireMock('../tier1/hunt_for_threat');
    const { huntBehavior } = jest.requireMock('../tier2/hunt_behavior');
    huntForThreat.mockResolvedValue(HIT_TIER1_RESULT);
    huntBehavior.mockResolvedValue(HIT_TIER2_RESULT_TWO_BEHAVIORS);

    const coordinatorResult = await huntCoordinator(esClient, {} as never, logger, {
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

    // The caller fills in title/severity/status/hypothesis_tested/evidence_for/
    // evidence_against/evaluation_record_ref before writing the attachment. Schema
    // lock: buildSseData's own fields (report_id, run_id, source_watch, capability,
    // security_knowledge_indicators, entities, events, hunt_result) must parse
    // as-is against the real SSE schema with no cast.
    const candidateAttachment = {
      ...entry.data,
      title: 'AssumeRole into OrgAdminBoundary from ci-deploy-runner-07',
      severity: 'high' as const,
      confidence: 0.82,
      status: 'open' as const,
      timeline: [
        { at: '2026-07-30T13:05:00.000Z', what: 'AssumeRole into OrgAdminBoundary observed.' },
      ],
      hypothesis_tested:
        'A rarely used identity assumed a high-privilege role outside business hours.',
      evidence_for: ["AssumeRole event outside the identity's normal access pattern."],
      evidence_against: [] as string[],
      evaluation_record_ref: 'eval-run-hunt-20260730T160000Z',
    };

    const parsed = significantSecurityEventAttachmentDataSchema.safeParse(candidateAttachment);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.report_id).toBe('tr-aws-iam-assumerole-2026-07-28');
      expect(parsed.data.hunt_result?.has_confirmed_hit).toBe(true);
      // `entry` is the first of two technique-scoped SSEs (HIT_TIER2_RESULT_TWO_BEHAVIORS
      // confirms T1078.004 and T1552.001). hunt_result.tier2.behaviors is filtered to this
      // entry's own technique alone, so length 1, not 2.
      expect(parsed.data.hunt_result?.tier2?.behaviors).toHaveLength(1);
      expect(parsed.data.hunt_result?.tier2?.behaviors?.[0]?.technique_id).toBe('T1078.004');
    }
  });
});
