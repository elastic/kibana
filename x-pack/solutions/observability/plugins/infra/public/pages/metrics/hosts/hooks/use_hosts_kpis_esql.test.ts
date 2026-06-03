/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { buildSemconvQuery, buildEcsQuery, parseKpiRow } from './use_hosts_kpis_esql';

const SEMCONV_FIELDS = new Set([
  'state',
  'metrics.system.cpu.utilization',
  'metrics.system.cpu.load_average.1m',
  'metrics.system.cpu.logical.count',
  'system.memory.utilization',
  'metrics.system.filesystem.usage',
]);

const ECS_FIELDS = new Set([
  'system.cpu.total.norm.pct',
  'system.load.1',
  'system.load.cores',
  'system.memory.actual.used.pct',
  'system.filesystem.used.pct',
]);

describe('use_hosts_kpis_esql query builders', () => {
  it('aggregates per host then averages across the first `limit` hosts (semconv)', () => {
    const query = buildSemconvQuery('metrics-*,metricbeat-*', 100, SEMCONV_FIELDS);

    expect(query).toContain('FROM metrics-*,metricbeat-*');
    expect(query).toContain('BY host.name');
    expect(query).toContain('SORT host.name ASC');
    expect(query).toContain('LIMIT 100');
    expect(query).toContain('cpuUsage = AVG(host_cpuUsage)');
    expect(query).toContain('normalizedLoad1m = AVG(host_normalizedLoad1m)');
    expect(query).toContain('memoryUsage = AVG(host_memoryUsage)');
    expect(query).toContain('diskUsage = AVG(host_diskUsage)');
    expect(query).not.toContain('host_count');
  });

  it('threads the limit through the ECS variant', () => {
    expect(buildEcsQuery('metrics-*,metricbeat-*', 500, ECS_FIELDS)).toContain('LIMIT 500');
    expect(buildEcsQuery('metrics-*,metricbeat-*', 50, ECS_FIELDS)).toContain(
      'FROM metrics-*,metricbeat-*'
    );
  });

  it('reduces ECS disk usage with a cross-host MAX (mirrors the `max(...)` formula)', () => {
    const query = buildEcsQuery('metrics-*,metricbeat-*', 100, ECS_FIELDS);
    expect(query).toContain('diskUsage = MAX(host_diskUsage)');
    expect(query).toContain('cpuUsage = AVG(host_cpuUsage)');
    expect(query).toContain('memoryUsage = AVG(host_memoryUsage)');
  });

  it('drops only the metrics whose fields are absent (avoids unknown-column failure)', () => {
    // No filesystem field: disk is dropped, the rest stay.
    const noDisk = new Set(SEMCONV_FIELDS);
    noDisk.delete('metrics.system.filesystem.usage');
    const semconvNoDisk = buildSemconvQuery('metrics-*', 100, noDisk)!;
    expect(semconvNoDisk).not.toContain('metrics.system.filesystem.usage');
    expect(semconvNoDisk).not.toContain('diskUsage');
    expect(semconvNoDisk).toContain('cpuUsage = AVG(host_cpuUsage)');
    expect(semconvNoDisk).toContain('memoryUsage = AVG(host_memoryUsage)');

    // No cpu utilization (e.g. warm-up): cpu is dropped but load/memory survive.
    const noCpu = new Set(SEMCONV_FIELDS);
    noCpu.delete('metrics.system.cpu.utilization');
    const semconvNoCpu = buildSemconvQuery('metrics-*', 100, noCpu)!;
    expect(semconvNoCpu).not.toContain('metrics.system.cpu.utilization');
    expect(semconvNoCpu).not.toContain('cpuUsage');
    expect(semconvNoCpu).toContain('normalizedLoad1m = AVG(host_normalizedLoad1m)');
    expect(semconvNoCpu).toContain('memoryUsage = AVG(host_memoryUsage)');
  });

  it('drops only the metrics whose fields are absent (ECS)', () => {
    // No filesystem field: disk is dropped, the rest stay.
    const noDisk = new Set(ECS_FIELDS);
    noDisk.delete('system.filesystem.used.pct');
    const ecsNoDisk = buildEcsQuery('metrics-*', 100, noDisk)!;
    expect(ecsNoDisk).not.toContain('system.filesystem.used.pct');
    expect(ecsNoDisk).not.toContain('diskUsage');
    expect(ecsNoDisk).toContain('cpuUsage = AVG(host_cpuUsage)');
    expect(ecsNoDisk).toContain('memoryUsage = AVG(host_memoryUsage)');

    // No cpu field: cpu is dropped but load/memory/disk survive.
    const noCpu = new Set(ECS_FIELDS);
    noCpu.delete('system.cpu.total.norm.pct');
    const ecsNoCpu = buildEcsQuery('metrics-*', 100, noCpu)!;
    expect(ecsNoCpu).not.toContain('system.cpu.total.norm.pct');
    expect(ecsNoCpu).not.toContain('cpuUsage');
    expect(ecsNoCpu).toContain('normalizedLoad1m = AVG(host_normalizedLoad1m)');
    expect(ecsNoCpu).toContain('diskUsage = MAX(host_diskUsage)');
  });

  it('drops the state pre-filter when only normalized load remains', () => {
    const query = buildSemconvQuery(
      'metrics-*',
      100,
      new Set(['metrics.system.cpu.load_average.1m', 'metrics.system.cpu.logical.count'])
    )!;
    expect(query).toContain('normalizedLoad1m = AVG(host_normalizedLoad1m)');
    expect(query).not.toContain('WHERE state');
  });

  it('returns undefined when no KPI field is mapped', () => {
    expect(buildSemconvQuery('metrics-*', 100, new Set())).toBeUndefined();
    expect(buildEcsQuery('metrics-*', 100, new Set())).toBeUndefined();
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
