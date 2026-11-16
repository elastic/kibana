/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DetectionSignalReading } from '../strategies/types';
import { wrapReading } from './wrap_reading';

const READING: DetectionSignalReading = {
  status: 'breached',
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
};

const wrap = ({
  reading = READING,
  spaceId = 'default',
}: { reading?: DetectionSignalReading; spaceId?: string } = {}) =>
  wrapReading({
    reading,
    strategyId: 'error_rate',
    strategyVersion: 1,
    spaceId,
    scheduledMinute: 60_000,
  });

describe('wrapReading', () => {
  it('gives a series the same group hash every time and another one in another space', () => {
    const first = wrap();
    const again = wrap();
    const otherSpace = wrap({ spaceId: 'other' });

    if (first.dropped || again.dropped || otherSpace.dropped) {
      throw new Error('expected every reading to be wrapped');
    }

    expect(again.signal.group_hash).toBe(first.signal.group_hash);
    expect(otherSpace.signal.group_hash).not.toBe(first.signal.group_hash);
  });

  it('pins the group hash to the formula Alerting v2 uses, sha256 of space, source and fingerprint', () => {
    const result = wrap();

    expect(result).toMatchObject({
      signal: {
        group_hash: 'cd70abc63445b2b9036b1a80a0c5e22b744a66ad3c4584353be0fcd9eb891564',
      },
    });
  });

  it('stamps the strategy id and version on the signal', () => {
    expect(wrap()).toMatchObject({
      signal: { data: { strategy: 'error_rate', strategy_version: 1 } },
    });
  });

  it('carries the rule id only when the reading has one', () => {
    const withRule = wrap({ reading: { ...READING, rule_id: 'rule-1' } });
    const withoutRule = wrap();

    expect(withRule).toMatchObject({ signal: { data: { rule_id: 'rule-1' } } });
    expect(withoutRule).not.toMatchObject({ signal: { data: { rule_id: expect.anything() } } });
  });

  it('turns an invalid reading into a note instead of throwing', () => {
    const result = wrap({ reading: { ...READING, importance: 500 } });

    expect(result).toEqual({
      dropped: true,
      note: expect.stringContaining('error_rate: dropped reading checkout:'),
    });
  });
});
