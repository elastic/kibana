/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildChartQuery,
  addSortToQuery,
  addGroupByToQuery,
  addFilterToQuery,
} from './esql_query_builder';

describe('esql_query_builder', () => {
  describe('buildChartQuery', () => {
    it('builds gauge metric query with AVG', () => {
      const result = buildChartQuery(
        'host.name',
        { name: 'system.cpu.total', type: 'double' },
        'metrics-*'
      );

      expect(result).toContain('TS');
      expect(result).toContain('metrics-*');
      expect(result).toContain('STATS AVG(`system.cpu.total`)');
      expect(result).toContain('BY `host.name`');
    });

    it('builds counter metric query with RATE', () => {
      const result = buildChartQuery(
        'host.name',
        { name: 'network.bytes', type: 'long', instrument: 'counter' },
        'metrics-*'
      );

      expect(result).toContain('RATE');
      expect(result).toContain('BY `host.name`');
    });

    it('includes groupByFields in BY clause', () => {
      const result = buildChartQuery(
        'host.name',
        { name: 'system.cpu.total', type: 'double' },
        'metrics-*',
        undefined,
        ['container.id', 'service.name']
      );

      expect(result).toContain('BY `host.name`, `container.id`, `service.name`');
    });

    it('applies sort configuration', () => {
      const result = buildChartQuery(
        'host.name',
        { name: 'system.cpu.total', type: 'double' },
        'metrics-*',
        { field: 'metric', direction: 'desc' }
      );

      expect(result).toContain('SORT');
      expect(result).toContain('DESC');
    });
  });

  describe('addSortToQuery', () => {
    it('adds SORT clause to query', () => {
      const query = `TS metrics-*
| STATS avg_cpu = AVG(system.cpu.total) BY host.name`;

      const result = addSortToQuery(query, { field: 'metric', direction: 'desc' });

      expect(result).toContain('SORT');
      expect(result).toContain('DESC');
    });

    it('replaces existing SORT clause', () => {
      const query = `TS metrics-*
| STATS avg_cpu = AVG(system.cpu.total) BY host.name
| SORT host.name ASC`;

      const result = addSortToQuery(query, { field: 'metric', direction: 'desc' });

      expect(result).toContain('DESC');
      expect(result).not.toContain('ASC');
    });

    it('sorts by entity field when specified', () => {
      const query = `TS metrics-*
| STATS avg_cpu = AVG(system.cpu.total) BY host.name`;

      const result = addSortToQuery(query, { field: 'entity', direction: 'asc' });

      expect(result).toContain('host.name');
      expect(result).toContain('ASC');
    });

    it('returns original query when no STATS exists', () => {
      const query = `TS metrics-*
| LIMIT 100`;

      expect(addSortToQuery(query, { field: 'metric', direction: 'desc' })).toBe(query);
    });
  });

  describe('addGroupByToQuery', () => {
    it('adds group by fields to STATS query', () => {
      const query = `TS metrics-*
| STATS avg_cpu = AVG(system.cpu.total) BY host.name`;

      const result = addGroupByToQuery(query, ['container.id', 'service.name']);

      expect(result).toContain('host.name');
      expect(result).toContain('container.id');
      expect(result).toContain('service.name');
    });

    it('adds group by field to multiple STATS commands', () => {
      const query = `TS metrics-*
| STATS metric_rate = SUM(RATE(some.field)) BY host.name, bucket = BUCKET(@timestamp, 100, ?_tstart, ?_tend)
| STATS avg_rate = AVG(metric_rate) BY host.name`;

      const result = addGroupByToQuery(query, ['service.name']);

      const serviceNameMatches = result.match(/service\.name/g);
      expect(serviceNameMatches?.length).toBe(2);
    });

    it('does not duplicate existing group by field', () => {
      const query = `TS metrics-*
| STATS avg_cpu = AVG(system.cpu.total) BY host.name, container.id`;

      const result = addGroupByToQuery(query, ['container.id']);

      const matches = result.match(/container\.id/g);
      expect(matches?.length).toBe(1);
    });

    it('returns original query when no STATS exists', () => {
      const query = `TS metrics-*
| LIMIT 100`;

      expect(addGroupByToQuery(query, ['container.id'])).toBe(query);
    });

    it('returns original for empty query or empty fields', () => {
      expect(addGroupByToQuery('', ['field'])).toBe('');
      expect(addGroupByToQuery('TS x | STATS a BY b', [])).toBe('TS x | STATS a BY b');
    });
  });

  describe('addFilterToQuery', () => {
    it('adds WHERE clause with correct operator', () => {
      const query = `TS metrics-*
| STATS avg_cpu = AVG(system.cpu.total) BY host.name`;

      const includeResult = addFilterToQuery(query, 'host.name', 'server1', '==');
      expect(includeResult).toContain('WHERE');
      expect(includeResult).toContain('==');
      expect(includeResult).toContain('"server1"');

      const excludeResult = addFilterToQuery(query, 'host.name', 'server1', '!=');
      expect(excludeResult).toContain('!=');
    });

    it('inserts WHERE before STATS', () => {
      const query = `TS metrics-*
| STATS avg_cpu = AVG(system.cpu.total) BY host.name`;

      const result = addFilterToQuery(query, 'host.name', 'server1', '==');

      expect(result.indexOf('WHERE')).toBeLessThan(result.indexOf('STATS'));
    });

    it('inserts WHERE after existing WHERE clause', () => {
      const query = `TS metrics-*
| WHERE status == "active"
| STATS avg_cpu = AVG(system.cpu.total) BY host.name`;

      const result = addFilterToQuery(query, 'host.name', 'server1', '==');

      expect(result.match(/WHERE/g)?.length).toBe(2);
      expect(result.lastIndexOf('WHERE')).toBeLessThan(result.indexOf('STATS'));
    });

    it('handles empty query gracefully', () => {
      expect(addFilterToQuery('', 'field', 'value', '==')).toBe('');
    });

    it('updates existing filter when toggling operator for same field/value', () => {
      let query = `TS metrics-*
| STATS avg_cpu = AVG(system.cpu.total) BY host.name`;

      query = addFilterToQuery(query, 'state', 'buffered', '==');
      query = addFilterToQuery(query, 'state', 'buffered', '!=');

      expect(query.match(/WHERE/g)?.length).toBe(1);
      expect(query).toContain('!=');
      expect(query).not.toMatch(/==.*buffered/);
    });

    it('preserves complex WHERE conditions and adds new filter separately', () => {
      const query = `TS metrics-*
| WHERE status == "active" AND count > 100
| STATS avg_cpu = AVG(system.cpu.total) BY host.name`;

      const result = addFilterToQuery(query, 'host.name', 'server1', '==');

      expect(result).toContain('"active"');
      expect(result).toContain('"server1"');
      expect(result.match(/WHERE/g)?.length).toBe(2);
    });

    it('adds new filter when same field but different value', () => {
      let query = `TS metrics-*
| WHERE state == "buffered"
| STATS avg_cpu = AVG(system.cpu.total) BY host.name`;

      query = addFilterToQuery(query, 'state', 'idle', '==');

      expect(query.match(/WHERE/g)?.length).toBe(2);
      expect(query).toContain('"buffered"');
      expect(query).toContain('"idle"');
    });
  });
});
