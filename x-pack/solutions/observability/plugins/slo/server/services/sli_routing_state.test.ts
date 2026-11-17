/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  computeRoutingState,
  isSameRoutingState,
  parseRoutingStateFromMeta,
  ROUTING_GUARD_EXPIRY_MS,
  startOfNextUtcMonth,
} from './sli_routing_state';

const NOV_17 = new Date('2026-11-17T10:00:00.000Z');
const DEC_1 = Date.parse('2026-12-01T00:00:00.000Z');
const JAN_1 = Date.parse('2027-01-01T00:00:00.000Z');

describe('startOfNextUtcMonth', () => {
  it('returns the first day of the next UTC month', () => {
    expect(startOfNextUtcMonth(NOV_17)).toBe(DEC_1);
  });

  it('rolls over to the next year in December', () => {
    expect(startOfNextUtcMonth(new Date('2026-12-31T23:59:59.999Z'))).toBe(JAN_1);
  });
});

describe('computeRoutingState', () => {
  it('guards daily history when no routing pipeline exists yet', () => {
    expect(
      computeRoutingState({
        existing: undefined,
        configured: 'M',
        now: NOV_17,
        hasDailyHistory: true,
      })
    ).toEqual({ before: 'd', after: 'M', cutover: DEC_1 });
  });

  it('does not guard when no routing pipeline exists and there is no daily history', () => {
    expect(
      computeRoutingState({
        existing: undefined,
        configured: 'M',
        now: NOV_17,
        hasDailyHistory: false,
      })
    ).toEqual({ before: 'M', after: 'M', cutover: null });
  });

  it('does not guard daily history when daily indices are configured', () => {
    expect(
      computeRoutingState({
        existing: undefined,
        configured: 'd',
        now: NOV_17,
        hasDailyHistory: true,
      })
    ).toEqual({ before: 'd', after: 'd', cutover: null });
  });

  it('keeps the state unchanged while the guard is active', () => {
    const existing = { before: 'd' as const, after: 'M' as const, cutover: DEC_1 };

    expect(
      computeRoutingState({
        existing,
        configured: 'M',
        now: new Date(DEC_1 + ROUTING_GUARD_EXPIRY_MS - 1),
        hasDailyHistory: true,
      })
    ).toEqual(existing);
  });

  it('removes the guard once it expired', () => {
    expect(
      computeRoutingState({
        existing: { before: 'd', after: 'M', cutover: DEC_1 },
        configured: 'M',
        now: new Date(DEC_1 + ROUTING_GUARD_EXPIRY_MS),
        hasDailyHistory: true,
      })
    ).toEqual({ before: 'M', after: 'M', cutover: null });
  });

  it('keeps the previous before rounding when the setting changes before the previous cutover', () => {
    expect(
      computeRoutingState({
        existing: { before: 'd', after: 'M', cutover: DEC_1 },
        configured: 'w',
        now: NOV_17,
        hasDailyHistory: true,
      })
    ).toEqual({ before: 'd', after: 'w', cutover: DEC_1 });
  });

  it('uses the previous after rounding when the setting changes after the previous cutover', () => {
    expect(
      computeRoutingState({
        existing: { before: 'd', after: 'M', cutover: DEC_1 },
        configured: 'd',
        now: new Date('2026-12-15T00:00:00.000Z'),
        hasDailyHistory: true,
      })
    ).toEqual({ before: 'M', after: 'd', cutover: JAN_1 });
  });

  it('guards a setting change without a previous guard', () => {
    expect(
      computeRoutingState({
        existing: { before: 'M', after: 'M', cutover: null },
        configured: 'd',
        now: NOV_17,
        hasDailyHistory: false,
      })
    ).toEqual({ before: 'M', after: 'd', cutover: DEC_1 });
  });
});

describe('parseRoutingStateFromMeta', () => {
  it('parses a valid routing state', () => {
    expect(
      parseRoutingStateFromMeta({ routing: { before: 'd', after: 'M', cutover: DEC_1 } })
    ).toEqual({ before: 'd', after: 'M', cutover: DEC_1 });
    expect(
      parseRoutingStateFromMeta({ routing: { before: 'M', after: 'M', cutover: null } })
    ).toEqual({ before: 'M', after: 'M', cutover: null });
  });

  it.each([
    ['missing meta', undefined],
    ['missing routing', {}],
    ['routing not an object', { routing: 'M' }],
    ['unknown rounding', { routing: { before: 'h', after: 'M', cutover: null } }],
    ['missing after', { routing: { before: 'M', cutover: null } }],
    ['string cutover', { routing: { before: 'd', after: 'M', cutover: '2026-12-01' } }],
    ['missing cutover', { routing: { before: 'd', after: 'M' } }],
  ])('returns undefined on %s', (_, meta) => {
    expect(parseRoutingStateFromMeta(meta)).toBeUndefined();
  });
});

describe('isSameRoutingState', () => {
  it('compares every field', () => {
    const state = { before: 'd' as const, after: 'M' as const, cutover: DEC_1 };

    expect(isSameRoutingState(state, { ...state })).toBe(true);
    expect(isSameRoutingState(state, { ...state, cutover: null })).toBe(false);
    expect(isSameRoutingState(state, { ...state, before: 'M' })).toBe(false);
    expect(isSameRoutingState(state, { ...state, after: 'w' })).toBe(false);
  });
});
