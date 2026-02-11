/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SUMMARY_DESTINATION_INDEX_PATTERN } from './constants';
import { getSLOSummaryIndices } from './get_slo_summary_indices';

describe('getSLOSummaryIndices', () => {
  it('returns the local index if disabled', function () {
    const result = getSLOSummaryIndices({
      useAllRemoteClusters: false,
      selectedRemoteClusters: [],
    });
    expect(result).toStrictEqual([SUMMARY_DESTINATION_INDEX_PATTERN]);
  });

  it('returns a wildcard remote and the local index when useAllRemoteClusters is true', function () {
    const clustersByName = [
      { name: 'cluster1', isConnected: true },
      { name: 'cluster2', isConnected: true },
    ];
    const result = getSLOSummaryIndices({
      useAllRemoteClusters: true,
      selectedRemoteClusters: [],
      remoteClusters: clustersByName,
    });
    expect(result).toStrictEqual([
      SUMMARY_DESTINATION_INDEX_PATTERN,
      `*:${SUMMARY_DESTINATION_INDEX_PATTERN}`,
    ]);
  });

  it('returns only the connected clusters from the selected list when useAllRemoteClusters is false', function () {
    const clustersByName = [
      { name: 'cluster1', isConnected: true },
      { name: 'cluster2', isConnected: true },
      { name: 'cluster3', isConnected: false },
    ];
    const result = getSLOSummaryIndices({
      useAllRemoteClusters: false,
      selectedRemoteClusters: ['cluster1', 'cluster3'],
      remoteClusters: clustersByName,
    });
    expect(result).toStrictEqual([
      SUMMARY_DESTINATION_INDEX_PATTERN,
      `cluster1:${SUMMARY_DESTINATION_INDEX_PATTERN}`,
    ]);
  });
});
