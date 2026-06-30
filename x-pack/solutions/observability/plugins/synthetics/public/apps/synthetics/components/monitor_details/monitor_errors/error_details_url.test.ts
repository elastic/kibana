/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getErrorDetailsUrl } from './error_details_url';

describe('getErrorDetailsUrl', () => {
  it('builds a URL without spaceId when none is provided', () => {
    expect(
      getErrorDetailsUrl({
        basePath: '',
        configId: 'cfg-1',
        stateId: 'state-1',
        locationId: 'loc-1',
      })
    ).toBe('/app/synthetics/monitor/cfg-1/errors/state-1?locationId=loc-1');
  });

  it('appends spaceId when provided', () => {
    expect(
      getErrorDetailsUrl({
        basePath: '/s/foo',
        configId: 'cfg-1',
        stateId: 'state-1',
        locationId: 'loc-1',
        spaceId: 'team-a',
      })
    ).toBe('/s/foo/app/synthetics/monitor/cfg-1/errors/state-1?locationId=loc-1&spaceId=team-a');
  });

  it('omits locationId when it is undefined', () => {
    expect(
      getErrorDetailsUrl({
        basePath: '',
        configId: 'cfg-1',
        stateId: 'state-1',
      })
    ).toBe('/app/synthetics/monitor/cfg-1/errors/state-1');
  });

  it('omits locationId but keeps spaceId when locationId is undefined', () => {
    expect(
      getErrorDetailsUrl({
        basePath: '',
        configId: 'cfg-1',
        stateId: 'state-1',
        spaceId: 'team-a',
      })
    ).toBe('/app/synthetics/monitor/cfg-1/errors/state-1?spaceId=team-a');
  });

  it('appends remoteName when provided so the Error Details page can route queries at the correct cluster', () => {
    expect(
      getErrorDetailsUrl({
        basePath: '',
        configId: 'cfg-1',
        stateId: 'state-1',
        locationId: 'loc-1',
        remoteName: 'cluster-one',
      })
    ).toBe('/app/synthetics/monitor/cfg-1/errors/state-1?locationId=loc-1&remoteName=cluster-one');
  });

  it('omits remoteName when it is an empty string', () => {
    expect(
      getErrorDetailsUrl({
        basePath: '',
        configId: 'cfg-1',
        stateId: 'state-1',
        locationId: 'loc-1',
        remoteName: '',
      })
    ).toBe('/app/synthetics/monitor/cfg-1/errors/state-1?locationId=loc-1');
  });

  it('appends spaceId and remoteName together when both are provided', () => {
    expect(
      getErrorDetailsUrl({
        basePath: '/s/foo',
        configId: 'cfg-1',
        stateId: 'state-1',
        locationId: 'loc-1',
        spaceId: 'team-a',
        remoteName: 'cluster-one',
      })
    ).toBe(
      '/s/foo/app/synthetics/monitor/cfg-1/errors/state-1?locationId=loc-1&spaceId=team-a&remoteName=cluster-one'
    );
  });
});
