/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useEsqlQueryInfo, parseEsqlQuery } from './use_esql_query_info';

describe('parseEsqlQuery', () => {
  it('parses simple STATS query with alias', () => {
    const query = `TS metrics-*
| STATS avg_cpu = AVG(system.cpu.total) BY host.name`;

    const result = parseEsqlQuery(query);

    expect(result.metricField).toBe('avg_cpu');
    expect(result.dimensions).toContain('host.name');
  });

  it('parses STATS query without alias', () => {
    const query = `TS metrics-*
| STATS AVG(system.cpu.total) BY host.name`;

    const result = parseEsqlQuery(query);

    expect(result.metricField).toBe('AVG(system.cpu.total)');
    expect(result.dimensions).toContain('host.name');
  });

  it('extracts from last STATS command in two-stage aggregation', () => {
    const query = `TS metrics-*
| STATS metric_rate = SUM(RATE(some.field)) BY host.name, bucket = BUCKET(@timestamp, 100, ?_tstart, ?_tend)
| STATS avg_rate = AVG(metric_rate) BY host.name`;

    const result = parseEsqlQuery(query);

    expect(result.metricField).toBe('avg_rate');
    expect(result.dimensions).toContain('host.name');
  });
});

describe('useEsqlQueryInfo', () => {
  describe('basic STATS queries', () => {
    it('extracts metric field with alias from simple STATS', () => {
      const query = `TS metrics-*
| STATS avg_cpu = AVG(system.cpu.total) BY host.name`;

      const { result } = renderHook(() => useEsqlQueryInfo({ query }));

      expect(result.current.metricField).toBe('avg_cpu');
      expect(result.current.dimensions).toContain('host.name');
    });

    it('extracts metric field without alias (uses aggregation text)', () => {
      const query = `TS metrics-*
| STATS AVG(system.cpu.total) BY host.name`;

      const { result } = renderHook(() => useEsqlQueryInfo({ query }));

      expect(result.current.metricField).toBe('AVG(system.cpu.total)');
      expect(result.current.dimensions).toContain('host.name');
    });
  });

  describe('two-stage STATS queries', () => {
    it('extracts from last STATS command with simple aggregation', () => {
      const query = `TS metrics-*
| STATS metric_rate = SUM(RATE(some.field)) BY host.name, bucket = BUCKET(@timestamp, 100, ?_tstart, ?_tend)
| STATS avg_rate = AVG(metric_rate) BY host.name`;

      const { result } = renderHook(() => useEsqlQueryInfo({ query }));

      expect(result.current.metricField).toBe('avg_rate');
      expect(result.current.dimensions).toContain('host.name');
    });
  });

  describe('STATS with WHERE filtered aggregations', () => {
    // Note: STATS ... WHERE syntax is not yet supported by the @kbn/esql-language parser.
    // When the parser is updated, these tests should pass.
    // For now, we skip these tests and document the limitation.
    it('extracts metric field from STATS with WHERE but no BY clause', () => {
      const query = `TS metrics-*
| STATS cpu_util_per_state = AVG(metrics.system.cpu.utilization) BY attributes.state
| STATS cpu = 1 - SUM(cpu_util_per_state) WHERE attributes.state IN ("idle", "wait")`;

      const { result } = renderHook(() => useEsqlQueryInfo({ query }));

      expect(result.current.metricField).toBe('cpu');
      expect(result.current.dimensions).toEqual([]);
    });

    it('extracts from STATS with complex WHERE condition', () => {
      const query = `TS metrics-*
| STATS total = SUM(value) WHERE status == "active" AND category IN ("a", "b") BY region`;

      const { result } = renderHook(() => useEsqlQueryInfo({ query }));

      expect(result.current.metricField).toBe('total');
      expect(result.current.dimensions).toContain('region');
    });

    it('extracts metric field from STATS with WHERE clause', () => {
      const query = `TS remote_cluster:metrics-*,metrics-*
| STATS cpu_util_per_state = AVG(metrics.system.cpu.utilization) BY attributes.state, host.name
| STATS cpu = 1 - SUM(cpu_util_per_state) WHERE attributes.state IN ("idle", "wait") BY host.name`;

      const { result } = renderHook(() => useEsqlQueryInfo({ query }));

      expect(result.current.metricField).toBe('cpu');
      expect(result.current.dimensions).toContain('host.name');
    });
  });

  describe('dimension extraction', () => {
    it('extracts multiple dimensions', () => {
      const query = `TS metrics-*
| STATS avg_val = AVG(value) BY host.name, container.id, service.name`;

      const { result } = renderHook(() => useEsqlQueryInfo({ query }));

      expect(result.current.dimensions).toContain('host.name');
      expect(result.current.dimensions).toContain('container.id');
      expect(result.current.dimensions).toContain('service.name');
    });

    it('extracts dimension alias from BUCKET expressions', () => {
      const query = `TS metrics-*
| STATS avg_val = AVG(value) BY host.name, bucket = BUCKET(@timestamp, 100, ?_tstart, ?_tend)`;

      const { result } = renderHook(() => useEsqlQueryInfo({ query }));

      expect(result.current.dimensions).toContain('host.name');
      expect(result.current.dimensions).toContain('bucket');
    });
  });

  describe('index extraction', () => {
    it('extracts index from TS command', () => {
      const query = `TS remote_cluster:metrics-*,metrics-*
| STATS avg = AVG(value) BY host.name`;

      const { result } = renderHook(() => useEsqlQueryInfo({ query }));

      expect(result.current.indices).toContain('remote_cluster:metrics-*,metrics-*');
    });

    it('extracts index from FROM command', () => {
      const query = `FROM logs-*
| STATS count = COUNT(*) BY level`;

      const { result } = renderHook(() => useEsqlQueryInfo({ query }));

      expect(result.current.indices).toContain('logs-*');
    });
  });

  describe('actualMetricField extraction', () => {
    it('extracts actual field from simple STATS with alias', () => {
      const query = `TS metrics-*
| STATS avg_cpu = AVG(system.cpu.total) BY host.name`;

      const { result } = renderHook(() => useEsqlQueryInfo({ query }));

      expect(result.current.actualMetricField).toBe('system.cpu.total');
    });

    it('extracts actual field from STATS without alias', () => {
      const query = `TS metrics-*
| STATS AVG(system.cpu.total) BY host.name`;

      const { result } = renderHook(() => useEsqlQueryInfo({ query }));

      expect(result.current.actualMetricField).toBe('system.cpu.total');
    });

    it('extracts actual field from nested function (SUM(RATE(...)))', () => {
      const query = `TS metrics-*
| STATS metric_rate = SUM(RATE(network.bytes.sent)) BY host.name`;

      const { result } = renderHook(() => useEsqlQueryInfo({ query }));

      expect(result.current.actualMetricField).toBe('network.bytes.sent');
    });

    it('extracts actual field from first STATS in multi-STATS query (not the alias)', () => {
      const query = `TS metrics-*
| STATS metric_rate = SUM(RATE(some.field)) BY host.name, bucket = BUCKET(@timestamp, 100, ?_tstart, ?_tend)
| STATS avg_rate = AVG(metric_rate) BY host.name`;

      const { result } = renderHook(() => useEsqlQueryInfo({ query }));

      // Should return the actual field from first STATS, not 'metric_rate' which is an alias
      expect(result.current.actualMetricField).toBe('some.field');
    });

    it('extracts actual field from complex multi-STATS CPU utilization query', () => {
      const query = `TS remote_cluster:metrics-*, metrics-*
| STATS cpu_util_per_state = AVG(metrics.system.cpu.utilization)
      BY attributes.state, host.name
| STATS cpu = 1 - SUM(cpu_util_per_state) WHERE (attributes.state IN ("idle", "wait"))
      BY host.name
| SORT \`host.name\` DESC`;

      const { result } = renderHook(() => useEsqlQueryInfo({ query }));

      // Should return 'metrics.system.cpu.utilization' from first STATS
      // Not 'cpu_util_per_state' which is just an alias
      expect(result.current.actualMetricField).toBe('metrics.system.cpu.utilization');
      // metricField should still be from the last STATS (for display purposes)
      expect(result.current.metricField).toBe('cpu');
    });

    // Note: Single STATS with WHERE has a complex AST structure where the WHERE
    // wraps the entire aggregation. For actual field extraction, we focus on
    // multi-STATS queries (counter metrics) which are the primary use case.
    it('extracts actual field from multi-STATS with WHERE clause', () => {
      const query = `TS metrics-*
| STATS cpu_util = AVG(metrics.cpu.usage) BY host.name
| STATS total = SUM(cpu_util) WHERE cpu_util > 0.5 BY host.name`;

      const { result } = renderHook(() => useEsqlQueryInfo({ query }));

      // Should return the actual field from first STATS
      expect(result.current.actualMetricField).toBe('metrics.cpu.usage');
    });

    it('returns undefined when no STATS command exists', () => {
      const query = `TS metrics-*
| LIMIT 100`;

      const { result } = renderHook(() => useEsqlQueryInfo({ query }));

      expect(result.current.actualMetricField).toBeUndefined();
    });
  });
});
