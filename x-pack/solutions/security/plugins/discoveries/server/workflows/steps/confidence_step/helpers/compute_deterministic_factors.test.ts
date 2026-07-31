/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttackDiscovery } from '../../../../../common/step_types/shared_schemas';
import { computeDeterministicFactors, toBand } from './compute_deterministic_factors';
import type { ParsedAlertFields } from './parse_anonymized_alerts_csv';

const discoveryWith = (overrides: Partial<AttackDiscovery> = {}): AttackDiscovery => ({
  alert_ids: ['a1', 'a2'],
  details_markdown: 'details',
  summary_markdown: 'summary',
  title: 'title',
  ...overrides,
});

const factor = (
  result: ReturnType<typeof computeDeterministicFactors>,
  name: string
): number | undefined => result.factors.find((f) => f.name === name)?.weight;

describe('computeDeterministicFactors', () => {
  it('emits the four expected factors with a bounded base score', () => {
    const rowsById = new Map<string, ParsedAlertFields>([
      [
        'a1',
        {
          'event.category': 'malware,intrusion_detection',
          'event.dataset': 'endpoint.alerts',
          'threat.tactic.id': 'TA0002',
          'threat.technique.id': 'T1059',
          'host.name': 'host-token',
          '@timestamp': '2024-01-01T00:00:00Z',
        },
      ],
      [
        'a2',
        {
          'event.category': 'network',
          'event.dataset': 'endpoint.network',
          'threat.tactic.id': 'TA0011',
          'host.name': 'host-token',
          '@timestamp': '2024-01-01T00:05:00Z',
        },
      ],
    ]);

    const result = computeDeterministicFactors({ discovery: discoveryWith(), rowsById });

    expect(result.factors.map((f) => f.name)).toEqual([
      'evidence_breadth',
      'mitre_completeness',
      'chain_coherence_structural',
      'counter_evidence',
    ]);
    expect(result.matchedAlertCount).toBe(2);
    expect(result.baseScore).toBeGreaterThanOrEqual(0);
    expect(result.baseScore).toBeLessThanOrEqual(1);
  });

  it('scores evidence breadth from distinct categories + datasets', () => {
    const rowsById = new Map<string, ParsedAlertFields>([
      [
        'a1',
        { 'event.category': 'malware,intrusion_detection', 'event.dataset': 'endpoint.alerts' },
      ],
      ['a2', { 'event.category': 'network', 'event.dataset': 'endpoint.network' }],
    ]);
    // 3 distinct categories + 2 distinct datasets across 2 alerts
    const broad = factor(
      computeDeterministicFactors({ discovery: discoveryWith(), rowsById }),
      'evidence_breadth'
    )!;
    const narrow = factor(
      computeDeterministicFactors({
        discovery: discoveryWith({ alert_ids: ['a1'] }),
        rowsById: new Map([
          ['a1', { 'event.category': 'malware', 'event.dataset': 'endpoint.alerts' }],
        ]),
      }),
      'evidence_breadth'
    )!;
    expect(broad).toBeGreaterThan(narrow);
  });

  it('scores MITRE completeness at technique granularity from the CSV threat.* fields', () => {
    const rowsById = new Map<string, ParsedAlertFields>([
      ['a1', { 'threat.tactic.id': 'TA0002,TA0005', 'threat.technique.id': 'T1059,T1218' }],
      ['a2', { 'threat.tactic.id': 'TA0011', 'threat.technique.id': 'T1105' }],
    ]);
    const result = computeDeterministicFactors({ discovery: discoveryWith(), rowsById });
    const mitre = result.factors.find((f) => f.name === 'mitre_completeness');
    // 3 distinct tactics, 3 distinct techniques
    expect(mitre?.assessment).toContain('3 tactics');
    expect(mitre?.assessment).toContain('3 techniques');
    expect(mitre?.weight).toBeGreaterThan(0);
  });

  it('falls back to the discovery tactic names when the CSV lacks threat.* fields', () => {
    const rowsById = new Map<string, ParsedAlertFields>([
      ['a1', { 'event.dataset': 'endpoint.alerts' }],
    ]);
    const result = computeDeterministicFactors({
      discovery: discoveryWith({
        alert_ids: ['a1'],
        mitre_attack_tactics: ['Execution', 'Persistence', 'Defense Evasion'],
      }),
      rowsById,
    });
    expect(result.factors.find((f) => f.name === 'mitre_completeness')?.assessment).toContain(
      '3 tactics'
    );
  });

  it('penalizes counter-evidence (trusted signatures + benign disposition)', () => {
    const rowsById = new Map<string, ParsedAlertFields>([
      [
        'a1',
        {
          'process.code_signature.trusted': 'true',
          'kibana.alert.workflow_status': 'closed',
          'kibana.alert.severity': 'low',
        },
      ],
      ['a2', { 'process.code_signature.trusted': 'true', 'kibana.alert.severity': 'critical' }],
    ]);
    const result = computeDeterministicFactors({ discovery: discoveryWith(), rowsById });
    expect(result.counterStrength).toBeGreaterThan(0);
    // the counter-evidence factor is negative (it lowers confidence)
    expect(factor(result, 'counter_evidence')!).toBeLessThan(0);
  });

  it('handles discoveries whose alerts are absent from the CSV without throwing', () => {
    const result = computeDeterministicFactors({
      discovery: discoveryWith({ alert_ids: ['missing-1', 'missing-2'] }),
      rowsById: new Map(),
    });
    expect(result.matchedAlertCount).toBe(0);
    expect(result.counterStrength).toBe(0);
    expect(result.baseScore).toBeGreaterThanOrEqual(0);
    expect(result.baseScore).toBeLessThanOrEqual(1);
  });
});

describe('toBand', () => {
  it('maps scores to high / medium / low bands', () => {
    expect(toBand(0.85)).toBe('high');
    expect(toBand(0.7)).toBe('high');
    expect(toBand(0.69)).toBe('medium');
    expect(toBand(0.4)).toBe('medium');
    expect(toBand(0.39)).toBe('low');
    expect(toBand(0)).toBe('low');
  });
});
