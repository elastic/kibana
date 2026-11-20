/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MOBILE_FIELDS } from '../../../common/mobile_panel';
import { normalizeVersion } from './normalize_version';
import { latestRelease, rankReleases, toEnvironments, toPlatforms, toRelease } from './rows';

const ALL_MAPPED = new Set<string>(Object.values(MOBILE_FIELDS));

describe('normalizeVersion', () => {
  it.each([
    ['1.2.3', '1.2.3'],
    ['1.2.3 (45)', '1.2.3'],
    ['1.2.3+45', '1.2.3'],
    ['1.2.3-beta.1 (7)', '1.2.3-beta.1'],
    [' 2.0 ', '2.0'],
  ])('turns %p into %p, so one release has one name', (raw, expected) => {
    expect(normalizeVersion(raw)).toBe(expected);
  });
});

describe('rankReleases and latestRelease', () => {
  it('rank the normalized versions by sessions, builds adding up', () => {
    const releases = [
      { version: '1.0.0 (10)', sessions: 4 },
      { version: '1.0.0 (11)', sessions: 4 },
      { version: '1.1.0', sessions: 5 },
    ];

    expect(rankReleases(releases)).toEqual(['1.0.0', '1.1.0']);
    expect(latestRelease(releases)).toBe('1.0.0');
  });

  it('break a tie with the higher version', () => {
    expect(
      latestRelease([
        { version: '1.9.0', sessions: 2 },
        { version: '1.10.0', sessions: 2 },
      ])
    ).toBe('1.10.0');
  });

  it('have no release without a version', () => {
    expect(latestRelease([])).toBeNull();
    expect(latestRelease([{ version: null, sessions: 3 }])).toBeNull();
  });

  it('read a row with toRelease', () => {
    expect(toRelease({ 'service.version': '2.0 (3)', sessions: 7 })).toEqual({
      version: '2.0 (3)',
      sessions: 7,
    });
    expect(toRelease({ sessions: 7 })).toEqual({ version: null, sessions: 7 });
  });
});

describe('toPlatforms', () => {
  it('sorts the platforms of one or many SDK names and leaves out others', () => {
    expect(toPlatforms(['iOS', 'android', 'java'])).toEqual(['android', 'ios']);
    expect(toPlatforms('iOS')).toEqual(['ios']);
    expect(toPlatforms(null)).toEqual([]);
  });
});

describe('toEnvironments', () => {
  it('lists both environment fields, and "Not defined" when a row has neither', () => {
    expect(
      toEnvironments(
        [
          { docs: 3, 'service.environment': 'production' },
          { docs: 2, 'resource.attributes.deployment.environment.name': 'staging' },
          { docs: 1 },
        ],
        ALL_MAPPED
      )
    ).toEqual(['production', 'staging', 'ENVIRONMENT_NOT_DEFINED']);
  });

  it('keeps the 100 most used names, as the web sources do', () => {
    const rows = Array.from({ length: 150 }, (_, index) => ({
      docs: 150 - index,
      'service.environment': `env-${index}`,
    }));

    const environments = toEnvironments(rows, ALL_MAPPED);

    expect(environments).toHaveLength(100);
    expect(environments[0]).toBe('env-0');
  });

  it('has only "Not defined" when no index maps an environment field', () => {
    expect(toEnvironments([{ docs: 4 }], new Set([MOBILE_FIELDS.sdkName]))).toEqual([
      'ENVIRONMENT_NOT_DEFINED',
    ]);
  });
});
