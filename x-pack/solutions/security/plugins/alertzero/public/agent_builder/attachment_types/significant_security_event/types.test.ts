/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseSignificantSecurityEventData } from './types';

describe('parseSignificantSecurityEventData', () => {
  const baseData = {
    title: 'Suspicious lateral movement',
    severity: 'high',
    confidence: 0.8,
    status: 'open',
    source_watch: 'watch-1',
    capability: 'lateral-movement-detector',
    run_id: 'run-1',
    security_knowledge_indicators: [],
    entities: [],
    timeline: [],
    hypothesis_tested: 'hyp',
    evidence_for: [],
    evidence_against: [],
    evaluation_record_ref: 'eval-1',
  };

  const validHuntResult = {
    has_confirmed_hit: true,
    time_range: { from: '2024-01-01T00:00:00Z', to: '2024-01-02T00:00:00Z' },
    tier1: {
      status: 'environment_hits_found',
      counts: {
        total_hits: 12,
        returned_hits: 10,
        affected_hosts: 3,
        affected_users: 2,
      },
      per_index: [{ index: 'logs-endpoint.events.process-default', hit_count: 10, required: true }],
      resolved_iocs: [{ type: 'ip', value: '203.0.113.4' }],
    },
    tier2: {
      status: 'behaviors_proposed',
      behaviors: [
        {
          technique_id: 'T1021',
          tactic_ids: ['TA0008'],
          confidence: 0.9,
          rule_name: 'Suspicious RDP',
        },
      ],
    },
  };

  it('returns undefined huntResult when hunt_result is absent', () => {
    const parsed = parseSignificantSecurityEventData(baseData);
    expect(parsed?.huntResult).toBeUndefined();
  });

  it('parses a fully valid hunt_result, including tier2', () => {
    const parsed = parseSignificantSecurityEventData({
      ...baseData,
      hunt_result: validHuntResult,
    });

    expect(parsed?.huntResult).toEqual({
      hasConfirmedHit: true,
      timeRange: { from: '2024-01-01T00:00:00Z', to: '2024-01-02T00:00:00Z' },
      tier1: {
        status: 'environment_hits_found',
        counts: { totalHits: 12, returnedHits: 10, affectedHosts: 3, affectedUsers: 2 },
        perIndex: [{ index: 'logs-endpoint.events.process-default', hitCount: 10, required: true }],
        resolvedIocs: [{ type: 'ip', value: '203.0.113.4' }],
      },
      tier2: {
        status: 'behaviors_proposed',
        behaviors: [
          {
            techniqueId: 'T1021',
            tacticIds: ['TA0008'],
            confidence: 0.9,
            ruleName: 'Suspicious RDP',
          },
        ],
      },
    });
  });

  it('parses a valid hunt_result with no tier2', () => {
    const { tier2, ...huntResultWithoutTier2 } = validHuntResult;
    const parsed = parseSignificantSecurityEventData({
      ...baseData,
      hunt_result: huntResultWithoutTier2,
    });

    expect(parsed?.huntResult?.tier2).toBeUndefined();
    expect(parsed?.huntResult?.tier1.status).toBe('environment_hits_found');
  });

  it('drops the whole hunt_result when tier1 is malformed', () => {
    const parsed = parseSignificantSecurityEventData({
      ...baseData,
      hunt_result: {
        ...validHuntResult,
        tier1: { status: 'environment_hits_found' },
      },
    });

    expect(parsed?.huntResult).toBeUndefined();
  });

  it('drops only tier2 when tier2 is malformed but tier1 is valid', () => {
    const parsed = parseSignificantSecurityEventData({
      ...baseData,
      hunt_result: {
        ...validHuntResult,
        tier2: { status: 'behaviors_proposed', behaviors: [{ technique_id: 'T1021' }] },
      },
    });

    expect(parsed?.huntResult?.tier1).toBeDefined();
    expect(parsed?.huntResult?.tier2?.behaviors).toEqual([]);
  });

  it('drops malformed per_index and resolved_iocs entries but keeps valid ones', () => {
    const parsed = parseSignificantSecurityEventData({
      ...baseData,
      hunt_result: {
        ...validHuntResult,
        tier1: {
          ...validHuntResult.tier1,
          per_index: [
            { index: 'logs-endpoint.events.process-default', hit_count: 10, required: true },
            { index: 'bad-entry' },
          ],
          resolved_iocs: [{ type: 'ip', value: '203.0.113.4' }, { type: 'ip' }],
        },
      },
    });

    expect(parsed?.huntResult?.tier1.perIndex).toEqual([
      { index: 'logs-endpoint.events.process-default', hitCount: 10, required: true },
    ]);
    expect(parsed?.huntResult?.tier1.resolvedIocs).toEqual([{ type: 'ip', value: '203.0.113.4' }]);
  });

  it('returns undefined huntResult when hunt_result itself is malformed', () => {
    const parsed = parseSignificantSecurityEventData({
      ...baseData,
      hunt_result: { has_confirmed_hit: 'yes' },
    });

    expect(parsed?.huntResult).toBeUndefined();
  });
});
