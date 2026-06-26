/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getStepDetailLink } from './use_step_detail_page';

describe('getStepDetailLink', () => {
  it('builds a URL with only locationId when no spaceId or remoteName is provided', () => {
    expect(
      getStepDetailLink({
        basePath: '',
        monitorId: 'mon-1',
        checkGroupId: 'cg-1',
        stepIndex: 1,
        locationId: 'loc-1',
      })
    ).toBe('/app/synthetics/monitor/mon-1/test-run/cg-1/step/1?locationId=loc-1');
  });

  it('appends spaceId when provided', () => {
    expect(
      getStepDetailLink({
        basePath: '/s/foo',
        monitorId: 'mon-1',
        checkGroupId: 'cg-1',
        stepIndex: 2,
        locationId: 'loc-1',
        spaceId: 'team-a',
      })
    ).toBe(
      '/s/foo/app/synthetics/monitor/mon-1/test-run/cg-1/step/2?locationId=loc-1&spaceId=team-a'
    );
  });

  it('appends remoteName so the Step Details page targets the correct cluster', () => {
    expect(
      getStepDetailLink({
        basePath: '',
        monitorId: 'mon-1',
        checkGroupId: 'cg-1',
        stepIndex: 1,
        locationId: 'loc-1',
        remoteName: 'cluster-one',
      })
    ).toBe(
      '/app/synthetics/monitor/mon-1/test-run/cg-1/step/1?locationId=loc-1&remoteName=cluster-one'
    );
  });

  it('appends spaceId and remoteName together when both are provided', () => {
    expect(
      getStepDetailLink({
        basePath: '/s/foo',
        monitorId: 'mon-1',
        checkGroupId: 'cg-1',
        stepIndex: 3,
        locationId: 'loc-1',
        spaceId: 'team-a',
        remoteName: 'cluster-one',
      })
    ).toBe(
      '/s/foo/app/synthetics/monitor/mon-1/test-run/cg-1/step/3?locationId=loc-1&spaceId=team-a&remoteName=cluster-one'
    );
  });

  it('omits empty values', () => {
    expect(
      getStepDetailLink({
        basePath: '',
        monitorId: 'mon-1',
        checkGroupId: 'cg-1',
        stepIndex: 1,
        spaceId: '',
        remoteName: '',
      })
    ).toBe('/app/synthetics/monitor/mon-1/test-run/cg-1/step/1');
  });

  it('keeps remoteName even when locationId is undefined', () => {
    expect(
      getStepDetailLink({
        basePath: '',
        monitorId: 'mon-1',
        checkGroupId: 'cg-1',
        stepIndex: 1,
        remoteName: 'cluster-one',
      })
    ).toBe('/app/synthetics/monitor/mon-1/test-run/cg-1/step/1?remoteName=cluster-one');
  });
});
