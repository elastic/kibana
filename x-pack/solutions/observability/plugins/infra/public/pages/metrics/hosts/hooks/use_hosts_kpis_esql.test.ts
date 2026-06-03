/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { buildSemconvQuery, buildEcsQuery, parseKpiRow } from './use_hosts_kpis_esql';

describe('use_hosts_kpis_esql query builders', () => {
  it('aggregates per host then averages across the first `limit` hosts (semconv)', () => {
    const query = buildSemconvQuery(100);

    // Per-host first stage, then cap to the limit using the same lexical
    // host-name ordering the table uses, then average across those hosts.
    expect(query).toContain('BY host.name');
    expect(query).toContain('SORT host.name ASC');
    expect(query).toContain('LIMIT 100');
    expect(query).toContain('cpuUsage = AVG(host_cpuUsage)');
    expect(query).toContain('normalizedLoad1m = AVG(host_normalizedLoad1m)');
    expect(query).toContain('memoryUsage = AVG(host_memoryUsage)');
    expect(query).toContain('diskUsage = AVG(host_diskUsage)');
    // No fleet-wide host count leaks into the result columns.
    expect(query).not.toContain('host_count');
  });

  it('threads the limit through the ECS variant', () => {
    expect(buildEcsQuery('metrics-*,metricbeat-*', 500)).toContain('LIMIT 500');
    expect(buildEcsQuery('metrics-*,metricbeat-*', 50)).toContain('FROM metrics-*,metricbeat-*');
  });
});

describe('parseKpiRow', () => {
  const response = (
    columns: Array<{ name: string }>,
    values: Array<Array<number | null>>
  ): estypes.EsqlAsyncQueryResponse =>
    ({ columns, values } as unknown as estypes.EsqlAsyncQueryResponse);

  it('maps columns to KPIs by name regardless of column order', () => {
    expect(
      parseKpiRow(
        response(
          [
            { name: 'diskUsage' },
            { name: 'cpuUsage' },
            { name: 'memoryUsage' },
            { name: 'normalizedLoad1m' },
          ],
          [[0.1, 0.9, 0.5, 1.2]]
        )
      )
    ).toEqual({ cpuUsage: 0.9, normalizedLoad1m: 1.2, memoryUsage: 0.5, diskUsage: 0.1 });
  });

  it('returns null for missing columns and non-finite values', () => {
    expect(parseKpiRow(response([{ name: 'cpuUsage' }], [[Infinity]]))).toEqual({
      cpuUsage: null,
      normalizedLoad1m: null,
      memoryUsage: null,
      diskUsage: null,
    });
  });

  it('returns all-nulls for an empty/absent response', () => {
    const empty = { cpuUsage: null, normalizedLoad1m: null, memoryUsage: null, diskUsage: null };
    expect(parseKpiRow(response([{ name: 'cpuUsage' }], []))).toEqual(empty);
    expect(parseKpiRow({} as estypes.EsqlAsyncQueryResponse)).toEqual(empty);
  });
});
