/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SnapshotMetricType } from '@kbn/metrics-data-access-plugin/common';
import type { SnapshotMetricInput } from '../../../../../common/http_api/snapshot_api';

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
