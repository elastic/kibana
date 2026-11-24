/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mobilePanelQuery } from './filters';
import {
  OTHER_RELEASE_KEY,
  toEsqlDuration,
  withReleaseFirstSeen,
  withReleaseSeries,
  withReleaseTotals,
} from './releases';

const query = mobilePanelQuery({ serviceName: 'shop-mobile', release: '2.0.0' });

describe('toEsqlDuration', () => {
  it.each([
    [{ value: 30, unit: 's' as const }, '30 seconds'],
    [{ value: 1, unit: 's' as const }, '1 second'],
    [{ value: 1, unit: 'd' as const }, '1 day'],
    [{ value: 1, unit: 'w' as const }, '1 week'],
    [{ value: 1, unit: 'M' as const }, '1 month'],
    [{ value: 1, unit: 'y' as const }, '1 year'],
  ])('writes %j as %s', (interval, duration) => {
    expect(toEsqlDuration(interval)).toBe(duration);
  });
});

describe('release queries', () => {
  it('has an "Other" key no release can have: releases without a name are dropped', () => {
    expect(OTHER_RELEASE_KEY).toBe('');
    expect(withReleaseTotals(query, ['2.0.0']).print('basic')).toContain('!= ""');
  });

  it('groups the top releases and the rest, over the filtered documents with a release', () => {
    const { query: esql, params } = withReleaseTotals(query, ['2.0.0', '1.9.0']).toRequest();

    expect(esql).toContain('WHERE `service.name` == ?service_name');
    expect(esql).toContain('WHERE `service.version` == ?release');
    expect(esql).toContain('`service.version` IS NOT NULL');
    expect(esql).toContain('release_group = CASE(`service.version` IN ("2.0.0", "1.9.0"),');
    expect(esql).toContain('STATS sessions = COUNT_DISTINCT(');
    expect(esql).toContain('BY release_group');
    expect(params).toEqual(
      expect.arrayContaining([{ service_name: 'shop-mobile' }, { release: '2.0.0' }])
    );
  });

  it('escapes the releases', () => {
    expect(withReleaseTotals(query, ['1.0"x']).toRequest().query).toContain('"1.0\\"x"');
  });

  it('buckets the series by the interval of the histogram', () => {
    const esql = withReleaseSeries(query, ['2.0.0'], { value: 30, unit: 's' }).toRequest().query;

    expect(esql).toContain('BY bucket = TBUCKET("30 seconds"), release_group');
  });

  it('finds when the top releases first appear', () => {
    const esql = withReleaseFirstSeen(query, ['2.0.0']).toRequest().query;

    expect(esql).toContain('WHERE `service.version` IN ("2.0.0")');
    expect(esql).toContain('STATS first_seen = MIN(@timestamp) BY release = `service.version`');
  });
});
