/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cpuUsage } from './cpu';
import { diskUsage } from './disk';
import { memoryUsage } from './memory';

describe('host semconv usage formulas', () => {
  it('uses an idle-only CPU expression for semconv', () => {
    expect(cpuUsage.value.semconv).toBe(
      "1-average(metrics.system.cpu.utilization,kql='state: idle')"
    );
  });

  it('uses used-only memory utilization for semconv', () => {
    expect(memoryUsage.value.semconv).toBe("average(system.memory.utilization, kql='state: used')");
  });

  it('uses a bounded per-mount utilization expression for the semconv disk usage KPI', () => {
    // Must stay `max(...utilization)` rather than an un-partitioned `sum(free) / sum(all)` ratio,
    // which blended mount points of different sizes and inflated the KPI toward 100%.
    expect(diskUsage.value.semconv).toBe('max(metrics.system.filesystem.utilization)');
  });
});
