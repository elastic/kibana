/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Entity } from '../../../../common/api/entity_analytics';
import {
  getMaxCriticality,
  getResolvedFromRecordCount,
  getUnionEntitySources,
  getUnionWatchlistIds,
  getWatchlistIds,
  isEntityGroupView,
} from './entity_store_group_utils';

describe('isEntityGroupView', () => {
  it('is false when there are no alias records', () => {
    expect(isEntityGroupView(undefined)).toBe(false);
    expect(isEntityGroupView([])).toBe(false);
  });

  it('is true when at least one alias record exists', () => {
    expect(isEntityGroupView([{ entity: { id: 'alias' } }])).toBe(true);
  });
});

describe('getResolvedFromRecordCount', () => {
  it('counts the target plus its aliases', () => {
    expect(getResolvedFromRecordCount([{ id: 'a' }, { id: 'b' }, { id: 'c' }])).toBe(4);
  });

  it('is undefined when there are no aliases', () => {
    expect(getResolvedFromRecordCount([])).toBeUndefined();
    expect(getResolvedFromRecordCount(undefined)).toBeUndefined();
  });
});

const withCriticality = (criticality?: string): Pick<Entity, 'asset'> =>
  ({ asset: criticality ? { criticality } : undefined } as Pick<Entity, 'asset'>);

const withWatchlists = (watchlists?: unknown): Pick<Entity, 'entity'> =>
  ({
    entity: { id: 'x', attributes: watchlists === undefined ? undefined : { watchlists } },
  } as unknown as Pick<Entity, 'entity'>);

describe('getMaxCriticality', () => {
  it('returns undefined for an empty list', () => {
    expect(getMaxCriticality([])).toBeUndefined();
  });

  it('returns undefined when no record has a criticality', () => {
    expect(getMaxCriticality([withCriticality(), withCriticality()])).toBeUndefined();
  });

  it('returns the single assigned criticality', () => {
    expect(getMaxCriticality([withCriticality(), withCriticality('low_impact')])).toBe(
      'low_impact'
    );
  });

  it('picks the most severe level regardless of order', () => {
    expect(
      getMaxCriticality([
        withCriticality('medium_impact'),
        withCriticality('extreme_impact'),
        withCriticality('high_impact'),
      ])
    ).toBe('extreme_impact');
    expect(getMaxCriticality([withCriticality('low_impact'), withCriticality('high_impact')])).toBe(
      'high_impact'
    );
  });

  it('ranks unassigned below every real level', () => {
    expect(getMaxCriticality([withCriticality('unassigned'), withCriticality('low_impact')])).toBe(
      'low_impact'
    );
  });

  it('returns undefined when every record is unassigned', () => {
    expect(
      getMaxCriticality([withCriticality('unassigned'), withCriticality('unassigned')])
    ).toBeUndefined();
  });
});

describe('getWatchlistIds', () => {
  it('returns an empty list when attributes are missing', () => {
    expect(getWatchlistIds(withWatchlists())).toEqual([]);
  });

  it('returns an empty list when watchlists is not an array', () => {
    expect(getWatchlistIds(withWatchlists('wl-1'))).toEqual([]);
  });

  it('drops non-string and empty entries', () => {
    expect(getWatchlistIds(withWatchlists(['wl-1', 2, '', null, 'wl-2']))).toEqual([
      'wl-1',
      'wl-2',
    ]);
  });
});

describe('getUnionWatchlistIds', () => {
  it('returns an empty list for no records', () => {
    expect(getUnionWatchlistIds([])).toEqual([]);
  });

  it('unions and de-duplicates across records in first-seen order', () => {
    expect(
      getUnionWatchlistIds([
        withWatchlists(['wl-2', 'wl-1']),
        withWatchlists(),
        withWatchlists(['wl-1', 'wl-3']),
      ])
    ).toEqual(['wl-2', 'wl-1', 'wl-3']);
  });
});

describe('getUnionEntitySources', () => {
  const withSources = (source?: string | string[]): Pick<Entity, 'entity'> =>
    ({ entity: { id: 'id', source } } as unknown as Pick<Entity, 'entity'>);

  it('returns an empty list for no records', () => {
    expect(getUnionEntitySources([])).toEqual([]);
  });

  it('unions and de-duplicates across records in first-seen order, accepting string or array', () => {
    expect(
      getUnionEntitySources([
        withSources(['okta', 'logs-endpoint']),
        withSources(),
        withSources('logs-endpoint'),
        withSources(['entityanalytics_okta']),
      ])
    ).toEqual(['okta', 'logs-endpoint', 'entityanalytics_okta']);
  });
});
