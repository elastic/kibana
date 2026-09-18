/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { evaluateIocGate, meetsConfidenceFloor } from './report_gates';

const EXPECTED = [
  { type: 'network_destination', value: '185.220.101.42', status: 'confirmed' as const },
  { type: 'file_hash', value: 'a3f5', status: 'not_found' as const },
  { type: 'registry_key', value: 'HKCU\\Run', status: 'unable_to_validate' as const },
];

describe('evaluateIocGate', () => {
  it('passes when confirmed IoCs are confirmed and absent ones are not claimed', () => {
    const result = evaluateIocGate(EXPECTED, [
      { type: 'network_destination', value: '185.220.101.42', status: 'confirmed' },
      { type: 'file_hash', value: 'a3f5', status: 'not_found' },
      { type: 'registry_key', value: 'HKCU\\Run', status: 'unable_to_validate' },
    ]);

    expect(result.success).toBe(true);
    expect(result.matchedCount).toBe(3);
  });

  it('fails when telemetry the fixture contains was not confirmed', () => {
    const result = evaluateIocGate(EXPECTED, [
      { type: 'file_hash', value: 'a3f5', status: 'not_found' },
    ]);

    expect(result.missingConfirmed).toEqual(['network_destination::185.220.101.42']);
    expect(result.success).toBe(false);
  });

  it('fails when an absent IoC is claimed as confirmed', () => {
    // The fixture deliberately does not contain this hash; reporting it as
    // confirmed is fabrication, not a lenient reading.
    const result = evaluateIocGate(EXPECTED, [
      { type: 'network_destination', value: '185.220.101.42', status: 'confirmed' },
      { type: 'file_hash', value: 'a3f5', status: 'confirmed' },
    ]);

    expect(result.fabricatedConfirmed).toEqual(['file_hash::a3f5']);
    expect(result.success).toBe(false);
  });

  it('does not score an unvalidatable IoC in either direction', () => {
    const result = evaluateIocGate(EXPECTED, [
      { type: 'network_destination', value: '185.220.101.42', status: 'confirmed' },
      { type: 'file_hash', value: 'a3f5', status: 'not_found' },
      { type: 'registry_key', value: 'HKCU\\Run', status: 'confirmed' },
    ]);

    // Not fabricated (the expectation was not `not_found`) and not a match.
    expect(result.matchedCount).toBe(2);
    expect(result.success).toBe(true);
  });

  it('fails when nothing was validated at all', () => {
    const result = evaluateIocGate(EXPECTED, []);
    expect(result.matchedCount).toBe(0);
    expect(result.success).toBe(false);
  });
});

describe('meetsConfidenceFloor', () => {
  it('compares levels ordinally', () => {
    expect(meetsConfidenceFloor('high', 'medium')).toBe(true);
    expect(meetsConfidenceFloor('medium', 'medium')).toBe(true);
    expect(meetsConfidenceFloor('low', 'medium')).toBe(false);
  });

  it('fails an unstated confidence', () => {
    expect(meetsConfidenceFloor(undefined, 'low')).toBe(false);
    expect(meetsConfidenceFloor('', 'low')).toBe(false);
  });

  it('ranks insufficient below low', () => {
    // A report that declines to assess must not satisfy a floor of `low`.
    expect(meetsConfidenceFloor('insufficient', 'low')).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(meetsConfidenceFloor('HIGH', 'medium')).toBe(true);
  });
});
