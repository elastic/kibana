/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SYNTHETICS_INDEX_PATTERN } from './constants';
import { getSyntheticsIndices } from './get_synthetics_indices';

describe('getSyntheticsIndices', () => {
  it('returns only the local index when CCS is disabled', () => {
    const result = getSyntheticsIndices({
      useAllRemoteClusters: false,
      selectedRemoteClusters: [],
    });
    expect(result).toStrictEqual([SYNTHETICS_INDEX_PATTERN]);
  });

  it('returns a wildcard remote and the local index when useAllRemoteClusters is true', () => {
    const result = getSyntheticsIndices({
      useAllRemoteClusters: true,
      selectedRemoteClusters: [],
      remoteClusters: [
        { name: 'cluster1', isConnected: true },
        { name: 'cluster2', isConnected: true },
      ],
    });
    expect(result).toStrictEqual([SYNTHETICS_INDEX_PATTERN, `*:${SYNTHETICS_INDEX_PATTERN}`]);
  });

  it('returns only connected clusters from the selected list', () => {
    const result = getSyntheticsIndices({
      useAllRemoteClusters: false,
      selectedRemoteClusters: ['cluster1', 'cluster3'],
      remoteClusters: [
        { name: 'cluster1', isConnected: true },
        { name: 'cluster2', isConnected: true },
        { name: 'cluster3', isConnected: false },
      ],
    });
    expect(result).toStrictEqual([
      SYNTHETICS_INDEX_PATTERN,
      `cluster1:${SYNTHETICS_INDEX_PATTERN}`,
    ]);
  });

  it('excludes clusters not in the selected list even if connected', () => {
    const result = getSyntheticsIndices({
      useAllRemoteClusters: false,
      selectedRemoteClusters: ['cluster1'],
      remoteClusters: [
        { name: 'cluster1', isConnected: true },
        { name: 'cluster2', isConnected: true },
      ],
    });
    expect(result).toStrictEqual([
      SYNTHETICS_INDEX_PATTERN,
      `cluster1:${SYNTHETICS_INDEX_PATTERN}`,
    ]);
  });

  it('returns only the local index when selected clusters are all disconnected', () => {
    const result = getSyntheticsIndices({
      useAllRemoteClusters: false,
      selectedRemoteClusters: ['cluster1', 'cluster2'],
      remoteClusters: [
        { name: 'cluster1', isConnected: false },
        { name: 'cluster2', isConnected: false },
      ],
    });
    expect(result).toStrictEqual([SYNTHETICS_INDEX_PATTERN]);
  });
});
