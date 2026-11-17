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
  // kubernetes_otel/kibana/alerting_rule_template/kubernetes_otel-container-memory-near-limit.json L31, L39-L40.
  {
    signal: 'k8s.container.memory_vs_limit',
    subtypes: WORKLOAD_SUBTYPES.slice(0, 3),
    window: '15 minutes',
    variants: [
      {
        schema: 'ecs',
        dataset: 'kubernetes.container',
        field: 'kubernetes.container.memory.usage.limit.pct',
        formula: 'AVG(kubernetes.container.memory.usage.limit.pct)',
        formulaKind: 'average',
        direction: 'higher_is_worse',
        comparison: '>',
        threshold: 0.9,
        source: nightshiftDefault('OTel template threshold applied to the Elastic Agent field'),
      },
      {
        schema: 'otel',
        dataset: 'kubeletstatsreceiver.otel',
        field: 'k8s.container.memory_limit_utilization',
        formula: 'AVG(k8s.container.memory_limit_utilization)',
        formulaKind: 'average',
        direction: 'higher_is_worse',
        comparison: '>',
        threshold: 0.9,
        source: kubernetesOtelRule('kubernetes_otel-container-memory-near-limit'),
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
  // kubernetes_otel/kibana/alerting_rule_template/kubernetes_otel-oomkilled-containers.json L31, L39-L40.
  {
    signal: 'k8s.container.oom_killed',
    subtypes: WORKLOAD_SUBTYPES,
    window: '15 minutes',
    variants: [
      {
        schema: 'ecs',
        dataset: 'kubernetes.state_container',
        field: 'kubernetes.container.status.restarts',
        formula: 'COUNT(containers with a restart delta and an OOMKilled reason)',
        formulaKind: 'oom_killed_count',
        reasonField: 'kubernetes.container.status.last_terminated_reason',
        reasonValue: 'OOMKilled',
        direction: 'higher_is_worse',
        comparison: '>',
        threshold: 0,
        source: nightshiftDefault('OTel template threshold applied to the Elastic Agent field'),
      },
      {
        schema: 'otel',
        dataset: 'k8sclusterreceiver.otel',
        field: 'k8s.container.restarts',
        formula: 'COUNT(containers with a restart delta and an OOMKilled reason)',
        formulaKind: 'oom_killed_count',
        reasonField: 'k8s.container.status.last_terminated_reason',
        reasonValue: 'OOMKilled',
        direction: 'higher_is_worse',
        comparison: '>',
        threshold: 0,
        source: kubernetesOtelRule(
          'kubernetes_otel-oomkilled-containers',
          'also requires a restart in the window; the reason field keeps its value after the event, so the template fires for old kills'
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
  // kubernetes_otel/kibana/alerting_rule_template/kubernetes_otel-node-memory-pressure.json L31, L39-L40.
  {
    signal: 'k8s.node.memory_pressure',
    subtypes: ['k8s.node'],
    window: '1 minute',
    variants: [
      {
        schema: 'ecs',
        dataset: 'kubernetes.state_node',
        field: 'kubernetes.node.status.memory_pressure',
        formula: 'COUNT(*) WHERE kubernetes.node.status.memory_pressure == "true"',
        formulaKind: 'not_ready_count',
        matchingValues: ['true'],
        direction: 'higher_is_worse',
        comparison: '>',
        threshold: 0,
        source: nightshiftDefault('OTel template threshold applied to the Elastic Agent field'),
      },
      {
        schema: 'otel',
        dataset: 'k8sclusterreceiver.otel',
        field: 'k8s.node.condition_memory_pressure',
        formula: 'MAX(k8s.node.condition_memory_pressure)',
        formulaKind: 'maximum',
        direction: 'higher_is_worse',
        comparison: '==',
        threshold: 1,
        source: kubernetesOtelRule('kubernetes_otel-node-memory-pressure'),
      },
    ],
  },
  // kubernetes_otel/kibana/alerting_rule_template/kubernetes_otel-node-disk-pressure.json L31, L39-L40.
  {
    signal: 'k8s.node.disk_pressure',
    subtypes: ['k8s.node'],
    window: '1 minute',
    variants: [
      {
        schema: 'ecs',
        dataset: 'kubernetes.state_node',
        field: 'kubernetes.node.status.disk_pressure',
        formula: 'COUNT(*) WHERE kubernetes.node.status.disk_pressure == "true"',
        formulaKind: 'not_ready_count',
        matchingValues: ['true'],
        direction: 'higher_is_worse',
        comparison: '>',
        threshold: 0,
        source: nightshiftDefault('OTel template threshold applied to the Elastic Agent field'),
      },
      {
        schema: 'otel',
        dataset: 'k8sclusterreceiver.otel',
        field: 'k8s.node.condition_disk_pressure',
        formula: 'MAX(k8s.node.condition_disk_pressure)',
        formulaKind: 'maximum',
        direction: 'higher_is_worse',
        comparison: '==',
        threshold: 1,
        source: kubernetesOtelRule('kubernetes_otel-node-disk-pressure'),
      },
    ],
  },
  // kubernetes_otel/kibana/alerting_rule_template/kubernetes_otel-node-filesystem-saturation.json L31, L39-L40.
  {
    signal: 'k8s.node.filesystem_usage',
    subtypes: ['k8s.node'],
    window: '15 minutes',
    variants: [
      {
        schema: 'ecs',
        dataset: 'kubernetes.node',
        field: 'kubernetes.node.fs.used.bytes',
        denominatorField: 'kubernetes.node.fs.capacity.bytes',
        formula: 'AVG(kubernetes.node.fs.used.bytes) / AVG(kubernetes.node.fs.capacity.bytes)',
        formulaKind: 'ratio',
        direction: 'higher_is_worse',
        comparison: '>',
        threshold: 0.85,
        source: nightshiftDefault('OTel template threshold applied to the Elastic Agent field'),
      },
      {
        schema: 'otel',
        dataset: 'kubeletstatsreceiver.otel',
        field: 'k8s.node.filesystem.usage',
        denominatorField: 'k8s.node.filesystem.capacity',
        formula: 'AVG(k8s.node.filesystem.usage) / AVG(k8s.node.filesystem.capacity)',
        formulaKind: 'ratio',
        direction: 'higher_is_worse',
        comparison: '>',
        threshold: 0.85,
        source: kubernetesOtelRule('kubernetes_otel-node-filesystem-saturation'),
      },
    ],
  },
  // kubernetes_otel/kibana/alerting_rule_template/kubernetes_otel-persistent-volume-space-low.json L31, L39-L40.
  {
    signal: 'k8s.volume.space_low',
    subtypes: ['k8s.namespace'],
    window: '15 minutes',
    variants: [
      {
        schema: 'ecs',
        dataset: 'kubernetes.volume',
        field: 'kubernetes.volume.fs.available.bytes',
        denominatorField: 'kubernetes.volume.fs.capacity.bytes',
        formula:
          'AVG(kubernetes.volume.fs.available.bytes) / AVG(kubernetes.volume.fs.capacity.bytes)',
        formulaKind: 'ratio',
        additionalBreakdown: ['kubernetes.pod.name', 'kubernetes.volume.name'],
        direction: 'lower_is_worse',
        comparison: '<',
        threshold: 0.2,
        source: nightshiftDefault('OTel template threshold applied to the Elastic Agent field'),
      },
      {
        schema: 'otel',
        dataset: 'kubeletstatsreceiver.otel',
        field: 'k8s.volume.available',
        denominatorField: 'k8s.volume.capacity',
        formula: 'AVG(k8s.volume.available) / AVG(k8s.volume.capacity)',
        formulaKind: 'ratio',
        additionalBreakdown: ['kubernetes.pod.name', 'k8s.volume.name'],
        direction: 'lower_is_worse',
        comparison: '<',
        threshold: 0.2,
        source: kubernetesOtelRule('kubernetes_otel-persistent-volume-space-low'),
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
