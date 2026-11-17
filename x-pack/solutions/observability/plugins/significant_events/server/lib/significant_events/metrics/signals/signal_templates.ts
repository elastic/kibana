/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignalSource, SignalTemplate } from './types';

const WORKLOAD_SUBTYPES = [
  'k8s.deployment',
  'k8s.statefulset',
  'k8s.daemonset',
  'k8s.cronjob',
] as const;

const kubernetesOtelRule = (ruleTemplateId: string, adapted?: string): SignalSource => ({
  kind: 'integration_rule_template',
  integration: 'kubernetes_otel',
  integrationVersion: '2.6.1',
  ruleTemplateId,
  ...(adapted ? { adapted } : {}),
});

const systemRule = (ruleTemplateId: string): SignalSource => ({
  kind: 'integration_rule_template',
  integration: 'system',
  integrationVersion: '3.5.0',
  ruleTemplateId,
});

const nightshiftDefault = (reason: string): SignalSource => ({
  kind: 'nightshift_default',
  reason,
});

const undecided = (reason: string): SignalSource => ({
  kind: 'undecided',
  reason,
});

// Signal ids are stable API values; add new ids instead of renaming existing ones.
export const SIGNAL_TEMPLATES: readonly SignalTemplate[] = [
  // kubernetes_otel/kibana/alerting_rule_template/kubernetes_otel-container-cpu-throttling.json L32, L40-L41.
  {
    signal: 'k8s.container.cpu_vs_limit',
    subtypes: WORKLOAD_SUBTYPES.slice(0, 3),
    window: '15 minutes',
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
        source: nightshiftDefault(
          'OTel template threshold applied to the Elastic Agent field; the classic Kubernetes package ships no rule template'
        ),
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
        source: kubernetesOtelRule('kubernetes_otel-container-cpu-throttling'),
      },
    ],
  },
  // kubernetes_otel/kibana/alerting_rule_template/kubernetes_otel-pod-crashloopbackoff.json L31, L39-L40.
  {
    signal: 'k8s.container.restarts',
    subtypes: WORKLOAD_SUBTYPES,
    window: '15 minutes',
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
        source: undecided('counter delta over 15 min; no rule template for the classic package'),
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
        source: kubernetesOtelRule(
          'kubernetes_otel-pod-crashloopbackoff',
          "MAX minus MIN over the window instead of MAX, so restarts from before the window don't fire"
        ),
      },
    ],
  },
  // kubernetes_otel/kibana/alerting_rule_template/kubernetes_otel-node-not-ready.json L31, L39-L40.
  {
    signal: 'k8s.node.not_ready',
    subtypes: ['k8s.node'],
    window: '1 minute',
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
        source: nightshiftDefault(
          'condition from the classic Kubernetes dashboard, not a rule template'
        ),
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
        source: kubernetesOtelRule('kubernetes_otel-node-not-ready'),
      },
    ],
  },
  // system/kibana/alerting_rule_template/system-cpu-utilization.json L15-L18.
  {
    signal: 'host.cpu.utilization',
    subtypes: ['host', 'k8s.node'],
    window: '5 minutes',
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
        source: systemRule('system-cpu-utilization'),
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
        source: nightshiftDefault(
          'system template threshold applied to the OTel field; no system OTel template'
        ),
      },
    ],
  },
  // system/kibana/alerting_rule_template/system-memory-utilization.json L15-L18.
  {
    signal: 'host.memory.utilization',
    subtypes: ['host', 'k8s.node'],
    window: '5 minutes',
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
        source: systemRule('system-memory-utilization'),
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
        source: nightshiftDefault(
          'system template threshold applied to the OTel field; no system OTel template'
        ),
      },
    ],
  },
  // Nightshift default; APM has no integration rule template for this error rate threshold.
  {
    signal: 'service.error_rate',
    subtypes: ['service'],
    window: '15 minutes',
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
        source: nightshiftDefault(
          '5% error rate, our example; APM ships no error rate rule template'
        ),
      },
    ],
  },
];
