/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CriticalityLevels } from '../asset_criticality/constants';
import {
  CRITICALITY_LEVELS,
  getCriticalityRank,
  mergeResolutionGroupValues,
} from './resolution_group_values';

describe('getCriticalityRank', () => {
  it('ranks the levels from extreme to low, and anything else 0', () => {
    expect(
      ['extreme_impact', 'high_impact', 'medium_impact', 'low_impact'].map(getCriticalityRank)
    ).toEqual([4, 3, 2, 1]);
    expect([getCriticalityRank('unassigned'), getCriticalityRank(undefined)]).toEqual([0, 0]);
  });

  it.each([null, '', 0, 1, {}, ['extreme_impact']])('ranks %p, which is no level, 0', (value) => {
    expect(getCriticalityRank(value)).toBe(0);
  });

  it('ranks each level by its place in CRITICALITY_LEVELS, the highest first', () => {
    expect(CRITICALITY_LEVELS[0]).toBe(CriticalityLevels.EXTREME_IMPACT);
    CRITICALITY_LEVELS.forEach((level, index) => {
      expect(getCriticalityRank(level)).toBe(CRITICALITY_LEVELS.length - index);
    });
  });

  it('gives every criticality level its own non-zero rank', () => {
    const ranks = Object.values(CriticalityLevels).map(getCriticalityRank);
    expect(ranks.every((rank) => rank > 0)).toBe(true);
    expect(new Set(ranks).size).toBe(ranks.length);
  });
});

describe('mergeResolutionGroupValues', () => {
  it('merges the members as the entities page does', () => {
    expect(
      mergeResolutionGroupValues([
        {
          '@timestamp': '2026-10-29T10:00:00.000Z',
          asset: { criticality: 'low_impact' },
          entity: {
            source: 'okta',
            attributes: { watchlists: 'w1' },
            lifecycle: {
              first_seen: '2026-10-10T00:00:00.000Z',
              last_activity: '2026-10-29T09:00:00.000Z',
            },
          },
        },
        {
          '@timestamp': '2026-10-29T11:00:00.000Z',
          asset: { criticality: 'high_impact' },
          entity: {
            source: ['entra', 'okta'],
            attributes: { watchlists: ['w1', 'w2'] },
            lifecycle: {
              first_seen: '2026-10-01T00:00:00.000Z',
              last_activity: '2026-10-29T08:00:00.000Z',
            },
          },
        },
      ])
    ).toEqual({
      criticality: 'high_impact',
      sources: ['okta', 'entra'],
      watchlists: ['w1', 'w2'],
      firstSeen: '2026-10-01T00:00:00.000Z',
      lastActivity: '2026-10-29T09:00:00.000Z',
      lastSeen: '2026-10-29T11:00:00.000Z',
    });
  });

  it('ignores missing values, and an unassigned criticality never wins', () => {
    expect(
      mergeResolutionGroupValues([
        { asset: { criticality: 'unassigned' } },
        { asset: { criticality: null } },
        {},
      ])
    ).toEqual({
      criticality: undefined,
      sources: [],
      watchlists: [],
      firstSeen: undefined,
      lastActivity: undefined,
      lastSeen: undefined,
    });
  });
});
