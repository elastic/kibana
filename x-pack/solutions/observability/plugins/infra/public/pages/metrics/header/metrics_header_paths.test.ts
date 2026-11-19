/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isMetricsDetailPath,
  isMetricsHostDetailPath,
  isMetricsHostsPath,
  isMetricsInventoryPath,
} from './metrics_header_paths';

describe('metrics header paths', () => {
  it('matches inventory without treating hosts as inventory', () => {
    expect(isMetricsInventoryPath('/inventory')).toBe(true);
    expect(isMetricsInventoryPath('/hosts')).toBe(false);
  });

  it('matches host detail without matching other detail types', () => {
    expect(isMetricsHostDetailPath('/detail/host')).toBe(true);
    expect(isMetricsHostDetailPath('/detail/host/web-01')).toBe(true);
    expect(isMetricsHostDetailPath('/detail/hostname/web-01')).toBe(false);
    expect(isMetricsHostDetailPath('/detail/container/c1')).toBe(false);
    expect(isMetricsDetailPath('/detail/container/c1')).toBe(true);
  });

  it('matches hosts without matching host detail', () => {
    expect(isMetricsHostsPath('/hosts')).toBe(true);
    expect(isMetricsHostsPath('/detail/host/web-01')).toBe(false);
  });
});
