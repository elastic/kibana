/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  computeInitialRoutingState,
  parseRoutingStateFromMeta,
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

describe('computeInitialRoutingState', () => {
  it('guards the daily history until the next UTC month start', () => {
    expect(
      computeInitialRoutingState({ configured: 'M', now: NOV_17, hasDailyHistory: true })
    ).toEqual({ rounding: 'M', cutover: DEC_1 });
  });

  it('does not guard without daily history', () => {
    expect(
      computeInitialRoutingState({ configured: 'w', now: NOV_17, hasDailyHistory: false })
    ).toEqual({ rounding: 'w', cutover: null });
  });

  it('does not guard the daily history when daily indices are configured', () => {
    expect(
      computeInitialRoutingState({ configured: 'd', now: NOV_17, hasDailyHistory: true })
    ).toEqual({ rounding: 'd', cutover: null });
  });
});

describe('parseRoutingStateFromMeta', () => {
  it('parses a valid routing state', () => {
    expect(parseRoutingStateFromMeta({ routing: { rounding: 'M', cutover: DEC_1 } })).toEqual({
      rounding: 'M',
      cutover: DEC_1,
    });
    expect(parseRoutingStateFromMeta({ routing: { rounding: 'd', cutover: null } })).toEqual({
      rounding: 'd',
      cutover: null,
    });
  });

  it.each([
    ['missing meta', undefined],
    ['missing routing', {}],
    ['routing not an object', { routing: 'M' }],
    ['unknown rounding', { routing: { rounding: 'h', cutover: null } }],
    ['missing rounding', { routing: { cutover: null } }],
    ['string cutover', { routing: { rounding: 'M', cutover: '2026-12-01' } }],
    ['missing cutover', { routing: { rounding: 'M' } }],
  ])('returns undefined on %s', (_, meta) => {
    expect(parseRoutingStateFromMeta(meta)).toBeUndefined();
  });
});
