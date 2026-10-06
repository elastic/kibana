/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  KUBELET_STATS_RECEIVER_OTEL,
  SEMCONV_K8S_POD_CPU_NODE_UTILIZATION,
  SEMCONV_K8S_POD_NETWORK_IO,
} from '../../../../../constants';
import { podCpuUsage } from './pod_cpu_usage';
import { podMemoryUsage } from './pod_memory_usage';
import { podNetworkTraffic } from './pod_network_traffic';
import { podOverview } from './pod_overview';

const timeField = '@timestamp';
const indexPattern = 'metrics-*';
const interval = '>=1m';

describe('pod TSVB models', () => {
  const creators = [podOverview, podCpuUsage, podMemoryUsage, podNetworkTraffic];

  it('keeps the Elastic Common Schema models when schema is omitted', () => {
    for (const createModel of creators) {
      const model = createModel(timeField, indexPattern, interval);
      expect(model.requires).toEqual(['kubernetes.pod']);
      expect(JSON.stringify(model)).not.toContain('k8s.');
      expect(JSON.stringify(model)).not.toContain('kubeletstats');
    }

    expect(podCpuUsage(timeField, indexPattern, interval).series[0].metrics[0]).toEqual({
      field: 'kubernetes.pod.cpu.usage.node.pct',
      id: 'avg-cpu-without',
      type: 'avg',
    });
    expect(
      podOverview(timeField, indexPattern, interval).series.map((series) => series.id)
    ).toEqual(['cpu', 'memory', 'rx', 'tx']);
    const overviewRx = podOverview(timeField, indexPattern, interval).series[2];
    expect(overviewRx.metrics.map((metric) => metric.id)).toEqual([
      'max-network-rx',
      'deriv-max-network-rx',
      'posonly-deriv-max-network-rx',
    ]);
    const trafficRx = podNetworkTraffic(timeField, indexPattern, interval).series[1];
    expect(trafficRx.metrics.map((metric) => metric.id)).toEqual([
      'max-network-rx',
      'deriv-max-network-rx',
      'posonly-deriv-max-net-rx',
      'invert-posonly-deriv-max-network-rx',
    ]);
  });

  it('builds kubeletstats models for OpenTelemetry pods', () => {
    for (const createModel of creators) {
      const model = createModel(timeField, indexPattern, interval, { schema: 'semconv' });
      expect(model.requires).toEqual([KUBELET_STATS_RECEIVER_OTEL]);
      expect(JSON.stringify(model)).not.toContain('kubernetes.');
    }

    const overview = podOverview(timeField, indexPattern, interval, { schema: 'semconv' });
    const rx = overview.series.find((series) => series.id === 'rx');
    const tx = overview.series.find((series) => series.id === 'tx');
    expect(rx?.split_mode).toBe('filter');
    expect(tx?.split_mode).toBe('filter');
    expect(rx?.filter).toEqual({ query: 'direction: receive', language: 'kuery' });
    expect(tx?.filter).toEqual({ query: 'direction: transmit', language: 'kuery' });
    expect(rx?.metrics[0]).toMatchObject({ field: SEMCONV_K8S_POD_NETWORK_IO, type: 'max' });
    expect(overview.series[0].metrics[0]).toMatchObject({
      field: SEMCONV_K8S_POD_CPU_NODE_UTILIZATION,
    });
  });
});
