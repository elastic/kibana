/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  POD_SNAPSHOT_METRIC_TYPES,
  snapshotMetricForCatalog,
  snapshotMetricForInventoryRequest,
} from './snapshot_metric_for_catalog';

const podCatalog = [...POD_SNAPSHOT_METRIC_TYPES];

describe('snapshotMetricForCatalog', () => {
  it('keeps a metric the catalog offers', () => {
    const metric = { type: 'cpu' as const };
    expect(snapshotMetricForCatalog(metric, podCatalog, 'cpu')).toBe(metric);
  });

  it('replaces a hosts metric that pods do not offer', () => {
    expect(snapshotMetricForCatalog({ type: 'cpuV2' }, podCatalog, 'cpu')).toEqual({
      type: 'cpu',
    });
  });

  it('keeps a custom metric', () => {
    const metric = {
      type: 'custom' as const,
      field: 'system.cpu.total.norm.pct',
      aggregation: 'avg' as const,
      id: 'custom-1',
    };
    expect(snapshotMetricForCatalog(metric, podCatalog, 'cpu')).toBe(metric);
  });

  it('keeps the current metric while the catalog is still loading', () => {
    const metric = { type: 'cpuV2' as const };
    expect(snapshotMetricForCatalog(metric, [], 'cpu')).toBe(metric);
  });
});

describe('snapshotMetricForInventoryRequest', () => {
  it('replaces cpuV2 with cpu before the first pod snapshot', () => {
    expect(snapshotMetricForInventoryRequest('pod', { type: 'cpuV2' }, 'cpu')).toEqual({
      type: 'cpu',
    });
  });

  it('keeps the stored metric for hosts', () => {
    const metric = { type: 'cpuV2' as const };
    expect(snapshotMetricForInventoryRequest('host', metric, 'cpuV2')).toBe(metric);
  });

  it('keeps a pod metric the catalog offers', () => {
    const metric = { type: 'memory' as const };
    expect(snapshotMetricForInventoryRequest('pod', metric, 'cpu')).toBe(metric);
  });
});
