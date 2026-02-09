/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql } from '@kbn/esql-language';

/**
 * Time range WHERE clause using named parameters
 */
const TIME_RANGE_WHERE = 'WHERE @timestamp >= ?_tstart AND @timestamp <= ?_tend';

/**
 * Append time range filter to ES|QL query using the ES|QL Composer.
 * Inserts a WHERE clause right after the source command (FROM/TS).
 * Uses named parameters ?_tstart and ?_tend.
 */
const appendTimeRangeFilter = (query: string): string => {
  // Check if the query already has the time range parameters
  if (query.includes('?_tstart') || query.includes('?_tend')) {
    return query;
  }

  try {
    // Parse the query with composer to get normalized output
    const composedQuery = esql(query);
    const ast = composedQuery.ast;

    // Check if there's only a source command (no other commands)
    if (ast.commands.length === 1) {
      // Just pipe WHERE at the end
      return composedQuery.pipe`WHERE @timestamp >= ?_tstart AND @timestamp <= ?_tend`.print(
        'basic'
      );
    }

    // Multiple commands - need to insert WHERE after source
    // Get the normalized query string
    const normalizedQuery = composedQuery.print('basic');

    // Find the first pipe after the source command
    const firstPipeIndex = normalizedQuery.indexOf(' | ');
    if (firstPipeIndex === -1) {
      // No pipe found, just append
      return `${normalizedQuery} | ${TIME_RANGE_WHERE}`;
    }

    // Insert WHERE right after the source command
    const sourceCommand = normalizedQuery.substring(0, firstPipeIndex);
    const restOfQuery = normalizedQuery.substring(firstPipeIndex);

    return `${sourceCommand} | ${TIME_RANGE_WHERE}${restOfQuery}`;
  } catch {
    // Composer failed - fall back to simple append
    return `${query} | ${TIME_RANGE_WHERE}`;
  }
};

describe('appendTimeRangeFilter', () => {
  it('should add WHERE to simple FROM query', () => {
    const query = 'FROM metrics-*';
    const result = appendTimeRangeFilter(query);

    expect(result).toBe(`FROM metrics-* | ${TIME_RANGE_WHERE}`);
  });

  it('should add WHERE to TS query', () => {
    const query = 'TS remote_cluster:metrics-*,metrics-*';
    const result = appendTimeRangeFilter(query);

    // Composer normalizes: adds space after comma in index patterns
    expect(result).toContain('TS remote_cluster:metrics-*');
    expect(result).toContain('metrics-*');
    expect(result).toContain(TIME_RANGE_WHERE);
  });

  it('should insert WHERE between source and STATS', () => {
    const query = 'FROM metrics-* | STATS avg_cpu = AVG(cpu) BY host';
    const result = appendTimeRangeFilter(query);

    // WHERE should come AFTER FROM and BEFORE STATS
    expect(result).toBe(`FROM metrics-* | ${TIME_RANGE_WHERE} | STATS avg_cpu = AVG(cpu) BY host`);
  });

  it('should insert WHERE between source and first STATS in complex query', () => {
    const query = `TS remote_cluster:metrics-*,metrics-*
| STATS cpu_util_per_state = AVG(metrics.system.cpu.utilization) BY attributes.state, host.name
| STATS cpu = 1 - SUM(cpu_util_per_state) WHERE attributes.state IN ("idle", "wait") BY host.name`;
    const result = appendTimeRangeFilter(query);

    // WHERE should come right after TS, before the first STATS
    // Composer normalizes: adds space after comma in index patterns
    const whereIndex = result.indexOf(TIME_RANGE_WHERE);
    const firstStatsIndex = result.indexOf('STATS cpu_util_per_state');

    expect(whereIndex).toBeGreaterThan(0);
    expect(whereIndex).toBeLessThan(firstStatsIndex);
  });

  it('should preserve index patterns with wildcards', () => {
    const query = 'FROM metrics-* | LIMIT 100';
    const result = appendTimeRangeFilter(query);

    expect(result).toContain('metrics-*');
    expect(result).toContain('LIMIT 100');
    expect(result).toContain(TIME_RANGE_WHERE);
  });

  it('should preserve multiple index patterns', () => {
    const query = 'TS remote_cluster:metrics-*,metrics-*';
    const result = appendTimeRangeFilter(query);

    // Verify both wildcards are preserved (composer adds space after comma)
    expect(result).toMatch(/remote_cluster:metrics-\*,\s*metrics-\*/);
  });

  it('should not add time filter if already present', () => {
    const query = 'FROM metrics-* | WHERE @timestamp >= ?_tstart AND @timestamp <= ?_tend';
    const result = appendTimeRangeFilter(query);

    expect(result).toBe(query);
  });

  it('should not add time filter if _tstart is present', () => {
    const query = 'FROM metrics-* | WHERE @timestamp >= ?_tstart';
    const result = appendTimeRangeFilter(query);

    expect(result).toBe(query);
  });

  it('should not add time filter if _tend is present', () => {
    const query = 'FROM metrics-* | WHERE @timestamp <= ?_tend';
    const result = appendTimeRangeFilter(query);

    expect(result).toBe(query);
  });
});
