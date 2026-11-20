/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toEnvironments, toPlatforms, toReleases } from './rows';
import type { EnvironmentRow, ReleaseRow } from './rows';

// A column every row has null for is dropped from the response, so rows can miss any value.
const environmentRows = (rows: Array<Partial<EnvironmentRow>>) => rows as EnvironmentRow[];
const releaseRows = (rows: Array<Partial<ReleaseRow>>) => rows as ReleaseRow[];

describe('toReleases', () => {
  it('lists the releases of the rows in their order', () => {
    expect(
      toReleases(releaseRows([{ release: '1.1.0' }, { release: '1.0.0' }, { release: null }]))
    ).toEqual(['1.1.0', '1.0.0']);
  });
});

describe('toPlatforms', () => {
  it('sorts the platforms of one or many SDK names and leaves out others', () => {
    expect(toPlatforms(['iOS', 'android', 'java'])).toEqual(['android', 'ios']);
    expect(toPlatforms('iOS')).toEqual(['ios']);
    expect(toPlatforms(null)).toEqual([]);
    expect(toPlatforms(['android', null, undefined])).toEqual(['android']);
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
