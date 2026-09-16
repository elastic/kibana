/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOverviewConfigKey } from './overview_config_key';

const loc = { id: 'us-east', label: 'US East', status: 'up' };

describe('getOverviewConfigKey', () => {
  it('uses configId for a local saved-object monitor', () => {
    expect(
      getOverviewConfigKey({
        configId: 'cfg1',
        locations: [loc, { id: 'eu-west', label: 'EU West', status: 'up' }],
      })
    ).toBe('cfg1');
  });

  it('includes cluster and location for a CCS/CPS monitor', () => {
    expect(
      getOverviewConfigKey({
        configId: 'shared',
        remote: { remoteName: 'cluster-east' },
        locations: [loc],
      })
    ).toBe('cluster-east-shared-us-east');
  });

  it('distinguishes the same config on two clusters', () => {
    const east = getOverviewConfigKey({
      configId: 'shared',
      remote: { remoteName: 'cluster-east' },
      locations: [loc],
    });
    const west = getOverviewConfigKey({
      configId: 'shared',
      remote: { remoteName: 'cluster-west' },
      locations: [loc],
    });
    expect(east).not.toBe(west);
  });

  it('includes origin and location for a Heartbeat monitor', () => {
    expect(
      getOverviewConfigKey({
        configId: 'auto',
        origin: 'heartbeat',
        locations: [loc],
      })
    ).toBe('heartbeat-auto-us-east');
  });

  it('uses configId, not the remote key, for a multi-location local monitor with remote metadata on one location', () => {
    // A local, SO-backed monitor can have `remote` attached when the winning
    // ping for one of its locations happens to resolve through a linked
    // cluster. A genuine CCS/CPS-only row is always a single location, so a
    // config with more than one location is never that — it must use its
    // plain configId regardless of the (spurious) remote/heartbeat tag.
    expect(
      getOverviewConfigKey({
        configId: 'shared',
        remote: { remoteName: 'cluster-east' },
        locations: [loc, { id: 'eu-west', label: 'EU West', status: 'up' }],
      })
    ).toBe('shared');

    expect(
      getOverviewConfigKey({
        configId: 'auto',
        origin: 'heartbeat',
        locations: [loc, { id: 'eu-west', label: 'EU West', status: 'up' }],
      })
    ).toBe('auto');
  });
});
