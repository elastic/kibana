/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getMonitorIdentityFilter } from './monitor_identity_filter';

describe('getMonitorIdentityFilter', () => {
  it('filters Kibana-managed monitors by config_id', () => {
    expect(getMonitorIdentityFilter({ monitorId: 'so-1' })).toEqual({
      term: { config_id: 'so-1' },
    });
  });

  it('filters CCS remote monitors by config_id even if origin is heartbeat', () => {
    expect(
      getMonitorIdentityFilter({
        monitorId: 'so-1',
        origin: 'heartbeat',
        remoteName: 'cluster-a',
      })
    ).toEqual({ term: { config_id: 'so-1' } });
  });

  it('filters local Heartbeat / Agent monitors by monitor.id', () => {
    expect(getMonitorIdentityFilter({ monitorId: 'k8s-http', origin: 'heartbeat' })).toEqual({
      term: { 'monitor.id': 'k8s-http' },
    });
  });
});
