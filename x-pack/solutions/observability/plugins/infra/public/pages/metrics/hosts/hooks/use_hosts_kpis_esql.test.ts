/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { FieldSpec } from '@kbn/data-views-plugin/common';
import type { FieldTypeIndex } from './use_hosts_kpis_esql';
import { buildHostsKpisQuery, indexFieldTypes, parseKpiRow } from './use_hosts_kpis_esql';

const HOST_NAME = 'host.name';
const STATE = 'state';

const SEMCONV_CPU = 'metrics.system.cpu.utilization';
const SEMCONV_LOAD = 'metrics.system.cpu.load_average.1m';
const SEMCONV_CORES = 'metrics.system.cpu.logical.count';
const SEMCONV_MEMORY = 'system.memory.utilization';
const SEMCONV_DISK = 'metrics.system.filesystem.usage';
const SEMCONV_METRICS = [SEMCONV_CPU, SEMCONV_LOAD, SEMCONV_CORES, SEMCONV_MEMORY, SEMCONV_DISK];

const ECS_CPU = 'system.cpu.total.norm.pct';
const ECS_LOAD = 'system.load.1';
const ECS_CORES = 'system.load.cores';
const ECS_MEMORY = 'system.memory.actual.used.pct';
const ECS_DISK = 'system.filesystem.used.pct';
const ECS_METRICS = [ECS_CPU, ECS_LOAD, ECS_CORES, ECS_MEMORY, ECS_DISK];

// Kibana collapses a field's mapping types to a single `type`, so a conflict is
// expressed as several `esTypes` behind that collapsed name. `esTypes` is left
// off entirely for a field with no mapping behind it (a runtime field).
const field = (name: string, type: string, esTypes?: string[]): FieldSpec => ({
  name,
  type,
  ...(esTypes ? { esTypes } : {}),
  aggregatable: true,
  searchable: true,
});

// The field list as the data view reports it: `host.name` and `state` keywords
// plus the listed metric fields as plain doubles. Overrides replace a field
// with the mapping types a test needs; dropping a field is expressed by leaving
// it out of `metricFields`.
const fieldTypes = (metricFields: string[], ...overrides: FieldSpec[]): FieldTypeIndex => {
  const overridden = new Set(overrides.map(({ name }) => name));
  const defaults: FieldSpec[] = [
    field(HOST_NAME, 'string', ['keyword']),
    field(STATE, 'string', ['keyword']),
    ...metricFields.map((name) => field(name, 'number', ['double'])),
  ];
  return indexFieldTypes([...defaults.filter(({ name }) => !overridden.has(name)), ...overrides]);
};

const semconvQuery = (fields: FieldTypeIndex, limit = 100, indexPattern = 'metrics-*') =>
  buildHostsKpisQuery({ schema: 'semconv', indexPattern, limit, fields });

const ecsQuery = (fields: FieldTypeIndex, limit = 100, indexPattern = 'metrics-*') =>
  buildHostsKpisQuery({ schema: 'ecs', indexPattern, limit, fields });

