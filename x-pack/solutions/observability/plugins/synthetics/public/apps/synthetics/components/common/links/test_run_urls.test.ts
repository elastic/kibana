/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTestRunDetailLink, getTestRunDetailRelativeLink } from './test_run_urls';

describe('getTestRunDetailRelativeLink', () => {
  it('builds a relative URL with locationId only when no spaceId is provided', () => {
    expect(
      getTestRunDetailRelativeLink({
        monitorId: 'mon-1',
        checkGroup: 'cg-1',
        locationId: 'loc-1',
      })
    ).toBe('/monitor/mon-1/test-run/cg-1?locationId=loc-1');
  });

  it('appends spaceId when provided', () => {
    expect(
      getTestRunDetailRelativeLink({
        monitorId: 'mon-1',
        checkGroup: 'cg-1',
        locationId: 'loc-1',
        spaceId: 'team-a',
      })
    ).toBe('/monitor/mon-1/test-run/cg-1?locationId=loc-1&spaceId=team-a');
  });

  it('omits spaceId when it is an empty string', () => {
    expect(
      getTestRunDetailRelativeLink({
        monitorId: 'mon-1',
        checkGroup: 'cg-1',
        locationId: 'loc-1',
        spaceId: '',
      })
    ).toBe('/monitor/mon-1/test-run/cg-1?locationId=loc-1');
  });

  it('omits locationId when it is undefined', () => {
    expect(
      getTestRunDetailRelativeLink({
        monitorId: 'mon-1',
        checkGroup: 'cg-1',
      })
    ).toBe('/monitor/mon-1/test-run/cg-1');
  });

  it('omits locationId but keeps spaceId when locationId is undefined', () => {
    expect(
      getTestRunDetailRelativeLink({
        monitorId: 'mon-1',
        checkGroup: 'cg-1',
        spaceId: 'team-a',
      })
    ).toBe('/monitor/mon-1/test-run/cg-1?spaceId=team-a');
  });
});

describe('getTestRunDetailLink', () => {
  it('prefixes basePath and reuses the relative link, including spaceId', () => {
    expect(
      getTestRunDetailLink({
        basePath: '/s/foo',
        monitorId: 'mon-1',
        checkGroup: 'cg-1',
        locationId: 'loc-1',
        spaceId: 'team-a',
      })
    ).toBe('/s/foo/app/synthetics/monitor/mon-1/test-run/cg-1?locationId=loc-1&spaceId=team-a');
  });
});
