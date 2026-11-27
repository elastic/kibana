/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mobilePanelQuery } from './filters';
import {
  OTHER_RELEASE_KEY,
  withOtherReleaseStats,
  withReleaseSeries,
  withReleaseStats,
  withReleasesSeen,
} from './releases';

// A new query each time: `pipe` adds to the query it's called on.
const query = () => mobilePanelQuery({ serviceName: 'shop-mobile', release: '2.0.0' });

describe('release queries', () => {
  it('has an "Other" key no release can have: releases without a name are dropped', () => {
    expect(OTHER_RELEASE_KEY).toBe('');
    expect(withReleaseStats(query(), 6).print('basic')).toContain('!= ""');
  });

  it('ranks the releases of the filtered documents with their KPIs and first document', () => {
    const { query: esql, params } = withReleaseStats(query(), 6).toRequest();

    expect(esql).toContain('WHERE `service.name` == ?service_name');
    expect(esql).toContain('WHERE `service.version` == ?release');
    expect(esql).toContain('`service.version` IS NOT NULL');
    expect(esql).toContain('STATS sessions = COUNT_DISTINCT(');
    expect(esql).toContain('first_seen = MIN(@timestamp) BY release = `service.version`');
    expect(esql).toContain('SORT sessions DESC, release DESC | LIMIT 6');
    expect(params).toEqual(
      expect.arrayContaining([{ service_name: 'shop-mobile' }, { release: '2.0.0' }])
    );
  });

  it('counts every release but the top ones together for "Other"', () => {
    const esql = withOtherReleaseStats(query(), ['2.0.0', '1.9.0']).toRequest().query;

    expect(esql).toContain('WHERE NOT (`service.version` IN ("2.0.0", "1.9.0"))');
    expect(esql).toContain('STATS sessions = COUNT_DISTINCT(');
    expect(esql).not.toContain(' BY ');
  });

  it('escapes the releases', () => {
    expect(withOtherReleaseStats(query(), ['1.0"x']).toRequest().query).toContain('"1.0\\"x"');
  });

  it('buckets the series by the interval of the histogram, by group, sorted and capped', () => {
    const esql = withReleaseSeries(query(), ['2.0.0', '1.9.0'], {
      value: 30,
      unit: 's',
    }).toRequest().query;

    expect(esql).toContain('release_group = CASE(`service.version` IN ("2.0.0", "1.9.0"),');
    expect(esql).toContain('BY bucket = TBUCKET("30 seconds"), release_group');
    expect(esql).toContain('SORT bucket ASC | LIMIT 10000');
  });

  it('lists which of the top releases have a document', () => {
    const esql = withReleasesSeen(query(), ['2.0.0']).toRequest().query;

    expect(esql).toContain('WHERE `service.version` IN ("2.0.0")');
    expect(esql).toContain('STATS BY release = `service.version`');
  });
});
