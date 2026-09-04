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
});
