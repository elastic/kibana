/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InfraMetadataFeature } from '../../../../../common/http_api/metadata_api';
import { getFilteredMetrics } from './get_filtered_metrics';

const feature = (name: string): InfraMetadataFeature => ({
  name,
  source: 'metrics',
});

const required = [
  'podOverview',
  'podCpuUsage',
  'podMemoryUsage',
  'podNetworkTraffic',
  'podLogUsage',
  'nginxHits',
] as const;

describe('getFilteredMetrics', () => {
  it('keeps Elastic Common Schema pod charts when schema is omitted', () => {
    expect(getFilteredMetrics([...required], [feature('kubernetes.pod')])).toEqual([
      'podOverview',
      'podCpuUsage',
      'podMemoryUsage',
      'podNetworkTraffic',
      'podLogUsage',
    ]);
  });

  it('keeps kubeletstats pod charts and drops nginx and log usage for OpenTelemetry', () => {
    expect(
      getFilteredMetrics([...required], [feature('kubeletstatsreceiver.otel')], 'semconv')
    ).toEqual(['podOverview', 'podCpuUsage', 'podMemoryUsage', 'podNetworkTraffic']);
  });

  it('keeps nothing when OpenTelemetry features are paired with the default schema', () => {
    expect(getFilteredMetrics([...required], [feature('kubeletstatsreceiver.otel')])).toEqual([]);
  });

  it('keeps nginx when its module is present', () => {
    expect(getFilteredMetrics(['nginxHits'], [feature('nginx.access')])).toEqual(['nginxHits']);
  });
});
