/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** ECS (Elastic Common Schema) container metric field names */
export const ECS_CONTAINER_CPU_USAGE_LIMIT_PCT = 'kubernetes.container.cpu.usage.limit.pct';
export const ECS_CONTAINER_MEMORY_USAGE_BYTES = 'kubernetes.container.memory.usage.bytes';

/** SemConv Docker (generic container) metric field names */
export const SEMCONV_DOCKER_CONTAINER_CPU_UTILIZATION = 'metrics.container.cpu.utilization';
export const SEMCONV_DOCKER_CONTAINER_MEMORY_USAGE_TOTAL = 'metrics.container.memory.usage.total';

/** SemConv K8s (Kubernetes container) metric field names */
export const SEMCONV_K8S_CONTAINER_CPU_LIMIT_UTILIZATION =
  'metrics.k8s.container.cpu_limit_utilization';
export const SEMCONV_K8S_CONTAINER_MEMORY_LIMIT_UTILIZATION =
  'metrics.k8s.container.memory_limit_utilization';

/** SemConv container metric names used in UI tooltips (generic / display) */
export const SEMCONV_CONTAINER_CPU_LIMIT_UTILIZATION_DISPLAY =
  'metrics.container.cpu_limit_utilization';
export const SEMCONV_CONTAINER_MEMORY_LIMIT_UTILIZATION_DISPLAY =
  'metrics.container.memory_limit_utilization';