describe('buildHostsKpisQuery', () => {
  it('aggregates per host then averages across the first `limit` hosts (semconv)', () => {
    const query = semconvQuery(fieldTypes(SEMCONV_METRICS), 100, 'metrics-*,metricbeat-*');

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
    const fields = fieldTypes(ECS_METRICS);

    expect(ecsQuery(fields, 500, 'metrics-*,metricbeat-*')).toContain('LIMIT 500');
    expect(ecsQuery(fields, 50, 'metrics-*,metricbeat-*')).toContain('FROM metrics-*,metricbeat-*');
  });

  it('reduces ECS disk usage with a cross-host MAX (mirrors the `max(...)` formula)', () => {
    const query = ecsQuery(fieldTypes(ECS_METRICS));

    expect(query).toContain('diskUsage = MAX(host_diskUsage)');
    expect(query).toContain('cpuUsage = AVG(host_cpuUsage)');
    expect(query).toContain('memoryUsage = AVG(host_memoryUsage)');
  });

  it('casts plain numeric metrics to double so mixed CCS mappings resolve', () => {
    const semconv = semconvQuery(fieldTypes(SEMCONV_METRICS))!;
    expect(semconv).toContain('AVG(`metrics.system.cpu.utilization`::double)');
    expect(semconv).toContain('AVG(`metrics.system.cpu.load_average.1m`::double)');
    expect(semconv).toContain('MAX(`metrics.system.cpu.logical.count`::double)');

    const ecs = ecsQuery(fieldTypes(ECS_METRICS))!;
    expect(ecs).toContain('AVG(`system.cpu.total.norm.pct`::double)');
    expect(ecs).toContain('AVG(`system.load.1`::double)');
    expect(ecs).toContain('MAX(`system.filesystem.used.pct`::double)');
  });

  it('aggregates a downsampled metric as-is (`::double` has no aggregate_metric_double cast)', () => {
    const query = semconvQuery(
      fieldTypes(SEMCONV_METRICS, field(SEMCONV_CPU, 'number', ['aggregate_metric_double']))
    )!;

    expect(query).toContain('AVG(`metrics.system.cpu.utilization`)');
    expect(query).not.toContain('metrics.system.cpu.utilization`::');
    // The other KPIs keep their double cast.
    expect(query).toContain('AVG(`system.memory.utilization`::double)');
  });

  it('resolves a metric downsampled in some indices and raw in others', () => {
    // Both mapping types collapse to Kibana's `number`, so only `esTypes`
    // reveals the union ES|QL would reject.
    const query = semconvQuery(
      fieldTypes(
        SEMCONV_METRICS,
        field(SEMCONV_CPU, 'number', ['aggregate_metric_double', 'double'])
      )
    )!;

    expect(query).toContain('AVG(`metrics.system.cpu.utilization`::aggregate_metric_double)');
    expect(query).toContain('cpuUsage = AVG(host_cpuUsage)');
    expect(query).toContain('memoryUsage = AVG(host_memoryUsage)');
    expect(query).toContain('diskUsage = AVG(host_diskUsage)');
  });

  it('casts a union of mixed numeric widths to double', () => {
    const query = semconvQuery(
      fieldTypes(SEMCONV_METRICS, field(SEMCONV_CPU, 'number', ['float', 'long']))
    )!;

    expect(query).toContain('AVG(`metrics.system.cpu.utilization`::double)');
    expect(query).toContain('cpuUsage = AVG(host_cpuUsage)');
  });

  it('casts a metric dynamically mapped as keyword in some indices to double', () => {
    // Values that do not parse become null, which the aggregations skip.
    const query = semconvQuery(
      fieldTypes(SEMCONV_METRICS, field(SEMCONV_DISK, 'conflict', ['float', 'keyword']))
    )!;

    expect(query).toContain('`metrics.system.filesystem.usage`::double');
    expect(query).not.toContain('::keyword');
    expect(query).toContain('diskUsage = AVG(host_diskUsage)');
  });

  it('drops a metric with no numeric mapping behind it', () => {
    const query = semconvQuery(
      fieldTypes(SEMCONV_METRICS, field(SEMCONV_DISK, 'string', ['keyword', 'text']))
    )!;

    expect(query).not.toContain('metrics.system.filesystem.usage');
    expect(query).not.toContain('diskUsage');
    expect(query).toContain('cpuUsage = AVG(host_cpuUsage)');
    expect(query).toContain('memoryUsage = AVG(host_memoryUsage)');
  });

  it('drops a metric whose union holds a type no cast resolves', () => {
    // Casting is restricted to mapping types known to convert: emitting a cast
    // ES|QL might reject would fail the whole query, not just this KPI.
    const query = semconvQuery(
      fieldTypes(SEMCONV_METRICS, field(SEMCONV_DISK, 'conflict', ['double', 'date']))
    )!;

    expect(query).not.toContain('metrics.system.filesystem.usage');
    expect(query).not.toContain('diskUsage');
    expect(query).toContain('cpuUsage = AVG(host_cpuUsage)');
    expect(query).toContain('normalizedLoad1m = AVG(host_normalizedLoad1m)');
  });

  it("reads a metric with no mapping behind it from Kibana's own field type", () => {
    // A runtime field defined on the data view reports no `esTypes`.
    const numeric = semconvQuery(fieldTypes(SEMCONV_METRICS, field(SEMCONV_CPU, 'number')))!;
    expect(numeric).toContain('AVG(`metrics.system.cpu.utilization`::double)');

    const nonNumeric = semconvQuery(fieldTypes(SEMCONV_METRICS, field(SEMCONV_CPU, 'string')))!;
    expect(nonNumeric).not.toContain('metrics.system.cpu.utilization');
    expect(nonNumeric).not.toContain('cpuUsage');
  });

  it('drops only the metrics the data view does not report (semconv)', () => {
    // No filesystem field: disk is dropped, the rest stay.
    const semconvNoDisk = semconvQuery(
      fieldTypes(SEMCONV_METRICS.filter((name) => name !== SEMCONV_DISK))
    )!;
    expect(semconvNoDisk).not.toContain('metrics.system.filesystem.usage');
    expect(semconvNoDisk).not.toContain('diskUsage');
    expect(semconvNoDisk).toContain('cpuUsage = AVG(host_cpuUsage)');
    expect(semconvNoDisk).toContain('memoryUsage = AVG(host_memoryUsage)');

    // No cpu utilization (e.g. warm-up): cpu is dropped but load/memory survive.
    const semconvNoCpu = semconvQuery(
      fieldTypes(SEMCONV_METRICS.filter((name) => name !== SEMCONV_CPU))
    )!;
    expect(semconvNoCpu).not.toContain('metrics.system.cpu.utilization');
    expect(semconvNoCpu).not.toContain('cpuUsage');
    expect(semconvNoCpu).toContain('normalizedLoad1m = AVG(host_normalizedLoad1m)');
    expect(semconvNoCpu).toContain('memoryUsage = AVG(host_memoryUsage)');
  });

  it('drops only the metrics the data view does not report (ECS)', () => {
    // No filesystem field: disk is dropped, the rest stay.
    const ecsNoDisk = ecsQuery(fieldTypes(ECS_METRICS.filter((name) => name !== ECS_DISK)))!;
    expect(ecsNoDisk).not.toContain('system.filesystem.used.pct');
    expect(ecsNoDisk).not.toContain('diskUsage');
    expect(ecsNoDisk).toContain('cpuUsage = AVG(host_cpuUsage)');
    expect(ecsNoDisk).toContain('memoryUsage = AVG(host_memoryUsage)');

    // No cpu field: cpu is dropped but load/memory/disk survive.
    const ecsNoCpu = ecsQuery(fieldTypes(ECS_METRICS.filter((name) => name !== ECS_CPU)))!;
    expect(ecsNoCpu).not.toContain('system.cpu.total.norm.pct');
    expect(ecsNoCpu).not.toContain('cpuUsage');
    expect(ecsNoCpu).toContain('normalizedLoad1m = AVG(host_normalizedLoad1m)');
    expect(ecsNoCpu).toContain('diskUsage = MAX(host_diskUsage)');
  });

  it('drops the state pre-filter when only normalized load remains', () => {
    const query = semconvQuery(fieldTypes([SEMCONV_LOAD, SEMCONV_CORES]))!;

    expect(query).toContain('normalizedLoad1m = AVG(host_normalizedLoad1m)');
    expect(query).not.toContain('WHERE state');
  });

  it('drops the state-scoped KPIs when `state` is an object in some indices', () => {
    // `state` is referenced bare inside `WHERE`, so no cast can resolve it.
    const query = semconvQuery(
      fieldTypes(SEMCONV_METRICS, field(STATE, 'conflict', ['keyword', 'object']))
    )!;

    expect(query).not.toContain('WHERE state');
    expect(query).not.toContain('cpuUsage');
    expect(query).not.toContain('memoryUsage');
    expect(query).not.toContain('diskUsage');
    expect(query).toContain('normalizedLoad1m = AVG(host_normalizedLoad1m)');
  });

  it('casts a union-typed `host.name` into the grouping key', () => {
    const query = semconvQuery(
      fieldTypes(SEMCONV_METRICS, field(HOST_NAME, 'string', ['keyword', 'text']))
    )!;

    expect(query).toContain('| EVAL host_name = `host.name`::keyword');
    expect(query).toContain('BY host_name');
    expect(query).toContain('SORT host_name ASC');
    // The cast must be evaluated before the per-host STATS reads it.
    expect(query.indexOf('EVAL host_name')).toBeLessThan(query.indexOf('BY host_name'));
    expect(query).toContain('cpuUsage = AVG(host_cpuUsage)');
  });

  it('casts a `text`-only `host.name`, which is not groupable either', () => {
    const query = semconvQuery(fieldTypes(SEMCONV_METRICS, field(HOST_NAME, 'string', ['text'])))!;

    expect(query).toContain('| EVAL host_name = `host.name`::keyword');
    expect(query).toContain('BY host_name');
  });

  it('builds no query without a usable grouping key', () => {
    // `host.name` absent from the data view.
    expect(semconvQuery(indexFieldTypes([field(STATE, 'string', ['keyword'])]))).toBeUndefined();
    // A `host.name` conflict no string cast resolves.
    expect(
      semconvQuery(fieldTypes(SEMCONV_METRICS, field(HOST_NAME, 'conflict', ['keyword', 'object'])))
    ).toBeUndefined();
  });

  it('builds no query when no KPI field is queryable', () => {
    expect(semconvQuery(fieldTypes([]))).toBeUndefined();
    expect(ecsQuery(fieldTypes([]))).toBeUndefined();
  });

  it('returns undefined without a schema, index pattern, or limit', () => {
    const base = {
      schema: 'ecs' as const,
      indexPattern: 'metrics-*',
      limit: 100,
      fields: fieldTypes(ECS_METRICS),
    };
    expect(buildHostsKpisQuery({ ...base, schema: undefined })).toBeUndefined();
    expect(buildHostsKpisQuery({ ...base, indexPattern: undefined })).toBeUndefined();
    expect(buildHostsKpisQuery({ ...base, limit: 0 })).toBeUndefined();
  });
});

describe('indexFieldTypes', () => {
  it('keeps every mapping type behind a field, and its collapsed Kibana type', () => {
    const fields = indexFieldTypes([
      field(HOST_NAME, 'string', ['keyword']),
      field(SEMCONV_CPU, 'number', ['aggregate_metric_double', 'double']),
      field(SEMCONV_DISK, 'number'),
    ]);

    expect(fields.get(HOST_NAME)).toEqual({ kbnType: 'string', esTypes: ['keyword'] });
    expect(fields.get(SEMCONV_CPU)).toEqual({
      kbnType: 'number',
      esTypes: ['aggregate_metric_double', 'double'],
    });
    // A field reporting no mapping types keeps an empty list, not `undefined`.
    expect(fields.get(SEMCONV_DISK)).toEqual({ kbnType: 'number', esTypes: [] });
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
