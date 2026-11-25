/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InventoryItemType, SnapshotMetricType } from '@kbn/metrics-data-access-plugin/common';
import type { SnapshotMetricInput } from '../../../../../common/http_api/snapshot_api';

/**
 * Static Kubernetes Pod snapshot metric types.
 * Same keys as `metrics_data_access` pod `snapshot` catalog (`cpu`, `memory`, `rx`, `tx`).
 */
export const POD_SNAPSHOT_METRIC_TYPES = ['cpu', 'memory', 'rx', 'tx'] as const;

/**
 * Replaces a snapshot metric the current schema catalog does not offer.
 *
 * Hosts default to `cpuV2`. Pod catalogs only offer `cpu`, `memory`, `rx`, and `tx`.
 * A deep link that keeps `cpuV2` onto pods makes the snapshot request fail.
 * Custom metrics are not catalog entries and stay as entered. An empty catalog
 * means aggregations are still loading.
 */
export const snapshotMetricForCatalog = (
  metric: SnapshotMetricInput,
  availableMetricTypes: readonly string[],
  defaultSnapshot: SnapshotMetricType
): SnapshotMetricInput => {
  if (metric.type === 'custom' || availableMetricTypes.length === 0) {
    return metric;
  }

  if (availableMetricTypes.includes(metric.type)) {
    return metric;
  }

  return { type: defaultSnapshot };
};

/**
 * Metric to send on the inventory snapshot request before the async catalog loads.
 * Pods use the static snapshot type list so the first request is not `cpuV2`.
 */
export const snapshotMetricForInventoryRequest = (
  nodeType: InventoryItemType,
  metric: SnapshotMetricInput,
  defaultSnapshot: SnapshotMetricType
): SnapshotMetricInput => {
  if (nodeType !== 'pod') {
    return metric;
  }

  return snapshotMetricForCatalog(metric, POD_SNAPSHOT_METRIC_TYPES, defaultSnapshot);
};
