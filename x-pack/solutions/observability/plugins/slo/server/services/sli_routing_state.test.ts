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
  it.each([
    ['guards the daily history until the next UTC month start', 'M', true, DEC_1],
    ['does not guard without daily history', 'w', false, null],
    ['does not guard the daily history when daily indices are configured', 'd', true, null],
  ] as const)('%s', (_, configured, hasDailyHistory, cutover) => {
    expect(computeInitialRoutingState({ configured, now: NOV_17, hasDailyHistory })).toEqual({
      rounding: configured,
      cutover,
    });
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
