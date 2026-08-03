/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { computeConfidenceFactors, toBand } from './compute_confidence_factors';
import { parseAnonymizedAlertsCsv, splitMultiValue } from './parse_anonymized_alerts_csv';
import type { ParsedAlertFields } from './types';

const rows = (...entries: ParsedAlertFields[]): ParsedAlertFields[] => entries;

describe('computeConfidenceFactors (generic alert bundle)', () => {
  it('scores a bundle directly from alert rows (no discovery)', () => {
    const result = computeConfidenceFactors({
      alertRows: rows(
        {
          'event.category': 'process',
          'event.dataset': 'endpoint.events.process',
          'threat.tactic.id': 'TA0002',
          'threat.technique.id': 'T1059',
          'host.name': 'h',
        },
        {
          'event.category': 'network',
          'event.dataset': 'endpoint.events.network',
          'threat.tactic.id': 'TA0011',
          'threat.technique.id': 'T1071',
          'host.name': 'h',
        }
      ),
    });

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

  it('uses the MITRE tactic-name fallback when the alerts lack threat.tactic.id', () => {
    const result = computeConfidenceFactors({
      alertRows: rows({ 'event.dataset': 'endpoint.events.process' }),
      mitreTacticNamesFallback: ['Execution', 'Persistence', 'Defense Evasion'],
    });
    expect(result.factors.find((f) => f.name === 'mitre_completeness')?.assessment).toContain(
      '3 tactics'
    );
  });

  it('honors an explicit alertCount for breadth (e.g. cited > matched)', () => {
    const single = rows({
      'event.category': 'process',
      'event.dataset': 'endpoint.events.process',
    });
    const withMoreCited = computeConfidenceFactors({ alertRows: single, alertCount: 5 });
    const asIs = computeConfidenceFactors({ alertRows: single });
    const breadth = (r: ReturnType<typeof computeConfidenceFactors>) =>
      r.factors.find((f) => f.name === 'evidence_breadth')?.weight ?? 0;
    expect(breadth(withMoreCited)).toBeGreaterThan(breadth(asIs));
  });

  it('penalizes counter-evidence (trusted signatures + benign disposition)', () => {
    const result = computeConfidenceFactors({
      alertRows: rows(
        {
          'process.code_signature.trusted': 'true',
          'kibana.alert.severity': 'low',
          'kibana.alert.workflow_status': 'acknowledged',
        },
        { 'process.code_signature.trusted': 'true', 'kibana.alert.severity': 'low' }
      ),
    });
    expect(result.counterStrength).toBeGreaterThan(0.9);
    expect(result.factors.find((f) => f.name === 'counter_evidence')?.weight).toBeLessThan(0);
  });

  it('handles an empty bundle without throwing', () => {
    const result = computeConfidenceFactors({ alertRows: [] });
    expect(result.matchedAlertCount).toBe(0);
    expect(result.counterStrength).toBe(0);
    expect(result.baseScore).toBeGreaterThanOrEqual(0);
  });
});

describe('toBand', () => {
  it('maps scores to high / medium / low', () => {
    expect(toBand(0.85)).toBe('high');
    expect(toBand(0.7)).toBe('high');
    expect(toBand(0.69)).toBe('medium');
    expect(toBand(0.4)).toBe('medium');
    expect(toBand(0.39)).toBe('low');
  });
});

describe('parseAnonymizedAlertsCsv', () => {
  it('parses field,value lines keyed by _id and splits multi-values', () => {
    const byId = parseAnonymizedAlertsCsv([
      { page_content: '_id,a1\nevent.category,process,network\nhost.name,h' },
    ]);
    expect(byId.get('a1')?.['event.category']).toBe('process,network');
    expect(splitMultiValue(byId.get('a1')?.['event.category'])).toEqual(['process', 'network']);
  });
});
