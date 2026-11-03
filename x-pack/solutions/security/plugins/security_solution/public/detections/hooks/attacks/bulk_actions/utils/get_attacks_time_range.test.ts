/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { getAttacksTimeRange } from './get_attacks_time_range';

describe('getAttacksTimeRange', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2024-05-02T12:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('opens the range 24 hours before the attack, and ends it now', () => {
    expect(getAttacksTimeRange(['2024-05-02T09:00:00.000Z'])).toEqual({
      kind: 'absolute',
      from: '2024-05-01T09:00:00.000Z',
      to: '2024-05-02T12:00:00.000Z',
    });
  });

  it('opens the range from the oldest of several attacks', () => {
    expect(
      getAttacksTimeRange([
        '2024-05-02T09:00:00.000Z',
        '2024-04-28T06:00:00.000Z',
        '2024-05-01T23:00:00.000Z',
      ])
    ).toEqual({
      kind: 'absolute',
      from: '2024-04-27T06:00:00.000Z',
      to: '2024-05-02T12:00:00.000Z',
    });
  });

  it('skips the attacks it cannot read a timestamp from', () => {
    expect(getAttacksTimeRange([undefined, 'not a timestamp', '2024-05-02T09:00:00.000Z'])).toEqual(
      {
        kind: 'absolute',
        from: '2024-05-01T09:00:00.000Z',
        to: '2024-05-02T12:00:00.000Z',
      }
    );
  });

  it('leaves the range to the caller when nothing carries a usable timestamp', () => {
    expect(getAttacksTimeRange([])).toBeUndefined();
    expect(getAttacksTimeRange([undefined])).toBeUndefined();
    expect(getAttacksTimeRange(['not a timestamp'])).toBeUndefined();
  });

  it('does not mutate the moment it opens the range from', () => {
    const timestamps = ['2024-05-02T09:00:00.000Z', '2024-05-02T10:00:00.000Z'];

    const first = getAttacksTimeRange(timestamps);
    const second = getAttacksTimeRange(timestamps);

    expect(first).toEqual(second);
    expect(moment(first?.from).toISOString()).toEqual('2024-05-01T09:00:00.000Z');
  });
});
