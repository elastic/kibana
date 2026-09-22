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

  it('rejects a payload missing a required field', () => {
    const { title, ...rest } = validPayload;

    const result = significantSecurityEventAttachmentDataSchema.safeParse(rest);

    expect(result.success).toBe(false);
  });

  it('rejects severity outside the allowed enum', () => {
    const result = significantSecurityEventAttachmentDataSchema.safeParse({
      ...validPayload,
      severity: 'catastrophic',
    });

    expect(result.success).toBe(false);
  });

  it('rejects confidence out of the [0, 1] range', () => {
    const result = significantSecurityEventAttachmentDataSchema.safeParse({
      ...validPayload,
      confidence: 1.5,
    });

    expect(result.success).toBe(false);
  });

  it('rejects arrays exceeding the 50-item cap', () => {
    const result = significantSecurityEventAttachmentDataSchema.safeParse({
      ...validPayload,
      entities: Array.from({ length: 51 }, (_, i) => ({
        field: 'user.name' as const,
        value: `entity-${i}`,
      })),
    });

    expect(result.success).toBe(false);
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

  it('accepts structured alerts with index', () => {
    const result = significantSecurityEventAttachmentDataSchema.safeParse({
      ...validPayload,
      alerts: [
        {
          alert_id: 'alert-1',
          index: '.alerts-security.alerts-default',
          timestamp: '2026-01-01T00:00:00.000Z',
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it('accepts the optional maps_to_proposal field when present', () => {
    const result = significantSecurityEventAttachmentDataSchema.safeParse({
      ...validPayload,
      maps_to_proposal: { category: 'containment', confidence: 0.7 },
    });

    expect(result.success).toBe(true);
  });

  it('rejects empty event_id or source_index on events', () => {
    const emptyEventId = significantSecurityEventAttachmentDataSchema.safeParse({
      ...validPayload,
      events: [{ event_id: '', source_index: 'logs-*' }],
    });
    const emptySourceIndex = significantSecurityEventAttachmentDataSchema.safeParse({
      ...validPayload,
      events: [{ event_id: 'evt-1', source_index: '' }],
    });

    expect(emptyEventId.success).toBe(false);
    expect(emptySourceIndex.success).toBe(false);
  });

  it('rejects a non-integer truncated_original_count', () => {
    const result = significantSecurityEventAttachmentDataSchema.safeParse({
      ...validPayload,
      truncated: true,
      truncated_original_count: 1.5,
    });

    expect(result.success).toBe(false);
  });

  it('accepts a well-formed hunt_result block', () => {
    const result = significantSecurityEventAttachmentDataSchema.safeParse({
      ...validPayload,
      hunt_result: {
        has_confirmed_hit: true,
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
              tactic_ids: ['TA0008'],
              confidence: 0.8,
              rule_name: 'Lateral movement via RDP',
            },
          ],
        },
      },
    });

    expect(result.success).toBe(true);
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
});
