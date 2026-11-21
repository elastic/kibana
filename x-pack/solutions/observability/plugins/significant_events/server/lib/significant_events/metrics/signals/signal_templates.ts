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

// Signal ids are stable API values; add new ids instead of renaming existing ones.
export const SIGNAL_TEMPLATES: readonly SignalTemplate[] = [
  // kubernetes_otel/kibana/alerting_rule_template/kubernetes_otel-container-cpu-throttling.json L32, L40-L41.
  {
    signal: 'k8s.container.cpu_vs_limit',
    subtypes: WORKLOAD_SUBTYPES.slice(0, 3),
    metricType: 'gauge',
    unit: 'ratio',
    contextColumns: ['worst_container'],
    hint: { comparison: '>', threshold: 0.9, window: '15 minutes' },
    variants: [
      {
        schema: 'ecs',
        dataset: 'kubernetes.container',
        field: 'kubernetes.container.cpu.usage.limit.pct',
        formula: 'Worst per container AVG(kubernetes.container.cpu.usage.limit.pct)',
        formulaKind: 'container_average',
        source: nightshiftDefault(
          'OTel template threshold applied to the Elastic Agent field; the classic Kubernetes package ships no rule template'
        ),
      },
      {
        schema: 'otel',
        dataset: 'kubeletstatsreceiver.otel',
        field: 'k8s.container.cpu_limit_utilization',
        formula: 'Worst per container AVG(k8s.container.cpu_limit_utilization)',
        formulaKind: 'container_average',
        source: kubernetesOtelRule('kubernetes_otel-container-cpu-throttling'),
      },
    ],
  },
  // kubernetes_otel/kibana/alerting_rule_template/kubernetes_otel-container-memory-near-limit.json L31, L39-L40.
  {
    signal: 'k8s.container.memory_vs_limit',
    subtypes: WORKLOAD_SUBTYPES.slice(0, 3),
    metricType: 'gauge',
    unit: 'ratio',
    contextColumns: ['worst_container'],
    hint: { comparison: '>', threshold: 0.9, window: '15 minutes' },
    variants: [
      {
        schema: 'ecs',
        dataset: 'kubernetes.container',
        field: 'kubernetes.container.memory.usage.limit.pct',
        formula: 'Worst per container AVG(kubernetes.container.memory.usage.limit.pct)',
        formulaKind: 'container_average',
        source: nightshiftDefault('OTel template threshold applied to the Elastic Agent field'),
      },
      {
        schema: 'otel',
        dataset: 'kubeletstatsreceiver.otel',
        field: 'k8s.container.memory_limit_utilization',
        formula: 'Worst per container AVG(k8s.container.memory_limit_utilization)',
        formulaKind: 'container_average',
        source: kubernetesOtelRule('kubernetes_otel-container-memory-near-limit'),
      },
    ],
  },
  // kubernetes_otel/kibana/alerting_rule_template/kubernetes_otel-node-not-ready.json L31, L39-L40.
  {
    signal: 'k8s.node.not_ready',
    subtypes: ['k8s.node'],
    metricType: 'state',
    unit: 'boolean',
    contextColumns: [],
    hint: { comparison: '==', threshold: 1, window: '1 minute' },
    variants: [
      {
        schema: 'ecs',
        dataset: 'kubernetes.state_node',
        field: 'kubernetes.node.status.ready',
        formula: 'MAX(CASE(ready IN ("false", "unknown"), 1, 0))',
        formulaKind: 'matching_value_count',
        matchingValues: ['false', 'unknown'],
        source: nightshiftDefault(
          'condition from the classic Kubernetes dashboard, not a rule template'
        ),
      },
      {
        schema: 'otel',
        dataset: 'k8sclusterreceiver.otel',
        field: 'k8s.node.condition_ready',
        formula: '1 - MIN(k8s.node.condition_ready)',
        formulaKind: 'minimum',
        source: kubernetesOtelRule('kubernetes_otel-node-not-ready'),
      },
    ],
  },
  // kubernetes_otel/kibana/alerting_rule_template/kubernetes_otel-node-memory-pressure.json L31, L39-L40.
  {
    signal: 'k8s.node.memory_pressure',
    subtypes: ['k8s.node'],
    metricType: 'state',
    unit: 'boolean',
    contextColumns: [],
    hint: { comparison: '==', threshold: 1, window: '1 minute' },
    variants: [
      {
        schema: 'ecs',
        dataset: 'kubernetes.state_node',
        field: 'kubernetes.node.status.memory_pressure',
        formula: 'MAX(CASE(memory_pressure == "true", 1, 0))',
        formulaKind: 'matching_value_count',
        matchingValues: ['true'],
        source: nightshiftDefault('OTel template threshold applied to the Elastic Agent field'),
      },
      {
        schema: 'otel',
        dataset: 'k8sclusterreceiver.otel',
        field: 'k8s.node.condition_memory_pressure',
        formula: 'MAX(k8s.node.condition_memory_pressure)',
        formulaKind: 'maximum',
        source: kubernetesOtelRule('kubernetes_otel-node-memory-pressure'),
      },
    ],
  },
  // kubernetes_otel/kibana/alerting_rule_template/kubernetes_otel-node-disk-pressure.json L31, L39-L40.
  {
    signal: 'k8s.node.disk_pressure',
    subtypes: ['k8s.node'],
    metricType: 'state',
    unit: 'boolean',
    contextColumns: [],
    hint: { comparison: '==', threshold: 1, window: '1 minute' },
    variants: [
      {
        schema: 'ecs',
        dataset: 'kubernetes.state_node',
        field: 'kubernetes.node.status.disk_pressure',
        formula: 'MAX(CASE(disk_pressure == "true", 1, 0))',
        formulaKind: 'matching_value_count',
        matchingValues: ['true'],
        source: nightshiftDefault('OTel template threshold applied to the Elastic Agent field'),
      },
      {
        schema: 'otel',
        dataset: 'k8sclusterreceiver.otel',
        field: 'k8s.node.condition_disk_pressure',
        formula: 'MAX(k8s.node.condition_disk_pressure)',
        formulaKind: 'maximum',
        source: kubernetesOtelRule('kubernetes_otel-node-disk-pressure'),
      },
    ],
  },
  // kubernetes_otel/kibana/alerting_rule_template/kubernetes_otel-node-filesystem-saturation.json L31, L39-L40.
  {
    signal: 'k8s.node.filesystem_usage',
    subtypes: ['k8s.node'],
    metricType: 'gauge',
    unit: 'ratio',
    contextColumns: [],
    hint: { comparison: '>', threshold: 0.85, window: '15 minutes' },
    variants: [
      {
        schema: 'ecs',
        dataset: 'kubernetes.node',
        field: 'kubernetes.node.fs.used.bytes',
        denominatorField: 'kubernetes.node.fs.capacity.bytes',
        formula: 'AVG(kubernetes.node.fs.used.bytes) / AVG(kubernetes.node.fs.capacity.bytes)',
        formulaKind: 'ratio',
        source: nightshiftDefault('OTel template threshold applied to the Elastic Agent field'),
      },
      {
        schema: 'otel',
        dataset: 'kubeletstatsreceiver.otel',
        field: 'k8s.node.filesystem.usage',
        denominatorField: 'k8s.node.filesystem.capacity',
        formula: 'AVG(k8s.node.filesystem.usage) / AVG(k8s.node.filesystem.capacity)',
        formulaKind: 'ratio',
        source: kubernetesOtelRule('kubernetes_otel-node-filesystem-saturation'),
      },
    ],
  },
  // kubernetes_otel/kibana/alerting_rule_template/kubernetes_otel-persistent-volume-space-low.json L31, L39-L40.
  {
    signal: 'k8s.volume.space_low',
    subtypes: ['k8s.namespace'],
    metricType: 'gauge',
    unit: 'ratio',
    contextColumns: [],
    hint: { comparison: '<', threshold: 0.2, window: '15 minutes' },
    additionalEntityFields: [
      { name: 'kubernetes.pod.name', fields: ['kubernetes.pod.name'] },
      { name: 'volume', fields: ['k8s.volume.name', 'kubernetes.volume.name'] },
    ],
    variants: [
      {
        schema: 'ecs',
        dataset: 'kubernetes.volume',
        field: 'kubernetes.volume.fs.available.bytes',
        denominatorField: 'kubernetes.volume.fs.capacity.bytes',
        formula:
          'AVG(kubernetes.volume.fs.available.bytes) / AVG(kubernetes.volume.fs.capacity.bytes)',
        formulaKind: 'ratio',
        source: nightshiftDefault('OTel template threshold applied to the Elastic Agent field'),
      },
      {
        schema: 'otel',
        dataset: 'kubeletstatsreceiver.otel',
        field: 'k8s.volume.available',
        denominatorField: 'k8s.volume.capacity',
        formula: 'AVG(k8s.volume.available) / AVG(k8s.volume.capacity)',
        formulaKind: 'ratio',
        source: kubernetesOtelRule('kubernetes_otel-persistent-volume-space-low'),
      },
    ],
  },
  // system/kibana/alerting_rule_template/system-cpu-utilization.json L15-L18.
  {
    signal: 'host.cpu.utilization',
    subtypes: ['host'],
    metricType: 'gauge',
    unit: 'ratio',
    contextColumns: ['sample_count'],
    hint: {
      comparison: '>=',
      threshold: 0.85,
      window: '5 minutes',
      min_samples: 5,
      sample_column: 'sample_count',
    },
    variants: [
      {
        schema: 'ecs',
        dataset: 'system.cpu',
        field: 'system.cpu.total.norm.pct',
        formula: 'AVG(system.cpu.total.norm.pct)',
        formulaKind: 'average',
        source: systemRule('system-cpu-utilization'),
      },
      {
        schema: 'otel',
        dataset: 'hostmetricsreceiver.otel',
        field: 'metrics.system.cpu.utilization',
        formula: '1 - AVG(metrics.system.cpu.utilization) WHERE state == "idle"',
        formulaKind: 'inverse_average',
        preAggregationFilter: 'state == "idle"',
        source: nightshiftDefault(
          'system template threshold applied to the OTel field; no system OTel template'
        ),
      },
    ],
  },
  // system/kibana/alerting_rule_template/system-memory-utilization.json L15-L18.
  {
    signal: 'host.memory.utilization',
    subtypes: ['host'],
    metricType: 'gauge',
    unit: 'ratio',
    contextColumns: ['sample_count'],
    hint: {
      comparison: '>=',
      threshold: 0.9,
      window: '5 minutes',
      min_samples: 5,
      sample_column: 'sample_count',
    },
    variants: [
      {
        schema: 'ecs',
        dataset: 'system.memory',
        field: 'system.memory.actual.used.pct',
        formula: 'AVG(system.memory.actual.used.pct)',
        formulaKind: 'average',
        source: systemRule('system-memory-utilization'),
      },
      {
        schema: 'otel',
        dataset: 'hostmetricsreceiver.otel',
        field: 'system.memory.utilization',
        formula: 'AVG(system.memory.utilization) WHERE state == "used"',
        formulaKind: 'average',
        preAggregationFilter: 'state == "used"',
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
    metricType: 'gauge',
    unit: 'ratio',
    contextColumns: ['request_count'],
    hint: {
      comparison: '>',
      threshold: 0.05,
      window: '15 minutes',
      min_samples: 20,
      sample_column: 'request_count',
    },
    additionalEntityFields: [{ name: 'transaction.type', fields: ['transaction.type'] }],
    variants: [
      {
        schema: 'ecs',
        dataset: 'apm.service_transaction.1m',
        field: 'event.success_count',
        formula: '1 - SUM(event.success_count) / COUNT(event.success_count)',
        formulaKind: 'error_rate',
        source: nightshiftDefault(
          '5% error rate over at least 20 requests, our example; APM ships no error rate rule template'
        ),
      },
    ],
  },
];
