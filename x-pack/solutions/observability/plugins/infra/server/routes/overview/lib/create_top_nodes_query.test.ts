/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TopNodesRequest } from '../../../../common/http_api/overview_api';
import type { MetricsSourceConfiguration } from '../../../../common/metrics_sources';
import { createTopNodesQuery } from './create_top_nodes_query';

const baseOptions: TopNodesRequest = {
  sourceId: 'default',
  size: 5,
  bucketSize: '1m',
  timerange: { from: 1000, to: 2000 },
};

const source = {
  configuration: { metricAlias: 'metrics-*' },
} as MetricsSourceConfiguration;

describe('createTopNodesQuery', () => {
  describe('ECS schema', () => {
    it('uses the inventory model node filter for ECS', () => {
      const query = createTopNodesQuery(baseOptions, source, 'ecs');
      const filters = query.query.bool.filter;
      const systemFilter = filters.find(
        (f: Record<string, unknown>) =>
          'bool' in f &&
          (f as { bool: { should: Array<{ term: Record<string, string> }> } }).bool.should?.some(
            (clause) => clause.term?.['event.module'] === 'system'
          )
      );
      expect(systemFilter).toBeDefined();
    });

    it('includes runtime_mappings for rx/tx', () => {
      const query = createTopNodesQuery(baseOptions, source, 'ecs');
      expect(query.runtime_mappings).toBeDefined();
      expect(query.runtime_mappings).toHaveProperty('rx_bytes_per_period');
      expect(query.runtime_mappings).toHaveProperty('tx_bytes_per_period');
    });

    it('includes ECS-specific aggregations', () => {
      const query = createTopNodesQuery(baseOptions, source, 'ecs');
      const nodeAggs = query.aggs.nodes.aggs;
      expect(nodeAggs).toHaveProperty('uptime');
      expect(nodeAggs).toHaveProperty('cpu');
      expect(nodeAggs).toHaveProperty('iowait');
      expect(nodeAggs).toHaveProperty('load');
      expect(nodeAggs).toHaveProperty('rx');
      expect(nodeAggs).toHaveProperty('tx');
    });

    it('defaults sort to uptime for ECS', () => {
      const query = createTopNodesQuery(baseOptions, source, 'ecs');
      expect(query.aggs.nodes.terms.order).toEqual({ uptime: 'asc' });
    });

    it('defaults to ECS when no schema is provided', () => {
      const query = createTopNodesQuery(baseOptions, source);
      const filters = query.query.bool.filter;
      const systemFilter = filters.find(
        (f: Record<string, unknown>) =>
          'bool' in f &&
          (f as { bool: { should: Array<{ term: Record<string, string> }> } }).bool.should?.some(
            (clause) => clause.term?.['event.module'] === 'system'
          )
      );
      expect(systemFilter).toBeDefined();
    });
  });

  describe('semconv schema', () => {
    it('uses data_stream.dataset filter', () => {
      const query = createTopNodesQuery(baseOptions, source, 'semconv');
      const filters = query.query.bool.filter;
      const datasetFilter = filters.find(
        (f: Record<string, unknown>) =>
          'bool' in f &&
          (f as { bool: { filter: Array<{ term: Record<string, string> }> } }).bool.filter.some(
            (ff) => ff.term?.['data_stream.dataset'] === 'hostmetricsreceiver.otel'
          )
      );
      expect(datasetFilter).toBeDefined();
    });

    it('does not include runtime_mappings', () => {
      const query = createTopNodesQuery(baseOptions, source, 'semconv');
      expect(query.runtime_mappings).toBeUndefined();
    });

    it('includes semconv CPU aggregations with bucket_script', () => {
      const query = createTopNodesQuery(baseOptions, source, 'semconv');
      const nodeAggs = query.aggs.nodes.aggs;
      expect(nodeAggs).toHaveProperty('cpu_idle');
      expect(nodeAggs).toHaveProperty('cpu_idle_total');
      expect(nodeAggs).toHaveProperty('cpu');
      expect((nodeAggs as Record<string, any>).cpu).toHaveProperty('bucket_script');
    });

    it('uses semconv load field', () => {
      const query = createTopNodesQuery(baseOptions, source, 'semconv');
      const nodeAggs = query.aggs.nodes.aggs as Record<string, any>;
      expect(nodeAggs.load.avg.field).toBe('system.cpu.load_average.15m');
    });

    it('does not include uptime, iowait, rx, or tx aggregations', () => {
      const query = createTopNodesQuery(baseOptions, source, 'semconv');
      const nodeAggs = query.aggs.nodes.aggs;
      expect(nodeAggs).not.toHaveProperty('uptime');
      expect(nodeAggs).not.toHaveProperty('iowait');
      expect(nodeAggs).not.toHaveProperty('rx');
      expect(nodeAggs).not.toHaveProperty('tx');
    });

    it('defaults sort to load for semconv', () => {
      const query = createTopNodesQuery(baseOptions, source, 'semconv');
      expect(query.aggs.nodes.terms.order).toEqual({ load: 'asc' });
    });

    it('includes semconv timeseries sub-aggregations', () => {
      const query = createTopNodesQuery(baseOptions, source, 'semconv');
      const timeseriesAggs = (query.aggs.nodes.aggs as Record<string, any>).timeseries.aggs;
      expect(timeseriesAggs).toHaveProperty('cpu');
      expect(timeseriesAggs).toHaveProperty('load');
      expect(timeseriesAggs.cpu).toHaveProperty('bucket_script');
      expect(timeseriesAggs).not.toHaveProperty('rx');
      expect(timeseriesAggs).not.toHaveProperty('tx');
      expect(timeseriesAggs).not.toHaveProperty('iowait');
    });
  });

  describe('sort overrides', () => {
    it('sorts by _key when sort is name', () => {
      const opts = { ...baseOptions, sort: 'name' };
      const query = createTopNodesQuery(opts, source, 'ecs');
      expect(query.aggs.nodes.terms.order).toEqual({ _key: 'asc' });
    });

    it('uses custom sort field', () => {
      const opts = { ...baseOptions, sort: 'cpu', sortDirection: 'desc' };
      const query = createTopNodesQuery(opts, source, 'ecs');
      expect(query.aggs.nodes.terms.order).toEqual({ cpu: 'desc' });
    });

    it.each(['uptime', 'iowait', 'rx', 'tx'])(
      'falls back to load for semconv when sort is %s',
      (sort) => {
        const opts = { ...baseOptions, sort };
        const query = createTopNodesQuery(opts, source, 'semconv');
        expect(query.aggs.nodes.terms.order).toEqual({ load: 'asc' });
      }
    );

    it('allows cpu sort for semconv', () => {
      const opts = { ...baseOptions, sort: 'cpu', sortDirection: 'desc' };
      const query = createTopNodesQuery(opts, source, 'semconv');
      expect(query.aggs.nodes.terms.order).toEqual({ cpu: 'desc' });
    });
  });
});
