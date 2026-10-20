/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Entity } from '../../../../common/api/entity_analytics';
import {
  combineEntityGroupFilters,
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
    expect(getResolvedFromRecordCount([], 250)).toBeUndefined();
  });

  it('uses the store alias count when the loaded aliases were capped', () => {
    expect(getResolvedFromRecordCount([{ id: 'a' }, { id: 'b' }], 250)).toBe(251);
  });

  it('never reports fewer records than were actually loaded', () => {
    expect(getResolvedFromRecordCount([{ id: 'a' }, { id: 'b' }], 1)).toBe(3);
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

  it('wraps a single watchlist stored as a bare string', () => {
    expect(getWatchlistIds(withWatchlists('wl-1'))).toEqual(['wl-1']);
  });

  it('returns an empty list when watchlists is neither a string nor an array', () => {
    expect(getWatchlistIds(withWatchlists(42))).toEqual([]);
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

  it('returns only the target when there are no aliases', () => {
    expect(getEntityGroupRecords({ id: 'target' }, [])).toEqual([{ id: 'target' }]);
  });

  it('returns an empty list when neither a target nor aliases are given', () => {
    expect(getEntityGroupRecords(null, undefined)).toEqual([]);
    expect(getEntityGroupRecords(undefined, undefined)).toEqual([]);
    expect(getEntityGroupRecords(null, [])).toEqual([]);
  });

  it('drops null and undefined entries inside the alias list', () => {
    expect(
      getEntityGroupRecords<{ id: string } | null | undefined>({ id: 'target' }, [
        null,
        { id: 'alias-1' },
        undefined,
        { id: 'alias-2' },
      ])
    ).toEqual([{ id: 'target' }, { id: 'alias-1' }, { id: 'alias-2' }]);
  });

  it('returns an empty list when every entry is missing', () => {
    expect(getEntityGroupRecords<null | undefined>(null, [null, undefined])).toEqual([]);
  });

  it('keeps falsy records that are not null or undefined', () => {
    expect(getEntityGroupRecords<number | string | boolean>(0, ['', false])).toEqual([
      0,
      '',
      false,
    ]);
  });

  it('preserves order and keeps repeated records once, at their first position', () => {
    const target = { id: 'target' };
    const alias = { id: 'alias' };
    const other = { id: 'other' };

    const result = getEntityGroupRecords(target, [alias, target, other, alias]);

    expect(result).toEqual([target, alias, other]);
    expect(result[0]).toBe(target);
    expect(result[1]).toBe(alias);
  });

  it('collapses duplicate records by entity id', () => {
    expect(getEntityGroupRecords({ id: 'a' }, [{ id: 'a' }])).toEqual([{ id: 'a' }, { id: 'a' }]);
  });

  it('keeps a plain identity document first, followed by entity store alias records', () => {
    const identityDocument = { host: { name: 'h1' } };
    const storeAlias = { entity: { id: 'e2' }, host: { name: 'h2' } };

    const result = getEntityGroupRecords<object>(identityDocument, [storeAlias]);

    expect(result).toHaveLength(2);
    expect(result[0]).toBe(identityDocument);
    expect(result[1]).toBe(storeAlias);
  });

  it('returns a new array and does not mutate the alias list', () => {
    const aliasRecords = [{ id: 'alias' }] as const;

    const result = getEntityGroupRecords({ id: 'target' }, aliasRecords);

    expect(result).not.toBe(aliasRecords);
    expect(aliasRecords).toEqual([{ id: 'alias' }]);
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

describe('mergeEntityGroupDetails malformed data and edge cases', () => {
  it('treats keys named like Object.prototype members as plain data', () => {
    const merged = mergeEntityGroupDetails({ a: 1 }, [
      JSON.parse('{"constructor":"x","toString":"y","hasOwnProperty":"z"}'),
    ]);

    expect(merged).toEqual({ a: 1, constructor: 'x', toString: 'y', hasOwnProperty: 'z' });
  });

  it('merges inherited-looking keys present on both sides without picking up the prototype', () => {
    const merged = mergeEntityGroupDetails(JSON.parse('{"constructor":"a"}'), [
      JSON.parse('{"constructor":"b"}'),
    ]);

    expect(merged).toEqual({ constructor: ['a', 'b'] });
  });

  it('keeps a __proto__ key as own data without changing the prototype', () => {
    const merged = mergeEntityGroupDetails({ a: 1 }, [
      JSON.parse('{"__proto__":{"polluted":true}}'),
    ]);

    expect(Object.getPrototypeOf(merged)).toBe(Object.prototype);
    expect((merged as Record<string, unknown>).polluted).toBeUndefined();
    expect(Object.keys(merged)).toEqual(['a', '__proto__']);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('keeps distinct nested array values instead of collapsing them', () => {
    expect(mergeEntityGroupDetails({ l: [[1, 2]] }, [{ l: [['1', '2']] }])).toEqual({
      l: [
        [1, 2],
        ['1', '2'],
      ],
    });
    expect(mergeEntityGroupDetails({ l: [[{ x: 1 }]] }, [{ l: [[{ x: 2 }]] }])).toEqual({
      l: [[{ x: 1 }], [{ x: 2 }]],
    });
  });

  it('de-duplicates equal nested values regardless of object key order', () => {
    expect(
      mergeEntityGroupDetails({ l: [{ a: 1, b: { c: 2, d: 3 } }] }, [
        { l: [{ b: { d: 3, c: 2 }, a: 1 }] },
      ])
    ).toEqual({ l: [{ a: 1, b: { c: 2, d: 3 } }] });
  });

  it('treats null like an absent value', () => {
    expect(
      mergeEntityGroupDetails({ a: null, b: 'x', c: null }, [{ a: 'v', b: null, c: null }])
    ).toEqual({ a: 'v', b: 'x', c: null });
  });

  it('ignores alias entries that are not plain objects', () => {
    const details = { a: 1 };
    const malformedAliases = [[1, 2], null, undefined, 'x', 3] as unknown as object[];

    expect(mergeEntityGroupDetails(details, malformedAliases)).toBe(details);
    expect(mergeEntityGroupDetails(details, [...malformedAliases, { b: 2 }])).toEqual({
      a: 1,
      b: 2,
    });
  });

  it('returns details untouched when it is not a plain object', () => {
    const details = [1] as unknown as { a: number };

    expect(mergeEntityGroupDetails(details, [{ a: 1 }])).toBe(details);
  });

  it('does not mutate the details or alias records', () => {
    const details = { a: 'x', nested: { l: [1] } };
    const alias = { a: 'y', nested: { l: [2] } };

    mergeEntityGroupDetails(details, [alias]);

    expect(details).toEqual({ a: 'x', nested: { l: [1] } });
    expect(alias).toEqual({ a: 'y', nested: { l: [2] } });
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

describe('getEntityGroupLifecycle malformed data and edge cases', () => {
  const withLifecycle = (first_seen?: string, last_seen?: string, last_activity?: string) => ({
    entity: { lifecycle: { first_seen, last_seen, last_activity } },
  });

  it('is null for an empty record list', () => {
    expect(getEntityGroupLifecycle([])).toEqual({ firstSeen: null, lastSeen: null });
  });

  it('ignores unparseable timestamps whatever their position', () => {
    const valid = withLifecycle('2024-01-01T00:00:00.000Z', '2024-01-02T00:00:00.000Z');
    const malformed = withLifecycle('garbage', 'garbage');
    const expected = {
      firstSeen: '2024-01-01T00:00:00.000Z',
      lastSeen: '2024-01-02T00:00:00.000Z',
    };

    expect(getEntityGroupLifecycle([malformed, valid])).toEqual(expected);
    expect(getEntityGroupLifecycle([valid, malformed])).toEqual(expected);
  });

  it('is null when every timestamp is malformed', () => {
    expect(getEntityGroupLifecycle([withLifecycle('garbage', 'nope', 'also-bad')])).toEqual({
      firstSeen: null,
      lastSeen: null,
    });
  });

  it('falls back to last_seen when last_activity is empty or malformed', () => {
    expect(
      getEntityGroupLifecycle([withLifecycle(undefined, '2024-01-05T00:00:00.000Z', '')])
    ).toEqual({ firstSeen: null, lastSeen: '2024-01-05T00:00:00.000Z' });
    expect(
      getEntityGroupLifecycle([withLifecycle(undefined, '2024-01-05T00:00:00.000Z', 'garbage')])
    ).toEqual({ firstSeen: null, lastSeen: '2024-01-05T00:00:00.000Z' });
  });

  it('prefers last_activity over last_seen even when it is older', () => {
    expect(
      getEntityGroupLifecycle([
        withLifecycle(undefined, '2024-02-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
      ])
    ).toEqual({ firstSeen: null, lastSeen: '2024-01-01T00:00:00.000Z' });
  });

  it('compares by instant and keeps the first record on equal timestamps', () => {
    expect(
      getEntityGroupLifecycle([
        withLifecycle('2024-01-01T01:00:00.000+01:00', '2024-01-02T00:00:00.000Z'),
        withLifecycle('2024-01-01T00:00:00.000Z', '2024-01-02T01:00:00.000+01:00'),
      ])
    ).toEqual({
      firstSeen: '2024-01-01T01:00:00.000+01:00',
      lastSeen: '2024-01-02T00:00:00.000Z',
    });
  });

  it('treats the epoch (1970-01-01) as a valid timestamp', () => {
    expect(
      getEntityGroupLifecycle([withLifecycle('1970-01-01T00:00:00.000Z', undefined)]).firstSeen
    ).toBe('1970-01-01T00:00:00.000Z');
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
