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
  strategyId = 'error_rate',
}: { reading?: DetectionSignalReading; spaceId?: string; strategyId?: string } = {}) =>
  wrapReading({
    reading,
    strategyId,
    strategyVersion: 1,
    spaceId,
    scheduledMinute: 60_000,
  });

describe('wrapReading', () => {
  it('gives a series the same group hash every time, and another one in another space or strategy', () => {
    const first = wrap();
    const again = wrap();
    const otherSpace = wrap({ spaceId: 'other' });
    const otherStrategy = wrap({ strategyId: 'latency' });
    const otherSource = wrap({ reading: { ...READING, source_id: 'other-source' } });

    if (
      first.dropped ||
      again.dropped ||
      otherSpace.dropped ||
      otherStrategy.dropped ||
      otherSource.dropped
    ) {
      throw new Error('expected every reading to be wrapped');
    }

    expect(again.signal.group_hash).toBe(first.signal.group_hash);
    expect(otherSpace.signal.group_hash).not.toBe(first.signal.group_hash);
    // A fingerprint is unique within its strategy only: two strategies must not share a series.
    expect(otherStrategy.signal.group_hash).not.toBe(first.signal.group_hash);
    // Two sources with a series of the same name must not share a baseline.
    expect(otherSource.signal.group_hash).not.toBe(first.signal.group_hash);
  });

  it('pins the group hash, since a new formula splits every stored series', () => {
    const result = wrap({ reading: { ...READING, source_id: 'source-1' } });

    expect(result).toMatchObject({
      signal: {
        group_hash: '5952d6f22c536c6cd8db4e92ff8ab95cbf4acdc9f100957fbe4b56e5ffe40669',
      },
    });
  });

  it('stamps the strategy id and version on the signal', () => {
    expect(wrap()).toMatchObject({
      signal: { data: { strategy: 'error_rate', strategy_version: 1 } },
    });
  });

  it('puts a reported severity on the signal, where the severity floor reads it, and not in data', () => {
    const result = wrap({ reading: { ...READING, severity: 'high' } });

    expect(result).toMatchObject({ signal: { severity: 'high' } });
    expect(result).not.toMatchObject({ signal: { data: { severity: expect.anything() } } });
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
