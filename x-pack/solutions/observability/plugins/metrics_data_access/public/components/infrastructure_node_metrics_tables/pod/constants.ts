/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** ECS (Elastic Common Schema) pod metric field names */
export const ECS_POD_CPU_USAGE_LIMIT_PCT = 'kubernetes.pod.cpu.usage.limit.pct';

/** Derived/custom metric name used in both ECS and SemConv */
export const MEMORY_LIMIT_UTILIZATION = 'memory_limit_utilization';

/** ECS custom metric sub-fields (node memory for equation) */
export const KUBERNETES_NODE_MEMORY_ALLOCATABLE_BYTES =
  'kubernetes.node.memory.allocatable.bytes';
export const KUBERNETES_NODE_MEMORY_USAGE_BYTES = 'kubernetes.node.memory.usage.bytes';

/** SemConv K8s pod metric field names */
export const SEMCONV_K8S_POD_CPU_LIMIT_UTILIZATION = 'metrics.k8s.pod.cpu_limit_utilization';
export const SEMCONV_K8S_POD_MEMORY_LIMIT_UTILIZATION = 'metrics.k8s.pod.memory_limit_utilization';
