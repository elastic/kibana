/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toEnvironments, toOsNames, toRelease, toReleases } from './rows';
import type { EnvironmentRow, OsRow, ReleaseRow } from './rows';

// A column every row has null for is dropped from the response, so rows can miss any value.
const environmentRows = (rows: Array<Partial<EnvironmentRow>>) => rows as EnvironmentRow[];
const releaseRows = (rows: Array<Partial<ReleaseRow>>) => rows as ReleaseRow[];
const osRows = (rows: Array<Partial<OsRow>>) => rows as OsRow[];

describe('toReleases', () => {
  it('lists the releases of the rows in their order, with their sessions, for the picker', () => {
    expect(
      toReleases(
        releaseRows([
          { release: '1.1.0', sessions: 7 },
          { release: '1.0.0', sessions: 3 },
          { release: null, sessions: 2 },
        ])
      )
    ).toEqual([
      { key: '1.1.0', count: 7 },
      { key: '1.0.0', count: 3 },
    ]);
  });

  it('counts 0 sessions for a release whose count is missing', () => {
    expect(toReleases(releaseRows([{ release: '1.0.0' }]))).toEqual([{ key: '1.0.0', count: 0 }]);
  });

  it('leaves out a release longer than the KPI route accepts', () => {
    expect(
      toReleases(
        releaseRows([
          { release: 'x'.repeat(1025), sessions: 9 },
          { release: '1.0.0', sessions: 1 },
        ])
      )
    ).toEqual([{ key: '1.0.0', count: 1 }]);
  });
});

describe('toRelease', () => {
  it('keeps a release up to the length the KPI route accepts', () => {
    expect(toRelease('2.10.0')).toBe('2.10.0');
    expect(toRelease('x'.repeat(1024))).toBe('x'.repeat(1024));
  });

  it('has no release when it is missing, empty or longer than the KPI route accepts', () => {
    expect(toRelease(undefined)).toBeNull();
    expect(toRelease(null)).toBeNull();
    expect(toRelease('')).toBeNull();
    expect(toRelease('x'.repeat(1025))).toBeNull();
  });
});

describe('toOsNames', () => {
  it('lists each OS name once, in the order of the rows, with the sessions of all its rows', () => {
    expect(
      toOsNames(
        osRows([
          { os_name: 'Android', platform: 'android', sessions: 5 },
          { os_name: 'iOS', platform: 'ios', sessions: 3 },
          { os_name: 'Android', platform: 'android', sessions: 2 },
          { os_name: null, platform: 'android', sessions: 4 },
        ])
      )
    ).toEqual([
      { key: 'Android', count: 7 },
      { key: 'iOS', count: 3 },
    ]);
  });

  it('leaves out an OS name longer than the KPI route accepts', () => {
    expect(
      toOsNames(
        osRows([
          { os_name: 'x'.repeat(65), sessions: 1 },
          { os_name: 'x'.repeat(64), sessions: 2 },
        ])
      )
    ).toEqual([{ key: 'x'.repeat(64), count: 2 }]);
  });
});

describe('toEnvironments', () => {
  it('lists both environment fields, and "Not defined" when a row has neither', () => {
    expect(
      toEnvironments(
        environmentRows([
          { docs: 3, 'service.environment': 'production' },
          { docs: 2, 'resource.attributes.deployment.environment.name': 'staging' },
          { docs: 1 },
        ])
      )
    ).toEqual(['production', 'staging', 'ENVIRONMENT_NOT_DEFINED']);
  });

  it.each([
    ['an empty environment name', { 'resource.attributes.deployment.environment.name': '' }],
    ['an empty service environment', { 'service.environment': '' }],
    [
      'both empty',
      { 'service.environment': '', 'resource.attributes.deployment.environment.name': '' },
    ],
  ])(
    'lists no "Not defined" for %s, which the KPI filters treat as indexed, so it would match nothing',
    (_, fields) => {
      expect(toEnvironments(environmentRows([{ docs: 2, ...fields }]))).toEqual([]);
    }
  );

  it('lists "Not defined" for null fields, as the response sends a field no index maps', () => {
    expect(
      toEnvironments(
        environmentRows([
          {
            docs: 1,
            'service.environment': null,
            'resource.attributes.deployment.environment.name': null,
          },
        ])
      )
    ).toEqual(['ENVIRONMENT_NOT_DEFINED']);
  });

  it('lists "Not defined" for APM\'s sentinel, as the KPI filter matches it', () => {
    expect(
      toEnvironments(
        environmentRows([
          { docs: 3, 'service.environment': 'production' },
          { docs: 1, 'service.environment': 'ENVIRONMENT_NOT_DEFINED' },
        ])
      )
    ).toEqual(['production', 'ENVIRONMENT_NOT_DEFINED']);
  });

  it('leaves out a name longer than the environment filter accepts', () => {
    expect(
      toEnvironments(
        environmentRows([{ docs: 2, 'service.environment': 'x'.repeat(1025) }, { docs: 1 }])
      )
    ).toEqual(['ENVIRONMENT_NOT_DEFINED']);
  });

  it('keeps the 100 most used names, as the web sources do', () => {
    const rows = Array.from({ length: 150 }, (_, index) => ({
      docs: 150 - index,
      'service.environment': `env-${index}`,
    }));

    const environments = toEnvironments(environmentRows(rows));

    expect(environments).toHaveLength(100);
    expect(environments[0]).toBe('env-0');
  });
});
