/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignalTemplate } from './types';

const WORKLOAD_SUBTYPES = [
  'k8s.deployment',
  'k8s.statefulset',
  'k8s.daemonset',
  'k8s.cronjob',
] as const;

export const SIGNAL_TEMPLATES: readonly SignalTemplate[] = [
  // kubernetes_otel container-cpu-throttling rule template, ES|QL L32 and window L40-L41.
  {
    signal: 'k8s.container.cpu_vs_limit',
    subtypes: WORKLOAD_SUBTYPES.slice(0, 3),
    window: '15 minutes',
    thresholdSource: 'kubernetes_otel container-cpu-throttling rule template',
    variants: [
      {
        schema: 'ecs',
        dataset: 'kubernetes.container',
        field: 'kubernetes.container.cpu.usage.limit.pct',
        formula: 'AVG(kubernetes.container.cpu.usage.limit.pct)',
        formulaKind: 'average',
        direction: 'higher_is_worse',
        comparison: '>',
        threshold: 0.9,
        label: 'example',
      },
      {
        schema: 'otel',
        dataset: 'kubeletstatsreceiver.otel',
        field: 'k8s.container.cpu_limit_utilization',
        formula: 'AVG(k8s.container.cpu_limit_utilization)',
        formulaKind: 'average',
        direction: 'higher_is_worse',
        comparison: '>',
        threshold: 0.9,
        label: 'proven',
      },
    ],
  },
  // kubernetes_otel pod-crashloopbackoff L31 and L39-L40; delta avoids stale restarts from MAX.
  {
    signal: 'k8s.container.restarts',
    subtypes: WORKLOAD_SUBTYPES,
    window: '15 minutes',
    thresholdSource: 'kubernetes_otel pod-crashloopbackoff rule template',
    variants: [
      {
        schema: 'ecs',
        dataset: 'kubernetes.state_container',
        field: 'kubernetes.container.status.restarts',
        formula: 'SUM(MAX(restarts) - MIN(restarts) per container)',
        formulaKind: 'restart_delta',
        direction: 'higher_is_worse',
        comparison: '>',
        threshold: 0,
        label: 'to decide',
      },
      {
        schema: 'otel',
        dataset: 'k8sclusterreceiver.otel',
        field: 'k8s.container.restarts',
        formula: 'SUM(MAX(restarts) - MIN(restarts) per container)',
        formulaKind: 'restart_delta',
        direction: 'higher_is_worse',
        comparison: '>',
        threshold: 0,
        label: 'example',
      },
    ],
  },
  // kubernetes_otel node-not-ready rule template, ES|QL L31 and window L39-L40.
  {
    signal: 'k8s.node.not_ready',
    subtypes: ['k8s.node'],
    window: '1 minute',
    thresholdSource: 'kubernetes_otel node-not-ready rule template',
    variants: [
      {
        schema: 'ecs',
        dataset: 'kubernetes.state_node',
        field: 'kubernetes.node.status.ready',
        formula: 'COUNT(kubernetes.node.status.ready IN ("false", "unknown"))',
        formulaKind: 'not_ready_count',
        direction: 'higher_is_worse',
        comparison: '>',
        threshold: 0,
        label: 'example',
      },
      {
        schema: 'otel',
        dataset: 'k8sclusterreceiver.otel',
        field: 'k8s.node.condition_ready',
        formula: 'MIN(k8s.node.condition_ready)',
        formulaKind: 'minimum',
        direction: 'lower_is_worse',
        comparison: '==',
        threshold: 0,
        label: 'proven',
      },
    ],
  },
  // system cpu-utilization rule template, ES|QL L18 and window L15-L16.
  {
    signal: 'host.cpu.utilization',
    subtypes: ['host', 'k8s.node'],
    window: '5 minutes',
    thresholdSource: 'system cpu-utilization rule template',
    variants: [
      {
        schema: 'ecs',
        dataset: 'system.cpu',
        field: 'system.cpu.total.norm.pct',
        formula: 'AVG(system.cpu.total.norm.pct)',
        formulaKind: 'average',
        minimumSampleCount: 5,
        direction: 'higher_is_worse',
        comparison: '>=',
        threshold: 0.85,
        label: 'proven',
      },
      {
        schema: 'otel',
        dataset: 'hostmetricsreceiver.otel',
        field: 'metrics.system.cpu.utilization',
        formula: '1 - AVG(metrics.system.cpu.utilization) WHERE state == "idle"',
        formulaKind: 'inverse_average',
        preAggregationFilter: 'state == "idle"',
        minimumSampleCount: 5,
        direction: 'higher_is_worse',
        comparison: '>=',
        threshold: 0.85,
        label: 'example',
      },
    ],
  },
  // system memory-utilization rule template, ES|QL L18 and window L15-L16.
  {
    signal: 'host.memory.utilization',
    subtypes: ['host', 'k8s.node'],
    window: '5 minutes',
    thresholdSource: 'system memory-utilization rule template',
    variants: [
      {
        schema: 'ecs',
        dataset: 'system.memory',
        field: 'system.memory.actual.used.pct',
        formula: 'AVG(system.memory.actual.used.pct)',
        formulaKind: 'average',
        minimumSampleCount: 5,
        direction: 'higher_is_worse',
        comparison: '>=',
        threshold: 0.9,
        label: 'proven',
      },
      {
        schema: 'otel',
        dataset: 'hostmetricsreceiver.otel',
        field: 'system.memory.utilization',
        formula: 'AVG(system.memory.utilization) WHERE state == "used"',
        formulaKind: 'average',
        preAggregationFilter: 'state == "used"',
        minimumSampleCount: 5,
        direction: 'higher_is_worse',
        comparison: '>=',
        threshold: 0.9,
        label: 'example',
      },
    ],
  },
  // Our tested APM service error-rate example.
  {
    signal: 'service.error_rate',
    subtypes: ['service'],
    window: '15 minutes',
    thresholdSource: 'our example',
    variants: [
      {
        schema: 'ecs',
        dataset: 'apm.service_transaction.1m',
        field: 'event.success_count',
        formula: '1 - SUM(event.success_count) / COUNT(event.success_count)',
        formulaKind: 'error_rate',
        additionalBreakdown: ['transaction.type'],
        direction: 'higher_is_worse',
        comparison: '>',
        threshold: 0.05,
        label: 'example',
      },
    ],
  },
];
