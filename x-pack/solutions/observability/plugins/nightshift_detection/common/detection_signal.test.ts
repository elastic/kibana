/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DETECTION_SIGNAL_SOURCE,
  detectionSignalSchema,
  storedDetectionSignalSchema,
} from './detection_signal';

const SIGNAL = {
  scheduled_timestamp: '2026-11-13T10:00:00.000Z',
  group_hash: 'abc',
  status: 'breached',
  source: DETECTION_SIGNAL_SOURCE,
  type: 'signal',
  space_id: 'default',
  data: {
    strategy: 'error_rate',
    strategy_version: 1,
    fingerprint: 'checkout',
    entity: { type: 'service', name: 'checkout' },
    bucket_start: 1_000,
    bucket_end: 61_000,
    value: 4.2,
    unit: 'percent',
    title: 'Errors up',
    description: 'More errors than usual',
    importance: 60,
    evidence_esql: 'FROM logs-*',
    role: 'primary',
    compare_with_normal: true,
    details: {},
  },
};

describe('detectionSignalSchema', () => {
  it.each(['breached', 'recovered', 'no_data'])('accepts status %s', (status) => {
    expect(detectionSignalSchema.safeParse({ ...SIGNAL, status }).success).toBe(true);
  });

  it('rejects a signal without a required field', () => {
    const { group_hash: _groupHash, ...withoutGroupHash } = SIGNAL;

    expect(detectionSignalSchema.safeParse(withoutGroupHash).success).toBe(false);
  });

  it('accepts a signal with and without a rule id', () => {
    const withRuleId = { ...SIGNAL, data: { ...SIGNAL.data, rule_id: 'rule-1' } };

    expect(detectionSignalSchema.parse(withRuleId).data.rule_id).toBe('rule-1');
    expect(detectionSignalSchema.parse(SIGNAL).data.rule_id).toBeUndefined();
  });

  it('keeps nested details', () => {
    const nested = { ...SIGNAL, data: { ...SIGNAL.data, details: { a: { b: [1, 2] } } } };
    const parsed = detectionSignalSchema.parse(nested);

    expect(parsed.data.details).toEqual({ a: { b: [1, 2] } });
  });

  it('needs a value on every reading except no_data', () => {
    const { value: _value, ...dataWithoutValue } = SIGNAL.data;
    const withoutValue = { ...SIGNAL, data: dataWithoutValue };

    expect(detectionSignalSchema.safeParse({ ...withoutValue, status: 'no_data' }).success).toBe(
      true
    );
    expect(detectionSignalSchema.safeParse({ ...withoutValue, status: 'breached' }).success).toBe(
      false
    );
  });

  it('rejects an entity type outside the shared list', () => {
    const host = { ...SIGNAL, data: { ...SIGNAL.data, entity: { type: 'host', name: 'h-1' } } };

    expect(detectionSignalSchema.safeParse(host).success).toBe(false);
  });

  it('rejects a rule object, which the engine never sets', () => {
    expect(detectionSignalSchema.safeParse({ ...SIGNAL, rule: { id: 'rule-1' } }).success).toBe(
      false
    );
  });
});

describe('storedDetectionSignalSchema', () => {
  it('reads a stored signal that has a field Alerting v2 added, dropping the field', () => {
    const parsed = storedDetectionSignalSchema.parse({ ...SIGNAL, tags: ['added-later'] });

    expect(parsed).not.toHaveProperty('tags');
    expect(parsed.data.fingerprint).toBe('checkout');
  });
});
