/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { significantSecurityEventAttachmentDataSchema } from '../../../../../common/significant_security_event_schema';
import { huntCoordinator } from '../hunt_coordinator';
import { buildSseData, buildSseAttachmentId } from './sse_mapper';

jest.mock('./resolve_index_scope', () => ({
  resolveIndexScope: jest.fn().mockResolvedValue({
    technology: 'aws_iam',
    status: 'ok',
    // A wildcard pattern, matching what resolveIndexScope actually returns in
    // production (`logs-aws.*`), not a concrete `_index` bucket name. The
    // review's must-fix #1: the old fixture used a concrete index name here,
    // which made `matchesRequired`'s regex-vs-exact-string bug invisible.
    required: ['logs-aws.*'],
    optional: ['.alerts-security.alerts-default'],
    missing: [],
    window: { from: 'now-24h', to: 'now' },
    rowLimit: 100,
  }),
}));

const HIT_TIER1_RESULT = {
  status: 'environment_hits_found' as const,
  hasConfirmedHit: true,
  searchedIocs: 1,
  searchedTechniques: 0,
  resolvedIocs: [{ type: 'hash' as const, value: '9f2b1e7c4a6d8e0f1b3c5d7e9f0a1b2c' }],
  resolvedTechniques: [],
  timeRange: { from: '2026-07-30T13:00:00.000Z', to: '2026-07-30T15:00:00.000Z' },
  counts: { totalHits: 4, returnedHits: 4, affectedHosts: 1, affectedUsers: 1 },
  hits: [
    {
      index: 'logs-aws.cloudtrail-default',
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
  affectedAssets: {
    hosts: [{ name: 'ci-deploy-runner-07', hitCount: 1 }],
    users: [{ name: 'svc-deploy-bot', hitCount: 3 }],
  },
  perIndex: [
    { index: 'logs-aws.cloudtrail-default', hitCount: 3, required: true },
    { index: '.alerts-security.alerts-default', hitCount: 1, required: false },
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
    },
  ],
  indexed_behaviors: [],
  hasHit: false as const,
  next_step: 'Review the proposed rules.',
};

jest.mock('../tier1/hunt_for_threat', () => ({
  huntForThreat: jest.fn(),
}));

jest.mock('../tier2/hunt_behavior', () => ({
  huntBehavior: jest.fn(),
}));

const logger = {
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
} as unknown as import('@kbn/core/server').Logger;

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
      runId: 'run-hunt-20260730T160000Z',
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
      { index: 'logs-aws.cloudtrail-default', hit_count: 3, required: true },
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
      ])
    );

    expect(entry.data.events).toEqual([
      {
        event_id: 'evt-1',
        source_index: 'logs-aws.cloudtrail-default',
        timestamp: '2026-07-30T13:05:00.000Z',
      },
      {
        event_id: 'evt-2',
        source_index: '.alerts-security.alerts-default',
        timestamp: '2026-07-30T13:06:00.000Z',
      },
    ]);

    // `report_id` is its own top-level field (asserted separately below);
    // it's no longer duplicated into `security_knowledge_indicators`.
    expect(entry.data.report_id).toBe('tr-aws-iam-assumerole-2026-07-28');

    const iocIndicator = entry.data.security_knowledge_indicators.find((i) => i.type === 'ioc');
    expect(iocIndicator?.ioc).toEqual({ type: 'hash', value: '9f2b1e7c4a6d8e0f1b3c5d7e9f0a1b2c' });

    // Per-technique filtering (review must-fix #2): the first entry is scoped
    // to T1078.004 alone. The second technique's behavior/rule name must not
    // leak onto it, since the SSE is meant to be 1:1 with a Proposal.
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
      hasHit: false,
      next_step: 'Lower threshold.',
    });

    const coordinatorResult = await huntCoordinator(esClient, {} as never, logger, {
      report_id: 'tr-hit-no-behaviors',
      spaceId: 'default',
      text: 'AssumeRole chain',
      trigger: 'scheduled',
      runId: 'run-hunt-no-behaviors',
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
      hasConfirmedHit: false,
      searchedIocs: 0,
      searchedTechniques: 0,
      resolvedIocs: [],
      resolvedTechniques: [],
      timeRange: { from: 'now-24h', to: 'now' },
      counts: { totalHits: 0, returnedHits: 0, affectedHosts: 0, affectedUsers: 0 },
      hits: [],
      affectedAssets: { hosts: [], users: [] },
      perIndex: [],
    });
    huntBehavior.mockResolvedValue({
      status: 'no_behaviors_found',
      behaviors: [],
      indexed_behaviors: [],
      hasHit: false,
      next_step: 'n/a',
    });

    const coordinatorResult = await huntCoordinator(esClient, {} as never, logger, {
      report_id: 'tr-clean-2026-07-28',
      spaceId: 'default',
      trigger: 'scheduled',
      runId: 'run-hunt-clean',
      tier2_when: 'on_hits',
    });

    const entries = buildSseData(coordinatorResult, 'tr-clean-2026-07-28', { spaceId: 'default' });

    expect(entries).toHaveLength(1);
    expect(entries[0].data.hunt_result.has_confirmed_hit).toBe(false);
    expect(entries[0].data.hunt_result.tier2).toBeUndefined();
    expect(entries[0].data.entities).toEqual([]);
    expect(entries[0].data.events).toEqual([]);
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
      runId: 'run-hunt-20260730T160000Z',
      tier2_when: 'on_hits',
    });

    const [entry] = buildSseData(coordinatorResult, 'tr-aws-iam-assumerole-2026-07-28', {
      spaceId: 'default',
    });

    // PR 1 owns title/severity/status/hypothesis_tested/evidence_for/evidence_against/
    // evaluation_record_ref; the hunt child's packaging step fills these in before
    // writing the attachment. This is the schema lock: buildSseData's own fields
    // (report_id, run_id, source_watch, capability, security_knowledge_indicators,
    // entities, events, hunt_result) must parse as-is against PR 1's real schema, with
    // no cast, so a drift between the two PRs fails this test instead of surfacing at
    // demo time.
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
