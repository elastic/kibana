/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Entity } from '../../../../common/api/entity_analytics';
import {
  combineEntityGroupFilters,
  getEntityGroupIds,
  getEntityGroupLifecycle,
  getEntityGroupRecords,
  getMaxCriticality,
  getResolvedFromRecordCount,
  getUnionEntitySources,
  getUnionWatchlistIds,
  getWatchlistIds,
  isEntityGroupView,
  mergeEntityGroupDetails,
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

describe('getEntityGroupRecords', () => {
  it('returns the target followed by its aliases, dropping missing entries', () => {
    expect(getEntityGroupRecords({ id: 'target' }, [{ id: 'alias' }])).toEqual([
      { id: 'target' },
      { id: 'alias' },
    ]);
    expect(getEntityGroupRecords(null, [{ id: 'alias' }])).toEqual([{ id: 'alias' }]);
    expect(getEntityGroupRecords({ id: 'target' }, undefined)).toEqual([{ id: 'target' }]);
    expect(getEntityGroupRecords(undefined, [])).toEqual([]);
  });
});

describe('getEntityGroupIds', () => {
  const alias = (id?: string) => ({ entity: id ? { id } : undefined } as unknown as Entity);

  it('returns the target id followed by alias ids, de-duplicated and without blanks', () => {
    expect(
      getEntityGroupIds('host:target', [alias('host:a'), alias('host:target'), alias(), alias('')])
    ).toEqual(['host:target', 'host:a']);
  });

  it('handles a missing target and no aliases', () => {
    expect(getEntityGroupIds(undefined, [alias('host:a')])).toEqual(['host:a']);
    expect(getEntityGroupIds('host:target', undefined)).toEqual(['host:target']);
    expect(getEntityGroupIds('', [])).toEqual([]);
  });
});

describe('combineEntityGroupFilters', () => {
  const build = (record: { name?: string }) =>
    record.name ? { term: { 'host.name': record.name } } : undefined;

  it('is undefined when no record yields a filter', () => {
    expect(combineEntityGroupFilters([], build)).toBeUndefined();
    expect(combineEntityGroupFilters([{}], build)).toBeUndefined();
  });

  it('returns a single filter unchanged', () => {
    expect(combineEntityGroupFilters([{ name: 'a' }, {}], build)).toEqual({
      term: { 'host.name': 'a' },
    });
  });

  it('ORs several filters in a bool.should', () => {
    expect(combineEntityGroupFilters([{ name: 'a' }, {}, { name: 'b' }], build)).toEqual({
      bool: {
        should: [{ term: { 'host.name': 'a' } }, { term: { 'host.name': 'b' } }],
        minimum_should_match: 1,
      },
    });
  });
});

describe('mergeEntityGroupDetails', () => {
  it('returns the details untouched when there are no aliases', () => {
    const details = { host: { name: 'a' } };
    expect(mergeEntityGroupDetails(details, [])).toBe(details);
    expect(mergeEntityGroupDetails(details, undefined)).toBe(details);
  });

  it('keeps agreeing scalars and turns disagreeing scalars into a de-duplicated array', () => {
    expect(
      mergeEntityGroupDetails(
        { host: { name: 'a', os: { family: 'linux' }, architecture: 'x86_64' } },
        [
          { host: { name: 'b', os: { family: 'linux' }, architecture: 'x86_64' } },
          { host: { name: 'c', os: { family: 'windows' } } },
        ]
      )
    ).toEqual({
      host: { name: ['a', 'b', 'c'], os: { family: ['linux', 'windows'] }, architecture: 'x86_64' },
    });
  });

  it('unions arrays and adds attributes only present on an alias', () => {
    expect(
      mergeEntityGroupDetails({ host: { ip: ['10.0.0.1', '10.0.0.2'] } }, [
        { host: { ip: '10.0.0.2', mac: ['aa'] }, cloud: { provider: 'aws' } },
      ])
    ).toEqual({
      host: { ip: ['10.0.0.1', '10.0.0.2'], mac: ['aa'] },
      cloud: { provider: 'aws' },
    });
  });
});

describe('getEntityGroupLifecycle', () => {
  const withLifecycle = (first_seen?: string, last_seen?: string, last_activity?: string) => ({
    entity: { lifecycle: { first_seen, last_seen, last_activity } },
  });

  it('is null when no record carries lifecycle data', () => {
    expect(getEntityGroupLifecycle([{}, { entity: {} }])).toEqual({
      firstSeen: null,
      lastSeen: null,
    });
  });

  it('takes the earliest first-seen and latest last-seen across records', () => {
    expect(
      getEntityGroupLifecycle([
        withLifecycle('2024-02-01T00:00:00.000Z', '2024-02-10T00:00:00.000Z'),
        withLifecycle('2024-01-01T00:00:00.000Z', '2024-01-10T00:00:00.000Z'),
        withLifecycle(undefined, '2024-02-05T00:00:00.000Z', '2024-03-01T00:00:00.000Z'),
      ])
    ).toEqual({ firstSeen: '2024-01-01T00:00:00.000Z', lastSeen: '2024-03-01T00:00:00.000Z' });
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
