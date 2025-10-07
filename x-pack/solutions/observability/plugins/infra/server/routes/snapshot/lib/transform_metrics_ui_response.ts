/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, isNumber } from 'lodash';
import type {
  MetricsAPIRequest,
  MetricsAPIResponse,
  SnapshotMetricType,
} from '@kbn/metrics-data-access-plugin/common';
import type {
  SnapshotNodeResponse,
  SnapshotRequest,
  SnapshotNode,
  SnapshotNodeMetric,
} from '../../../../common/http_api';
import { META_KEY } from './constants';
import { applyMetadataToLastPath } from './apply_metadata_to_last_path';

export const transformMetricsApiResponseToSnapshotResponse = (
  options: MetricsAPIRequest,
  snapshotRequest: SnapshotRequest,
  metricsApiResponse: MetricsAPIResponse
): SnapshotNodeResponse => {
  const nodes = metricsApiResponse.series
    .map((series) => {
      const node = {
        name: '',
        metrics: getMetrics(options, snapshotRequest, series),
        path: (series.keys ?? []).map((key) => {
          return { value: key, label: key };
        }),
      };

      const isNoData = node.metrics.every((m) => m.value === null);
      const isAPMNode = series.metricsets?.includes('app');
      if (isNoData && isAPMNode) return null;

      const path = applyMetadataToLastPath(series, node, snapshotRequest);
      const name = last(path)?.label ?? 'N/A';

      return { ...node, path, name };
    })
    .filter((n) => n !== null) as SnapshotNode[];

  return {
    nodes,
    interval:
      metricsApiResponse.info.interval !== undefined
        ? `${metricsApiResponse.info.interval}s`
        : undefined,
  };
};

const getMetrics = (
  options: MetricsAPIRequest,
  snapshotRequest: SnapshotRequest,
  series: MetricsAPIResponse['series'][number]
): SnapshotNodeMetric[] => {
  return options.metrics
    .filter((m) => m.id !== META_KEY)
    .map((metric) => {
      const name = metric.id as SnapshotMetricType;

      // In single-bucket mode, we have only one row
      const singleRow = series.rows.length > 0 ? series.rows[0] : null;
      const value = singleRow ? get(singleRow, metric.id, null) : null;
      const numericValue = isNumber(value) && Number.isFinite(value) ? value : null;

      // For single bucket, max and avg are the same as the value
      // Note: timeseries is always undefined in single-bucket mode (no date_histogram)
      return {
        name,
        value: numericValue,
        max: numericValue,
        avg: numericValue,
      };
    });
};
