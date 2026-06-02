/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// --- Container metric field names ---

/** ECS (Elastic Common Schema) container metric field names */
export const ECS_CONTAINER_CPU_USAGE_LIMIT_PCT = 'kubernetes.container.cpu.usage.limit.pct';
export const ECS_CONTAINER_MEMORY_USAGE_BYTES = 'kubernetes.container.memory.usage.bytes';

/** SemConv K8s (Kubernetes container) metric field names — require resource limits to be set */
export const SEMCONV_K8S_CONTAINER_CPU_LIMIT_UTILIZATION =
  'metrics.k8s.container.cpu_limit_utilization';
export const SEMCONV_K8S_CONTAINER_MEMORY_LIMIT_UTILIZATION =
  'metrics.k8s.container.memory_limit_utilization';

/** SemConv container metrics always emitted by kubeletstats (no limits required) */
export const SEMCONV_CONTAINER_CPU_USAGE = 'metrics.container.cpu.usage';
export const SEMCONV_CONTAINER_MEMORY_WORKING_SET = 'metrics.container.memory.working_set';

/** SemConv container metric names used in UI tooltips (generic / display) */
export const SEMCONV_DOCKER_CONTAINER_CPU_UTILIZATION = 'metrics.container.cpu.utilization';
export const SEMCONV_DOCKER_CONTAINER_MEMORY_PERCENT = 'metrics.container.memory.percent';

// --- Host metric field names ---

/** ECS / system host metric field names */
export const SYSTEM_CPU_CORES = 'system.cpu.cores';
export const SYSTEM_CPU_TOTAL_NORM_PCT = 'system.cpu.total.norm.pct';
export const SYSTEM_MEMORY_TOTAL = 'system.memory.total';
export const SYSTEM_MEMORY_USED_PCT = 'system.memory.used.pct';

/** SemConv (OpenTelemetry) host metric field names */
export const SEMCONV_SYSTEM_CPU_LOGICAL_COUNT = 'metrics.system.cpu.logical.count';
export const SEMCONV_SYSTEM_CPU_UTILIZATION = 'metrics.system.cpu.utilization';
export const SEMCONV_SYSTEM_MEMORY_TOTAL = 'metrics.system.memory.total';
export const SEMCONV_SYSTEM_MEMORY_USAGE = 'metrics.system.memory.usage';
export const SEMCONV_SYSTEM_MEMORY_UTILIZATION = 'metrics.system.memory.utilization';

// --- Pod metric field names ---

/** ECS (Elastic Common Schema) pod metric field names */
export const ECS_POD_CPU_USAGE_LIMIT_PCT = 'kubernetes.pod.cpu.usage.limit.pct';

/** Derived/custom metric name used in both ECS and SemConv */
export const MEMORY_LIMIT_UTILIZATION = 'memory_limit_utilization';

/** ECS custom metric sub-fields (node memory for equation) */
export const KUBERNETES_NODE_MEMORY_ALLOCATABLE_BYTES = 'kubernetes.node.memory.allocatable.bytes';
export const KUBERNETES_NODE_MEMORY_USAGE_BYTES = 'kubernetes.node.memory.usage.bytes';

/** SemConv K8s pod metric field names — require resource limits to be set */
export const SEMCONV_K8S_POD_CPU_LIMIT_UTILIZATION = 'metrics.k8s.pod.cpu_limit_utilization';
export const SEMCONV_K8S_POD_MEMORY_LIMIT_UTILIZATION = 'metrics.k8s.pod.memory_limit_utilization';

/** SemConv K8s pod metrics always emitted by kubeletstats (no limits required) */
export const SEMCONV_K8S_POD_CPU_NODE_UTILIZATION = 'metrics.k8s.pod.cpu.node.utilization';
export const SEMCONV_K8S_POD_MEMORY_WORKING_SET = 'metrics.k8s.pod.memory.working_set';

// --- OTel dataset filter helpers ---

import type { QueryDslQueryContainer } from '@kbn/data-views-plugin/common/types';

/**
 * Builds a KQL source filter that matches OTel data regardless of whether the
 * dataset value is stored under `data_stream.dataset` or `event.dataset`.
 */
export const otelDatasetFilter = (dataset: string) =>
  `(data_stream.dataset: "${dataset}" OR event.dataset: "${dataset}")`;

/**
 * DSL equivalent of otelDatasetFilter — returns a QueryDslQueryContainer
 * that matches OTel data by both `data_stream.dataset` and `event.dataset`.
 */
export const otelDatasetFilterDsl = (dataset: string): QueryDslQueryContainer => ({
  bool: {
    should: [{ term: { 'data_stream.dataset': dataset } }, { term: { 'event.dataset': dataset } }],
    minimum_should_match: 1,
  },
});
