/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** ECS / system host metric field names */
export const SYSTEM_CPU_CORES = 'system.cpu.cores';
export const SYSTEM_CPU_TOTAL_NORM_PCT = 'system.cpu.total.norm.pct';
export const SYSTEM_MEMORY_TOTAL = 'system.memory.total';
export const SYSTEM_MEMORY_USED_PCT = 'system.memory.used.pct';

/** SemConv (OpenTelemetry) host metric field names */
export const SEMCONV_SYSTEM_CPU_LOGICAL_COUNT = 'metrics.system.cpu.logical.count';
export const SEMCONV_SYSTEM_CPU_UTILIZATION = 'metrics.system.cpu.utilization';
export const SEMCONV_SYSTEM_MEMORY_LIMIT = 'metrics.system.memory.limit';
export const SEMCONV_SYSTEM_MEMORY_UTILIZATION = 'metrics.system.memory.utilization';
