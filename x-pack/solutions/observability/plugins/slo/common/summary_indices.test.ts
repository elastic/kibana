/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getListOfSloSummaryIndices } from './summary_indices';
import { DEFAULT_STALE_SLO_THRESHOLD_HOURS, SUMMARY_DESTINATION_INDEX_PATTERN } from './constants';

describe('getListOfSloSummaryIndices', () => {
  it('should return default index if disabled', function () {
    const settings = {
      useAllRemoteClusters: false,
      selectedRemoteClusters: [],
      staleThresholdInHours: DEFAULT_STALE_SLO_THRESHOLD_HOURS,
    };
    const result = getListOfSloSummaryIndices(settings, []);
    expect(result).toBe(SUMMARY_DESTINATION_INDEX_PATTERN);
  });

  it('should return all remote clusters when enabled', function () {
    const settings = {
      useAllRemoteClusters: true,
      selectedRemoteClusters: [],
      staleThresholdInHours: DEFAULT_STALE_SLO_THRESHOLD_HOURS,
    };
    const clustersByName = [
      { name: 'cluster1', isConnected: true },
      { name: 'cluster2', isConnected: true },
    ];
    const result = getListOfSloSummaryIndices(settings, clustersByName);
    expect(result).toBe(
      `${SUMMARY_DESTINATION_INDEX_PATTERN},cluster1:${SUMMARY_DESTINATION_INDEX_PATTERN},cluster2:${SUMMARY_DESTINATION_INDEX_PATTERN}`
    );
  });

  it('should return selected when enabled', function () {
    const settings = {
      useAllRemoteClusters: false,
      selectedRemoteClusters: ['cluster1'],
      staleThresholdInHours: DEFAULT_STALE_SLO_THRESHOLD_HOURS,
    };
    const clustersByName = [
      { name: 'cluster1', isConnected: true },
      { name: 'cluster2', isConnected: true },
    ];
    const result = getListOfSloSummaryIndices(settings, clustersByName);
    expect(result).toBe(
      `${SUMMARY_DESTINATION_INDEX_PATTERN},cluster1:${SUMMARY_DESTINATION_INDEX_PATTERN}`
    );
  });
});
