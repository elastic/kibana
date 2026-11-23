/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SliRoutingState } from './sli_routing_state';
import {
  computeInitialRoutingState,
  parseRoutingStateFromMeta,
  reconcileRoutingState,
  startOfNextUtcDay,
  startOfNextUtcMonth,
} from './sli_routing_state';

const NOV_17 = new Date('2026-11-17T10:00:00.000Z');
const NOV_10 = Date.parse('2026-11-10T00:00:00.000Z');
const NOV_18 = Date.parse('2026-11-18T00:00:00.000Z');
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

describe('startOfNextUtcDay', () => {
  it('returns the start of the next UTC day', () => {
    expect(startOfNextUtcDay(NOV_17)).toBe(NOV_18);
  });

  it('rolls over to the next year on December 31', () => {
    expect(startOfNextUtcDay(new Date('2026-12-31T23:59:59.999Z'))).toBe(JAN_1);
  });
});

describe('computeInitialRoutingState', () => {
  it('keeps the daily history daily until the next UTC month start', () => {
    expect(
      computeInitialRoutingState({ configured: 'M', now: NOV_17, hasDailyHistory: true })
    ).toEqual({
      segments: [
        { from: null, rounding: 'd' },
        { from: DEC_1, rounding: 'M' },
      ],
    });
  });

  it.each([
    ['without daily history', 'w', false],
    ['when daily indices are configured', 'd', true],
  ] as const)('uses the configured rounding only %s', (_, configured, hasDailyHistory) => {
    expect(computeInitialRoutingState({ configured, now: NOV_17, hasDailyHistory })).toEqual({
      segments: [{ from: null, rounding: configured }],
    });
  });
});

describe('reconcileRoutingState', () => {
  it('keeps the routing state when the configured rounding is already applied', () => {
    const state: SliRoutingState = {
      segments: [
        { from: null, rounding: 'M' },
        { from: NOV_10, rounding: 'd' },
      ],
    };
    expect(reconcileRoutingState(state, 'd', NOV_17)).toEqual(state);
  });

  it('applies a rounding change from the next UTC day, keeping the segments in effect', () => {
    const state: SliRoutingState = {
      segments: [
        { from: null, rounding: 'M' },
        { from: NOV_10, rounding: 'w' },
      ],
    };
    expect(reconcileRoutingState(state, 'd', NOV_17)).toEqual({
      segments: [...state.segments, { from: NOV_18, rounding: 'd' }],
    });
  });

  it('changes the rounding of a segment not in effect yet, keeping its start', () => {
    const state: SliRoutingState = {
      segments: [
        { from: null, rounding: 'd' },
        { from: DEC_1, rounding: 'M' },
      ],
    };
    expect(reconcileRoutingState(state, 'w', NOV_17)).toEqual({
      segments: [
        { from: null, rounding: 'd' },
        { from: DEC_1, rounding: 'w' },
      ],
    });
  });

  it('drops a segment not in effect yet when the rounding goes back to the one in effect', () => {
    const state: SliRoutingState = {
      segments: [
        { from: null, rounding: 'M' },
        { from: NOV_18, rounding: 'd' },
      ],
    };
    expect(reconcileRoutingState(state, 'M', NOV_17)).toEqual({
      segments: [{ from: null, rounding: 'M' }],
    });
  });
});

describe('parseRoutingStateFromMeta', () => {
  it('parses a valid routing state', () => {
    const routing: SliRoutingState = {
      segments: [
        { from: null, rounding: 'd' },
        { from: DEC_1, rounding: 'M' },
        { from: JAN_1, rounding: 'w' },
      ],
    };
    expect(parseRoutingStateFromMeta({ routing })).toEqual(routing);
  });

  it.each([
    ['missing meta', undefined],
    ['missing routing', {}],
    ['routing not an object', { routing: 'M' }],
    ['missing segments', { routing: { rounding: 'M', cutover: null } }],
    ['empty segments', { routing: { segments: [] } }],
    ['unknown rounding', { routing: { segments: [{ from: null, rounding: 'h' }] } }],
    [
      'string from',
      {
        routing: {
          segments: [
            { from: null, rounding: 'M' },
            { from: '2026-12-01', rounding: 'd' },
          ],
        },
      },
    ],
    ['first segment with a start', { routing: { segments: [{ from: DEC_1, rounding: 'M' }] } }],
    [
      'second segment without a start',
      {
        routing: {
          segments: [
            { from: null, rounding: 'M' },
            { from: null, rounding: 'd' },
          ],
        },
      },
    ],
    [
      'unordered segments',
      {
        routing: {
          segments: [
            { from: null, rounding: 'M' },
            { from: JAN_1, rounding: 'd' },
            { from: DEC_1, rounding: 'w' },
          ],
        },
      },
    ],
  ])('returns undefined on %s', (_, meta) => {
    expect(parseRoutingStateFromMeta(meta)).toBeUndefined();
  });
});
