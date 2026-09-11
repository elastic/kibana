/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { compareSignals, computeContentHash } from './lead_matching';
import type { LeadSignal } from './lead_matching';

const BASE_ENTITY = { type: 'user', id: 'user:alice', name: 'alice' };

const BASE_OBSERVATIONS: LeadSignal[] = [
  { moduleId: 'risk_analysis', type: 'high_risk_score', severity: 'high' },
  { moduleId: 'alert_analysis', type: 'alert_spike', severity: 'medium' },
];

describe('compareSignals', () => {
  it('returns equal for identical sets', () => {
    expect(compareSignals(BASE_OBSERVATIONS, BASE_OBSERVATIONS)).toBe('equal');
  });

  it('returns equal regardless of array order', () => {
    expect(compareSignals(BASE_OBSERVATIONS, [...BASE_OBSERVATIONS].reverse())).toBe('equal');
  });

  it('returns escalated when a new moduleId:type is added', () => {
    const existing: LeadSignal[] = [BASE_OBSERVATIONS[0]];
    expect(compareSignals(BASE_OBSERVATIONS, existing)).toBe('escalated');
  });

  it('returns escalated when the same moduleId:type escalates severity (medium -> high)', () => {
    const existing: LeadSignal[] = [
      { moduleId: 'risk_analysis', type: 'high_risk_score', severity: 'medium' },
    ];
    const candidate: LeadSignal[] = [
      { moduleId: 'risk_analysis', type: 'high_risk_score', severity: 'high' },
    ];
    expect(compareSignals(candidate, existing)).toBe('escalated');
  });

  it('returns decayed when the same moduleId:type drops severity (high -> medium)', () => {
    const existing: LeadSignal[] = [
      { moduleId: 'risk_analysis', type: 'high_risk_score', severity: 'high' },
    ];
    const candidate: LeadSignal[] = [
      { moduleId: 'risk_analysis', type: 'high_risk_score', severity: 'medium' },
    ];
    expect(compareSignals(candidate, existing)).toBe('decayed');
  });

  it('returns decayed when a moduleId:type disappears', () => {
    const existing: LeadSignal[] = BASE_OBSERVATIONS;
    const candidate: LeadSignal[] = [BASE_OBSERVATIONS[0]];
    expect(compareSignals(candidate, existing)).toBe('decayed');
  });

  it('returns escalated when one signal is added and another removed (addition wins)', () => {
    const existing: LeadSignal[] = [BASE_OBSERVATIONS[0]];
    const candidate: LeadSignal[] = [
      { moduleId: 'anomaly_detection', type: 'ml_anomaly', severity: 'high' },
    ];
    expect(compareSignals(candidate, existing)).toBe('escalated');
  });

  it('returns equal for duplicate moduleId:type at differing severities when max is unchanged', () => {
    const existing: LeadSignal[] = [
      { moduleId: 'risk_analysis', type: 'high_risk_score', severity: 'high' },
    ];
    const candidate: LeadSignal[] = [
      { moduleId: 'risk_analysis', type: 'high_risk_score', severity: 'medium' },
      { moduleId: 'risk_analysis', type: 'high_risk_score', severity: 'high' },
    ];
    expect(compareSignals(candidate, existing)).toBe('equal');
  });
});

describe('computeContentHash', () => {
  it('returns the same hash for the same observations', () => {
    expect(computeContentHash({ observations: BASE_OBSERVATIONS })).toBe(
      computeContentHash({ observations: BASE_OBSERVATIONS })
    );
  });

  it('is stable regardless of observation order', () => {
    const a = computeContentHash({ observations: BASE_OBSERVATIONS });
    const b = computeContentHash({
      observations: [...BASE_OBSERVATIONS].reverse(),
    });
    expect(a).toBe(b);
  });

  it('is stable across duplicate triples that collapse to the same max severity', () => {
    const a = computeContentHash({ observations: BASE_OBSERVATIONS });
    const b = computeContentHash({
      observations: [...BASE_OBSERVATIONS, BASE_OBSERVATIONS[0]],
    });
    expect(a).toBe(b);
  });

  it('does not depend on the entity — entity identity is a separate key', () => {
    const a = computeContentHash({ observations: BASE_OBSERVATIONS });
    const b = computeContentHash({ observations: BASE_OBSERVATIONS });
    expect(a).toBe(b);
    // Same signals for different entities still share a content hash; lookup is
    // scoped by the lead id (derived from the entity's EUID) before comparing content_hash.
    expect(a).not.toBe(BASE_ENTITY.id);
  });

  it('produces different hashes for different observation types', () => {
    const a = computeContentHash({ observations: BASE_OBSERVATIONS });
    const b = computeContentHash({
      observations: [{ moduleId: 'risk_analysis', type: 'lateral_movement', severity: 'high' }],
    });
    expect(a).not.toBe(b);
  });

  it('produces different hashes when the same type comes from a different module', () => {
    const a = computeContentHash({
      observations: [{ moduleId: 'risk_analysis', type: 'high_risk_score', severity: 'high' }],
    });
    const b = computeContentHash({
      observations: [{ moduleId: 'entity_attributes', type: 'high_risk_score', severity: 'high' }],
    });
    expect(a).not.toBe(b);
  });

  it('changes when a new moduleId:type is added (update signal)', () => {
    const hashV1 = computeContentHash({
      observations: [{ moduleId: 'risk_analysis', type: 'high_risk_score', severity: 'high' }],
    });
    const hashV2 = computeContentHash({
      observations: [
        { moduleId: 'risk_analysis', type: 'high_risk_score', severity: 'high' },
        { moduleId: 'alert_analysis', type: 'alert_spike', severity: 'medium' },
      ],
    });
    expect(hashV1).not.toBe(hashV2);
  });

  it('differs when max severity for a key changes', () => {
    const day1 = computeContentHash({
      observations: [{ moduleId: 'risk_analysis', type: 'high_risk_score', severity: 'low' }],
    });
    const day2 = computeContentHash({
      observations: [{ moduleId: 'risk_analysis', type: 'high_risk_score', severity: 'critical' }],
    });
    expect(day1).not.toBe(day2);
  });
});
