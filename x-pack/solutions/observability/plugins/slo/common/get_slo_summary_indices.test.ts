/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSLOSummaryIndices } from './get_slo_summary_indices';
import { DEFAULT_STALE_SLO_THRESHOLD_HOURS, SUMMARY_DESTINATION_INDEX_PATTERN } from './constants';

describe('getSLOSummaryIndices', () => {
  it('returns the local index if disabled', function () {
    const settings = {
      useAllRemoteClusters: false,
      selectedRemoteClusters: [],
      staleThresholdInHours: DEFAULT_STALE_SLO_THRESHOLD_HOURS,
    };
    const result = getSLOSummaryIndices(settings, []);
    expect(result).toStrictEqual([SUMMARY_DESTINATION_INDEX_PATTERN]);
  });

  it('returns a wildcard remote and the local index when useAllRemoteClusters is true', function () {
    const settings = {
      useAllRemoteClusters: true,
      selectedRemoteClusters: [],
      staleThresholdInHours: DEFAULT_STALE_SLO_THRESHOLD_HOURS,
    };
    const clustersByName = [
      { name: 'cluster1', isConnected: true },
      { name: 'cluster2', isConnected: true },
    ];
    const result = getSLOSummaryIndices(settings, clustersByName);
    expect(result).toStrictEqual([
      SUMMARY_DESTINATION_INDEX_PATTERN,
      `*:${SUMMARY_DESTINATION_INDEX_PATTERN}`,
    ]);
  });

  it('returns only the connected clusters from the selected list when useAllRemoteClusters is false', function () {
    const settings = {
      useAllRemoteClusters: false,
      selectedRemoteClusters: ['cluster1', 'cluster3'],
      staleThresholdInHours: DEFAULT_STALE_SLO_THRESHOLD_HOURS,
    };
    const clustersByName = [
      { name: 'cluster1', isConnected: true },
      { name: 'cluster2', isConnected: true },
      { name: 'cluster3', isConnected: false },
    ];
    const result = getSLOSummaryIndices(settings, clustersByName);
    expect(result).toStrictEqual([
      SUMMARY_DESTINATION_INDEX_PATTERN,
      `cluster1:${SUMMARY_DESTINATION_INDEX_PATTERN}`,
    ]);
  });
});
