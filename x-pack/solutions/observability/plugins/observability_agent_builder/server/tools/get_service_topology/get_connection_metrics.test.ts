/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectionWithKey } from './types';
import { computeConnectionMetrics, finalizeConnections } from './get_connection_metrics';

describe('computeConnectionMetrics', () => {
  it('converts latency from microseconds to milliseconds', () => {
    const { latencyMs } = computeConnectionMetrics({
      latencyUs: 5000,
      throughputPerMin: 100,
      errorRate: 0.05,
    });

    expect(latencyMs).toBe(5);
  });

  it('rounds throughput to 3 decimal places', () => {
    const { throughputPerMin } = computeConnectionMetrics({
      latencyUs: 1000,
      throughputPerMin: 33.33333333,
      errorRate: 0,
    });

    expect(throughputPerMin).toBe(33.333);
  });

  it('converts null values to undefined', () => {
    expect(
      computeConnectionMetrics({ latencyUs: null, throughputPerMin: null, errorRate: null })
    ).toEqual({
      latencyMs: undefined,
      throughputPerMin: undefined,
      errorRate: undefined,
    });
  });
});

describe('finalizeConnections', () => {
  const makeConnection = (source: string, target: string): ConnectionWithKey => ({
    source: { 'service.name': source },
    target: { 'service.name': target },
    metrics: undefined,
    _key: `${source}::${target}`,
    _sourceName: source,
    _dependencyName: target,
  });

  it('strips internal fields and attaches metrics from metricsMap', () => {
    const connections = [makeConnection('A', 'B')];
    const metricsMap = {
      'A::B': { latencyMs: 5, throughputPerMin: 100, errorRate: 0.01 },
    };

    const [result] = finalizeConnections(connections, metricsMap);

    expect(result).toEqual({
      source: { 'service.name': 'A' },
      target: { 'service.name': 'B' },
      metrics: { latencyMs: 5, throughputPerMin: 100, errorRate: 0.01 },
    });
    expect(result).not.toHaveProperty('_key');
    expect(result).not.toHaveProperty('_sourceName');
    expect(result).not.toHaveProperty('_dependencyName');
  });

  it('leaves metrics undefined when connection key is missing from metricsMap', () => {
    const connections = [makeConnection('A', 'B')];
    const metricsMap = { 'X::Y': { latencyMs: 10, throughputPerMin: 50, errorRate: 0 } };

    const [result] = finalizeConnections(connections, metricsMap);
    expect(result.metrics).toBeUndefined();
  });

  it('leaves metrics undefined when no metricsMap is provided', () => {
    const [result] = finalizeConnections([makeConnection('A', 'B')]);
    expect(result.metrics).toBeUndefined();
  });
});
