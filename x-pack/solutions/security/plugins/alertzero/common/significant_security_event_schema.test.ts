/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { significantSecurityEventAttachmentDataSchema } from './significant_security_event_schema';

const validPayload = {
  attachmentLabel: 'Significant Security Event',
  title: 'Suspicious lateral movement detected',
  severity: 'high' as const,
  confidence: 0.82,
  status: 'open' as const,
  source_watch: 'lateral-movement-watch',
  capability: 'lateral-movement-detection',
  run_id: 'run-123',
  report_id: 'tr-lateral-movement-2026-01',
  security_knowledge_indicators: [
    { type: 'technique', value: 'T1021', confidence: 0.9, technique_id: 'T1021' },
  ],
  entities: [
    { field: 'host.name' as const, value: 'srv-01' },
    { field: 'user.name' as const, value: 'jdoe' },
  ],
  timeline: [{ at: '2026-01-01T00:00:00Z', what: 'RDP session established' }],
  hypothesis_tested: 'Adversary used stolen credentials to move laterally',
  evidence_for: ['RDP session from unusual host'],
  evidence_against: [],
  evaluation_record_ref: 'eval-record-1',
};

describe('significantSecurityEventAttachmentDataSchema', () => {
  it('parses a well-formed payload', () => {
    const result = significantSecurityEventAttachmentDataSchema.safeParse(validPayload);

    expect(result.success).toBe(true);
  });

  it('rejects bare entity identifiers and legacy strings', () => {
    const bare = significantSecurityEventAttachmentDataSchema.safeParse({
      ...validPayload,
      entities: ['dev-user'],
    });
    const legacyString = significantSecurityEventAttachmentDataSchema.safeParse({
      ...validPayload,
      entities: ['user.name: jdoe'],
    });

    expect(bare.success).toBe(false);
    expect(legacyString.success).toBe(false);
  });

  it('rejects unknown entity fields', () => {
    const result = significantSecurityEventAttachmentDataSchema.safeParse({
      ...validPayload,
      entities: [{ field: 'source.ip', value: '1.2.3.4' }],
    });

    expect(result.success).toBe(false);
  });

  it('rejects alerts missing index', () => {
    const result = significantSecurityEventAttachmentDataSchema.safeParse({
      ...validPayload,
      alerts: [{ alert_id: 'alert-1' }],
    });

    expect(result.success).toBe(false);
  });

  it('accepts the optional maps_to_proposal field when present', () => {
    const result = significantSecurityEventAttachmentDataSchema.safeParse({
      ...validPayload,
      maps_to_proposal: { category: 'containment', confidence: 0.7 },
    });

    expect(result.success).toBe(true);
  });

  it('rejects event source indices that could reach outside the intended source', () => {
    // `source_index` flows straight into a Discover `FROM`, and unlike `alerts[]` there is no
    // single alias to pin events to, so the shape itself has to be constrained.
    const rejected = [
      'logs-*',
      '.alerts-security.alerts-default',
      '.internal.alerts-security.alerts-default-000001',
      '.preview.alerts-security.alerts-default',
      '.kibana',
      'logs-a,logs-b',
      'remote:logs-default',
      '-logs-default',
      'logs default',
      '.ds-.alerts-security.alerts-default',
      '.ds-',
    ];

    for (const sourceIndex of rejected) {
      const result = significantSecurityEventAttachmentDataSchema.safeParse({
        ...validPayload,
        events: [{ event_id: 'evt-1', source_index: sourceIndex }],
      });
      expect([sourceIndex, result.success]).toEqual([sourceIndex, false]);
    }

    const allowed = significantSecurityEventAttachmentDataSchema.safeParse({
      ...validPayload,
      events: [{ event_id: 'evt-1', source_index: 'logs-endpoint.events.process-default' }],
    });
    expect(allowed.success).toBe(true);

    // A hit against a data stream reports its concrete backing index in `_index`, and the
    // contract says `source_index` carries that concrete source, so `.ds-` must pass even
    // though it starts with a dot.
    const dataStreamBacking = significantSecurityEventAttachmentDataSchema.safeParse({
      ...validPayload,
      events: [
        {
          event_id: 'evt-1',
          source_index: '.ds-logs-endpoint.events.process-default-2026.09.22-000001',
        },
      ],
    });
    expect(dataStreamBacking.success).toBe(true);
  });

  it('rejects hunt results whose status contradicts its counts', () => {
    // Each Tier 1 status names its own outcome, so a status that says nothing was found
    // alongside nonzero counts (or the reverse) renders as two contradicting claims.
    const contradictions = [
      { status: 'no_environment_hits' as const, total: 4, confirmed: false, sources: [] as const },
      { status: 'no_searchable_terms' as const, total: 4, confirmed: false, sources: [] as const },
      { status: 'environment_hits_found' as const, total: 0, confirmed: false, sources: [] as const },
      // Confirmed a hit while Tier 1 reports it could not search anything and Tier 2 did not hit.
      {
        status: 'no_searchable_terms' as const,
        total: 0,
        confirmed: true,
        sources: ['tier1'] as const,
      },
    ];

    for (const { status, total, confirmed, sources } of contradictions) {
      const result = significantSecurityEventAttachmentDataSchema.safeParse({
        ...validPayload,
        hunt_result: {
          has_confirmed_hit: confirmed,
          hit_sources: [...sources],
          time_range: { from: '2026-01-01T00:00:00Z', to: '2026-01-02T00:00:00Z' },
          tier1: {
            status,
            counts: {
              total_hits: total,
              returned_hits: total,
              affected_hosts: 0,
              affected_users: 0,
            },
            per_index: [],
            resolved_iocs: [],
          },
        },
      });
      expect([status, total, confirmed, result.success]).toEqual([status, total, confirmed, false]);
    }
  });

  it('rejects a hunt result whose returned hits exceed its total hits', () => {
    // Returned hits are a sample of total hits. A larger value is a producer bug, and both
    // renderers hide it (they only surface returned_hits when it is smaller), so the
    // contradictory payload would silently read as a complete result set.
    const base = {
      has_confirmed_hit: true,
      hit_sources: ['tier1'] as Array<'tier1' | 'tier2'>,
      time_range: { from: '2026-01-01T00:00:00Z', to: '2026-01-02T00:00:00Z' },
      tier1: {
        status: 'environment_hits_found' as const,
        counts: { total_hits: 9, returned_hits: 5, affected_hosts: 1, affected_users: 1 },
        per_index: [],
        resolved_iocs: [],
      },
      tier2: {
        status: 'no_behaviors_found' as const,
        behaviors: [],
      },
    };

    const invalid = significantSecurityEventAttachmentDataSchema.safeParse({
      ...validPayload,
      hunt_result: {
        ...base,
        tier1: { ...base.tier1, counts: { ...base.tier1.counts, total_hits: 5, returned_hits: 9 } },
      },
    });
    expect(invalid.success).toBe(false);

    const valid = significantSecurityEventAttachmentDataSchema.safeParse({
      ...validPayload,
      hunt_result: base,
    });
    expect(valid.success).toBe(true);
  });

  it('accepts a well-formed hunt_result block', () => {
    const result = significantSecurityEventAttachmentDataSchema.safeParse({
      ...validPayload,
      hunt_result: {
        has_confirmed_hit: true,
        hit_sources: ['tier1'],
        time_range: { from: '2026-01-01T00:00:00.000Z', to: '2026-01-01T02:00:00.000Z' },
        tier1: {
          status: 'environment_hits_found',
          counts: { total_hits: 3, returned_hits: 3, affected_hosts: 1, affected_users: 1 },
          per_index: [{ index: 'logs-aws.cloudtrail-default', hit_count: 3, required: true }],
          resolved_iocs: [{ type: 'hash', value: 'abc123' }],
        },
        tier2: {
          status: 'behaviors_proposed',
          behaviors: [
            {
              technique_id: 'T1021',
              technique_name: 'Remote Services',
              tactic_ids: ['TA0008'],
              confidence: 0.8,
              rule_name: 'Lateral movement via RDP',
              proposed_esql_rule: 'FROM logs-* | WHERE true',
              execution: { executed: true, row_count: 0, hit: false },
            },
          ],
        },
      },
    });

    expect(result.success).toBe(true);
  });

  it('accepts a Tier 2-only confirmed hit', () => {
    const result = significantSecurityEventAttachmentDataSchema.safeParse({
      ...validPayload,
      hunt_result: {
        has_confirmed_hit: true,
        hit_sources: ['tier2'],
        time_range: { from: '2026-01-01T00:00:00.000Z', to: '2026-01-01T02:00:00.000Z' },
        tier1: {
          status: 'no_environment_hits',
          counts: { total_hits: 0, returned_hits: 0, affected_hosts: 0, affected_users: 0 },
          per_index: [],
          resolved_iocs: [],
        },
        tier2: {
          status: 'behaviors_proposed',
          behaviors: [
            {
              technique_id: 'T1078.004',
              tactic_ids: ['TA0001'],
              confidence: 0.9,
              rule_name: 'AssumeRole into high-risk policy boundary',
              proposed_esql_rule: 'FROM logs-aws.cloudtrail-* | WHERE true',
              execution: { executed: true, row_count: 3, hit: true },
              affected_hosts: ['WIN-ANALYST01'],
            },
          ],
        },
      },
    });

    expect(result.success).toBe(true);
  });

  it('rejects has_confirmed_hit with clean Tier 1 and no Tier 2 execution hit', () => {
    const result = significantSecurityEventAttachmentDataSchema.safeParse({
      ...validPayload,
      hunt_result: {
        has_confirmed_hit: true,
        hit_sources: ['tier1'],
        time_range: { from: '2026-01-01T00:00:00.000Z', to: '2026-01-01T02:00:00.000Z' },
        tier1: {
          status: 'no_searchable_terms',
          counts: { total_hits: 0, returned_hits: 0, affected_hosts: 0, affected_users: 0 },
          per_index: [],
          resolved_iocs: [],
        },
        tier2: {
          status: 'behaviors_proposed',
          behaviors: [
            {
              technique_id: 'T1078.004',
              tactic_ids: ['TA0001'],
              confidence: 0.9,
              rule_name: 'AssumeRole into high-risk policy boundary',
              execution: { executed: true, row_count: 0, hit: false },
            },
          ],
        },
      },
    });

    expect(result.success).toBe(false);
  });

  describe('security_knowledge_indicators custom refinements', () => {
    it('rejects a technique indicator missing technique_id', () => {
      const result = significantSecurityEventAttachmentDataSchema.safeParse({
        ...validPayload,
        security_knowledge_indicators: [{ type: 'technique', value: 'T1021' }],
      });

      expect(result.success).toBe(false);
    });

    it('rejects an ioc indicator missing ioc', () => {
      const result = significantSecurityEventAttachmentDataSchema.safeParse({
        ...validPayload,
        security_knowledge_indicators: [{ type: 'ioc', value: 'suspicious hash' }],
      });

      expect(result.success).toBe(false);
    });
  });

  describe('maps_to_proposal.actionInput custom refinements', () => {
    it('rejects actionInput with more than 50 keys', () => {
      const result = significantSecurityEventAttachmentDataSchema.safeParse({
        ...validPayload,
        maps_to_proposal: {
          actionInput: Object.fromEntries(
            Array.from({ length: 51 }, (_, i) => [`key-${i}`, 'value'])
          ),
        },
      });

      expect(result.success).toBe(false);
    });

    it('rejects actionInput when serialized size exceeds 32KB', () => {
      const result = significantSecurityEventAttachmentDataSchema.safeParse({
        ...validPayload,
        maps_to_proposal: {
          actionInput: { blob: 'x'.repeat(40_000) },
        },
      });

      expect(result.success).toBe(false);
    });
  });

  describe('field validation for navigation-bound values', () => {
    it('rejects a whitespace-only title so the label fallback is never blank', () => {
      const result = significantSecurityEventAttachmentDataSchema.safeParse({
        ...validPayload,
        title: '   ',
      });

      expect(result.success).toBe(false);
    });

    it('trims a padded title', () => {
      const result = significantSecurityEventAttachmentDataSchema.safeParse({
        ...validPayload,
        title: '  Credential access confirmed  ',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe('Credential access confirmed');
      }
    });

    it('rejects a non-datetime alert timestamp used as the redirect time range', () => {
      const result = significantSecurityEventAttachmentDataSchema.safeParse({
        ...validPayload,
        alerts: [
          {
            alert_id: 'alert-1',
            index: '.alerts-security.alerts-default',
            timestamp: 'not-a-date',
          },
        ],
      });

      expect(result.success).toBe(false);
    });

    it('accepts an ISO alert timestamp', () => {
      const result = significantSecurityEventAttachmentDataSchema.safeParse({
        ...validPayload,
        alerts: [
          {
            alert_id: 'alert-1',
            index: '.alerts-security.alerts-default',
            timestamp: '2026-09-21T10:00:00.000Z',
          },
        ],
      });

      expect(result.success).toBe(true);
    });
  });
});
