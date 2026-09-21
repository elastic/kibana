/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  groupOverviewStatusFilterIds,
  overviewStatusFilterIdKey,
  toOverviewStatusFilterId,
} from './overview_status_filter_id';

const loc = { id: 'us-east', label: 'US East', status: 'up' };

describe('toOverviewStatusFilterId', () => {
  it('omits cluster and location for a local saved-object monitor', () => {
    expect(
      toOverviewStatusFilterId({
        monitorQueryId: 'cfg1',
        locations: [loc, { id: 'eu-west', label: 'EU West', status: 'up' }],
      })
    ).toEqual({ monitorQueryId: 'cfg1' });
  });

  it('includes cluster and location for a CCS/CPS monitor', () => {
    expect(
      toOverviewStatusFilterId({
        monitorQueryId: 'shared',
        remote: { remoteName: 'cluster-east' },
        locations: [loc],
      })
    ).toEqual({
      monitorQueryId: 'shared',
      remoteName: 'cluster-east',
      locationId: 'us-east',
    });
  });

  it('includes location for a Heartbeat monitor', () => {
    expect(
      toOverviewStatusFilterId({
        monitorQueryId: 'auto',
        origin: 'heartbeat',
        locations: [loc],
      })
    ).toEqual({ monitorQueryId: 'auto', locationId: 'us-east' });
  });

  it('omits cluster and location for a multi-location local monitor with remote metadata on one location', () => {
    expect(
      toOverviewStatusFilterId({
        monitorQueryId: 'shared',
        remote: { remoteName: 'cluster-east' },
        locations: [loc, { id: 'eu-west', label: 'EU West', status: 'up' }],
      })
    ).toEqual({ monitorQueryId: 'shared' });
  });
});

describe('overviewStatusFilterIdKey', () => {
  it('distinguishes two CCS copies of the same monitor id', () => {
    expect(
      overviewStatusFilterIdKey({
        monitorQueryId: 'shared',
        remoteName: 'cluster-east',
        locationId: 'us-east',
      })
    ).not.toEqual(
      overviewStatusFilterIdKey({
        monitorQueryId: 'shared',
        remoteName: 'cluster-west',
        locationId: 'us-east',
      })
    );
  });

  it('distinguishes two Heartbeat locations of the same monitor id', () => {
    expect(
      overviewStatusFilterIdKey({ monitorQueryId: 'auto', locationId: 'us-east' })
    ).not.toEqual(overviewStatusFilterIdKey({ monitorQueryId: 'auto', locationId: 'eu-west' }));
  });
});

describe('groupOverviewStatusFilterIds', () => {
  it('groups query ids that share cluster and location', () => {
    expect(
      groupOverviewStatusFilterIds([
        { monitorQueryId: 'a', remoteName: 'cluster-east', locationId: 'us-east' },
        { monitorQueryId: 'b', remoteName: 'cluster-east', locationId: 'us-east' },
        { monitorQueryId: 'a', remoteName: 'cluster-west', locationId: 'us-east' },
      ])
    ).toEqual([
      { remoteName: 'cluster-east', locationId: 'us-east', queryIds: ['a', 'b'] },
      { remoteName: 'cluster-west', locationId: 'us-east', queryIds: ['a'] },
    ]);
  });
});
