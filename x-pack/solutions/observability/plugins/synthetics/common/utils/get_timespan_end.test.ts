/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTimespanEnd } from './get_timespan_end';

describe('getTimespanEnd', () => {
  it('returns lt unchanged when the stored shape is returned', () => {
    expect(getTimespanEnd({ lt: '2024-08-30T11:03:33.594Z' })).toBe('2024-08-30T11:03:33.594Z');
  });

  it('does not reformat lt', () => {
    expect(getTimespanEnd({ lt: '2024-08-30T11:03:33Z' })).toBe('2024-08-30T11:03:33Z');
  });

  it('prefers lt when both lt and lte are present', () => {
    expect(
      getTimespanEnd({ lt: '2024-08-30T11:03:33.594Z', lte: '2024-08-30T11:03:33.000Z' })
    ).toBe('2024-08-30T11:03:33.594Z');
  });

  it('returns lte + 1ms when synthetic _source returned lte', () => {
    expect(getTimespanEnd({ lte: '2024-08-30T11:03:33.593Z' })).toBe('2024-08-30T11:03:33.594Z');
  });

  it('rolls over the second, minute and day boundaries', () => {
    expect(getTimespanEnd({ lte: '2024-08-30T11:02:59.999Z' })).toBe('2024-08-30T11:03:00.000Z');
    expect(getTimespanEnd({ lte: '2024-08-30T23:59:59.999Z' })).toBe('2024-08-31T00:00:00.000Z');
  });

  it('returns undefined when there is no usable end', () => {
    expect(getTimespanEnd(undefined)).toBeUndefined();
    expect(getTimespanEnd({})).toBeUndefined();
    expect(getTimespanEnd({ lte: 'not-a-date' })).toBeUndefined();
  });
});
