/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// P10 — coverage for the Phase B semconv → ES|QL expression mapping. The
// ES|QL execution path itself is integration-tested against a live cluster;
// here we lock the expression strings so a future regression doesn't
// silently swap a semconv inventory formula for an arbitrary one.

import { __testing__ } from './get_hosts_metrics';

const { buildSemconvMetricExpression, esqlAlias } = __testing__;

describe('Phase B semconv ES|QL expression mapping', () => {
  it('maps cpuV2 to 1 - mean(idle) of metrics.system.cpu.utilization', () => {
    const expr = buildSemconvMetricExpression('cpuV2');
    expect(expr).toContain('metrics.system.cpu.utilization');
    expect(expr).toContain('state == "idle"');
    expect(expr).toContain('cpuV2 = 1 - cpu_idle');
  });

  it('maps memory to mean(used) of system.memory.utilization', () => {
    const expr = buildSemconvMetricExpression('memory');
    expect(expr).toContain('system.memory.utilization');
    expect(expr).toContain('state == "used"');
    expect(expr).toContain('memory = mem_used');
  });

  it('maps memoryFree to the four-state bucket-script arithmetic shape', () => {
    const expr = buildSemconvMetricExpression('memoryFree');
    expect(expr).toContain('system.memory.usage');
    expect(expr).toContain('"cached"');
    expect(expr).toContain('"free"');
    expect(expr).toContain('"slab_unreclaimable"');
    expect(expr).toContain('"slab_reclaimable"');
    expect(expr).toContain('(mem_cached + mem_free) - (mem_slab_unrec + mem_slab_rec)');
  });

  it('maps diskSpaceUsage to CASE(total > 0, 1 - free/total, 0) of filesystem.usage', () => {
    const expr = buildSemconvMetricExpression('diskSpaceUsage');
    expect(expr).toContain('metrics.system.filesystem.usage');
    expect(expr).toContain('state == "free"');
    expect(expr).toContain('CASE(disk_total > 0, 1 - disk_free / disk_total, 0)');
  });

  it('maps normalizedLoad1m to backtick-quoted load_average.1m divided by logical.count', () => {
    const expr = buildSemconvMetricExpression('normalizedLoad1m');
    // The `.1m` segment forces backtick-quoting — otherwise the parser
    // reads it as a time literal and rejects the expression.
    expect(expr).toContain('`metrics.system.cpu.load_average.1m`');
    expect(expr).toContain('metrics.system.cpu.logical.count');
    expect(expr).toContain('normalizedLoad1m = load1m / cores');
  });

  it('maps rxV2 / txV2 to per-direction averages of metrics.system.network.io', () => {
    expect(buildSemconvMetricExpression('rxV2')).toContain('direction == "receive"');
    expect(buildSemconvMetricExpression('rxV2')).toContain('metrics.system.network.io');
    expect(buildSemconvMetricExpression('txV2')).toContain('direction == "transmit"');
    expect(buildSemconvMetricExpression('txV2')).toContain('metrics.system.network.io');
  });

  it('returns a typed NULL placeholder for legacy ECS-only metrics so the column still exists', () => {
    expect(buildSemconvMetricExpression('cpu')).toBe('cpu = TO_DOUBLE(NULL)');
    expect(buildSemconvMetricExpression('rx')).toBe('rx = TO_DOUBLE(NULL)');
    expect(buildSemconvMetricExpression('tx')).toBe('tx = TO_DOUBLE(NULL)');
  });
});

describe('esqlAlias', () => {
  it('passes through valid identifiers verbatim', () => {
    expect(esqlAlias('cpuV2')).toBe('cpuV2');
    expect(esqlAlias('memory')).toBe('memory');
  });

  it("doesn't currently need mangling for the host metric names", () => {
    // All current InfraEntityMetricType values are valid identifiers — this
    // test exists to flag future additions that aren't.
    expect(esqlAlias('rxV2')).toBe('rxV2');
    expect(esqlAlias('memoryFree')).toBe('memoryFree');
  });
});
