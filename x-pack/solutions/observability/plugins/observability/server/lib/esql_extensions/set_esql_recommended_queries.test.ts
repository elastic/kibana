/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setEsqlRecommendedQueries } from './set_esql_recommended_queries';
import type { PluginSetup as ESQLSetup } from '@kbn/esql/server';

describe('setEsqlRecommendedQueries', () => {
  let mockEsqlPlugin: jest.Mocked<ESQLSetup>;
  let mockRegistry: {
    setRecommendedQueries: jest.Mock;
    setRecommendedFields: jest.Mock;
  };

  beforeEach(() => {
    mockRegistry = {
      setRecommendedQueries: jest.fn(),
      setRecommendedFields: jest.fn(),
    };
    mockEsqlPlugin = {
      getExtensionsRegistry: jest.fn().mockReturnValue(mockRegistry),
    } as unknown as jest.Mocked<ESQLSetup>;
  });

  it('registers observability recommended queries with the oblt scope', () => {
    setEsqlRecommendedQueries(mockEsqlPlugin);

    const obltCall = mockRegistry.setRecommendedQueries.mock.calls.find(
      ([, scope]) => scope === 'oblt'
    );
    expect(obltCall).toBeDefined();
  });

  it('includes 4 new metric queries plus 2 K8s queries in the metrics section (12 total observability queries)', () => {
    setEsqlRecommendedQueries(mockEsqlPlugin);

    const obltCall = mockRegistry.setRecommendedQueries.mock.calls.find(
      ([, scope]) => scope === 'oblt'
    );
    const queries = obltCall![0];

    // 4 traces + 6 metrics (4 new + 2 K8s) + 2 logs = 12 total
    expect(queries).toHaveLength(12);
  });

  it('places the 4 new metric queries before the K8s queries', () => {
    setEsqlRecommendedQueries(mockEsqlPlugin);

    const obltCall = mockRegistry.setRecommendedQueries.mock.calls.find(
      ([, scope]) => scope === 'oblt'
    );
    const queries = obltCall![0];

    // Traces are first 4, then metrics start at index 4
    const metricQueries = queries.slice(4, 10);

    expect(metricQueries[0].name).toBe('Metric counter rate over time');
    expect(metricQueries[1].name).toBe('Metric counter rate breakdown by dimension over time');
    expect(metricQueries[2].name).toBe('Metric over time');
    expect(metricQueries[3].name).toBe('Metric breakdown by dimension over time');
    expect(metricQueries[4].name).toBe('Kubernetes pods sorted by memory usage');
    expect(metricQueries[5].name).toBe('Kubernetes pods sorted by CPU usage');
  });

  it('uses TS command with metrics-* pattern for the new metric queries', () => {
    setEsqlRecommendedQueries(mockEsqlPlugin);

    const obltCall = mockRegistry.setRecommendedQueries.mock.calls.find(
      ([, scope]) => scope === 'oblt'
    );
    const queries = obltCall![0];
    const newMetricQueries = queries.slice(4, 8);

    for (const q of newMetricQueries) {
      expect(q.query).toMatch(/^TS metrics-\*/);
    }
  });

  it('uses correct aggregation functions in the new metric queries', () => {
    setEsqlRecommendedQueries(mockEsqlPlugin);

    const obltCall = mockRegistry.setRecommendedQueries.mock.calls.find(
      ([, scope]) => scope === 'oblt'
    );
    const queries = obltCall![0];
    const newMetricQueries = queries.slice(4, 8);

    // First two use SUM(RATE(...))
    expect(newMetricQueries[0].query).toContain('SUM(RATE(system.network.out.bytes))');
    expect(newMetricQueries[1].query).toContain('SUM(RATE(system.network.out.bytes))');

    // Last two use AVG(...)
    expect(newMetricQueries[2].query).toContain('AVG(system.cpu.total.norm.pct)');
    expect(newMetricQueries[3].query).toContain('AVG(system.cpu.total.norm.pct)');
  });

  it('includes host.name breakdown in the dimension queries', () => {
    setEsqlRecommendedQueries(mockEsqlPlugin);

    const obltCall = mockRegistry.setRecommendedQueries.mock.calls.find(
      ([, scope]) => scope === 'oblt'
    );
    const queries = obltCall![0];
    const newMetricQueries = queries.slice(4, 8);

    // Queries at index 1 and 3 are the "breakdown by dimension" variants
    expect(newMetricQueries[1].query).toContain('host.name');
    expect(newMetricQueries[3].query).toContain('host.name');

    // Queries at index 0 and 2 should NOT have host.name
    expect(newMetricQueries[0].query).not.toContain('host.name');
    expect(newMetricQueries[2].query).not.toContain('host.name');
  });

  it('provides descriptions for all new metric queries', () => {
    setEsqlRecommendedQueries(mockEsqlPlugin);

    const obltCall = mockRegistry.setRecommendedQueries.mock.calls.find(
      ([, scope]) => scope === 'oblt'
    );
    const queries = obltCall![0];
    const newMetricQueries = queries.slice(4, 8);

    for (const q of newMetricQueries) {
      expect(q.description).toBeDefined();
      expect(typeof q.description).toBe('string');
      expect(q.description.length).toBeGreaterThan(0);
    }
  });
});
