/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_FILTERS, filterHunts, isFiltering, platformsOf } from './filter_hunts';
import { available, makeHunt, unavailable } from './test_fixtures';

const lsass = makeHunt();
const okta = makeHunt({
  id: 'okta_spray',
  name: 'Okta password spraying',
  description: 'Repeated failures from one source.',
  platform: ['identity', 'cloud'],
  mitreTechniques: ['T1110.003'],
  availability: unavailable([{ reason: 'unavailable_index', details: ['logs-okta*'] }]),
});
const hunts = [lsass, okta];

describe('filterHunts', () => {
  it('returns everything with the default filters', () => {
    expect(filterHunts(hunts, DEFAULT_FILTERS)).toEqual(hunts);
  });

  it('matches name, description and MITRE technique, ignoring case', () => {
    expect(filterHunts(hunts, { ...DEFAULT_FILTERS, search: 'SPRAYING' })).toEqual([okta]);
    expect(filterHunts(hunts, { ...DEFAULT_FILTERS, search: 'open lsass' })).toEqual([lsass]);
    expect(filterHunts(hunts, { ...DEFAULT_FILTERS, search: 't1110' })).toEqual([okta]);
  });

  it('filters by platform, including a hunt that lists several', () => {
    expect(filterHunts(hunts, { ...DEFAULT_FILTERS, platform: 'cloud' })).toEqual([okta]);
    expect(filterHunts(hunts, { ...DEFAULT_FILTERS, platform: 'windows' })).toEqual([lsass]);
  });

  it('filters by the caller availability', () => {
    expect(filterHunts(hunts, { ...DEFAULT_FILTERS, availability: 'available' })).toEqual([lsass]);
    expect(filterHunts(hunts, { ...DEFAULT_FILTERS, availability: 'unavailable' })).toEqual([okta]);
  });

  it('combines filters', () => {
    expect(
      filterHunts(hunts, { search: 'okta', platform: 'windows', availability: 'all' })
    ).toEqual([]);
  });
});

describe('isFiltering and platformsOf', () => {
  it('knows when any filter is set', () => {
    expect(isFiltering(DEFAULT_FILTERS)).toBe(false);
    expect(isFiltering({ ...DEFAULT_FILTERS, search: '  ' })).toBe(false);
    expect(isFiltering({ ...DEFAULT_FILTERS, availability: 'available' })).toBe(true);
  });

  it('lists each platform once, sorted', () => {
    expect(platformsOf([lsass, okta, makeHunt({ availability: available() })])).toEqual([
      'cloud',
      'identity',
      'windows',
    ]);
  });
});
