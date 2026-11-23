/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Parser } from '@elastic/esql';
import {
  buildMeasurementDefinitions,
  type MetricsTypeKnowledgeIndicator,
} from './build_measurement_definitions';
import type { SignalFieldPresence } from './check_signal_fields';
import { renderSignalQuery, type SignalQueryRenderPlan } from './render_signal_query';
import { SIGNAL_TEMPLATES } from './signal_templates';
import { getSignalVariantFields } from './types';
import type { SignalTemplate, SignalTemplateVariant } from './types';

const SOURCE_ID = 'source-id';
const PREVIEW_RANGE = {
  from: '2026-11-23T09:45:00.000Z',
  to: '2026-11-23T10:00:00.000Z',
};

const BREAKDOWN_BY_SUBTYPE: Record<string, string[]> = {
  'k8s.namespace': ['orchestrator.cluster.name', 'kubernetes.namespace'],
  'k8s.node': ['orchestrator.cluster.name', 'kubernetes.node.name'],
  host: ['host.name'],
  service: ['service.name'],
};

const getBreakdown = (subtype: string): string[] =>
  BREAKDOWN_BY_SUBTYPE[subtype] ?? [
    'orchestrator.cluster.name',
    'kubernetes.namespace',
    'kubernetes.deployment.name',
  ];

const createTypeKI = (subtype: string): MetricsTypeKnowledgeIndicator => ({
  id: `${subtype}:${SOURCE_ID}`,
  uuid: `${subtype}-uuid`,
  source_id: SOURCE_ID,
  type: subtype === 'service' ? 'entity' : 'infrastructure',
  subtype,
  description: subtype,
  properties: { origin: 'metrics', breakdown: getBreakdown(subtype), list_query: 'FROM metrics-*' },
  confidence: 100,
  filter: { field: 'data_stream.dataset', eq: 'kubernetes.container' },
});

const createPresence = (variant: SignalTemplateVariant): SignalFieldPresence => ({
  dataset: variant.dataset,
  fields: new Set(getSignalVariantFields(variant)),
});

const getTemplate = (signal: string): SignalTemplate => {
  const template = SIGNAL_TEMPLATES.find((candidate) => candidate.signal === signal);
  if (!template) {
    throw new Error(`Template ${signal} is missing`);
  }
  return template;
};

const getVariant = (template: SignalTemplate, schema: 'ecs' | 'otel'): SignalTemplateVariant => {
  const variant = template.variants.find((candidate) => candidate.schema === schema);
  if (!variant) {
    throw new Error(`Template ${template.signal} has no ${schema} variant`);
  }
  return variant;
};

const build = (
  subtypes: string[],
  template: SignalTemplate,
  fieldPresence: SignalFieldPresence[]
): ReturnType<typeof buildMeasurementDefinitions> =>
  buildMeasurementDefinitions({
    esql: 'FROM metrics-*',
    typeKIs: subtypes.map(createTypeKI),
    templates: [template],
    fieldPresence,
  });

const renderPreview = (plan: SignalQueryRenderPlan): string =>
  renderSignalQuery({ ...plan, perMinute: true, timeRange: PREVIEW_RANGE }).esql;

describe('buildMeasurementDefinitions', () => {
  it('skips a template whose fields have no data', () => {
    const { definitions, skipped } = build(['service'], getTemplate('service.error_rate'), []);

    expect(definitions).toEqual([]);
    expect(skipped).toEqual([
      expect.objectContaining({
        signal: 'service.error_rate',
        reason: expect.stringContaining('No ECS or OTel template field has data'),
      }),
    ]);
  });

  it('renders a stored definition with only entity grouping and one output value column', () => {
    const template = getTemplate('host.cpu.utilization');
    const { definitions } = build(['host'], template, [
      createPresence(getVariant(template, 'ecs')),
    ]);

    expect(definitions).toHaveLength(1);
    const [definition] = definitions;
    expect(definition.entity_type).toBe('host');
    expect(definition.entity_fields).toEqual(['host.name']);
    expect(definition.value_column).toBe('value');
    expect(definition.esql).not.toContain('@timestamp');
    expect(definition.esql).not.toContain('BUCKET(');
    expect(definition.esql).toContain('BY host.name');
    expect(definition.esql).toContain('| KEEP host.name, value, sample_count');
    expect(definition.esql).not.toContain('sample_count >=');
  });

  it('measures ECS only and OTel only gauge entities in one definition', () => {
    const template = getTemplate('host.cpu.utilization');
    const ecs = getVariant(template, 'ecs');
    const otel = getVariant(template, 'otel');
    const { definitions } = build(['host'], template, [createPresence(ecs), createPresence(otel)]);

    expect(definitions).toHaveLength(1);
    const [definition] = definitions;
    expect(definition.measurements.map(({ schema }) => schema)).toEqual(['otel', 'ecs']);
    expect(definition.esql).toContain(`data_stream.dataset == "${otel.dataset}"`);
    expect(definition.esql).toContain(`data_stream.dataset == "${ecs.dataset}"`);
    expect(definition.esql).toContain('value = COALESCE(value_0, value_1)');
    expect(definition.esql).toContain(
      'sample_count = CASE(value_0 IS NOT NULL, sample_count_0, value_1 IS NOT NULL, sample_count_1, NULL)'
    );
  });

  it('normalises ECS only and OTel only state entities to one or zero', () => {
    const template = getTemplate('k8s.node.not_ready');
    const { definitions } = build(['k8s.node'], template, template.variants.map(createPresence));

    expect(definitions).toHaveLength(1);
    const [definition] = definitions;
    expect(definition.metric_type).toBe('state');
    expect(definition.hint).toEqual(expect.objectContaining({ comparison: '==', threshold: 1 }));
    expect(definition.esql).toContain(
      'value_0 = CASE(minimum_0 IS NULL, NULL, minimum_0 < 1, 1, 0)'
    );
    expect(definition.esql).toContain(
      'MAX(CASE(kubernetes.node.status.ready IS NULL, NULL, kubernetes.node.status.ready IN ("false", "unknown"), 1, 0))'
    );
    expect(definition.esql).toContain('value = COALESCE(value_0, value_1)');

    const pressureTemplate = getTemplate('k8s.node.memory_pressure');
    const { definitions: pressureDefinitions } = build(
      ['k8s.node'],
      pressureTemplate,
      pressureTemplate.variants.map(createPresence)
    );
    expect(pressureDefinitions[0].esql).toContain('k8s.node.condition_memory_pressure >= 0');
  });

  it('measures containers before workloads and names the worst container', () => {
    const template = getTemplate('k8s.container.cpu_vs_limit');
    const { definitions } = build(
      ['k8s.deployment'],
      template,
      template.variants.map(createPresence)
    );

    const [definition] = definitions;
    expect(definition.entity_fields).toEqual([
      'orchestrator.cluster.name',
      'kubernetes.namespace',
      'workload',
    ]);
    expect(definition.context_columns).toEqual(['worst_container']);
    expect(definition.esql).toContain('| STATS container_value_0 = AVG(');
    expect(definition.esql).toContain(
      'BY orchestrator.cluster.name, kubernetes.namespace, workload, kubernetes.pod.name, kubernetes.container.name'
    );
    expect(definition.esql).toContain('| INLINE STATS max_container_value = MAX(container_value)');
    expect(definition.esql).toContain('worst_container = MIN(container)');
  });

  it('adds the preview range and puts the minute bucket first in every grouping', () => {
    const template = getTemplate('k8s.container.memory_vs_limit');
    const { definitions, previewPlans } = build(
      ['k8s.deployment'],
      template,
      template.variants.map(createPresence)
    );
    const previewQuery = renderPreview(previewPlans[0]);
    const groupings = [...previewQuery.matchAll(/\n  BY ([^\n]+)/g)].map((match) => match[1]);
    const perMinuteGroupings = [...definitions[0].esql_per_minute.matchAll(/\n  BY ([^\n]+)/g)].map(
      (match) => match[1]
    );

    expect(definitions[0].esql).not.toContain('minute');
    expect({
      hasTimestampFilter: definitions[0].esql_per_minute.includes('@timestamp >='),
      firstGrouping: perMinuteGroupings[0],
      laterGroupingsStartWithMinute: perMinuteGroupings
        .slice(1)
        .every((grouping) => grouping.startsWith('minute, ')),
      keepsMinute: definitions[0].esql_per_minute.includes('| KEEP minute, '),
    }).toEqual({
      hasTimestampFilter: false,
      firstGrouping:
        'minute = BUCKET(@timestamp, 1 minute), orchestrator.cluster.name, kubernetes.namespace, workload, kubernetes.pod.name, kubernetes.container.name',
      laterGroupingsStartWithMinute: true,
      keepsMinute: true,
    });
    expect(previewQuery).toContain(
      '| WHERE @timestamp >= "2026-11-23T09:45:00.000Z"\n    AND @timestamp < "2026-11-23T10:00:00.000Z"'
    );
    expect(groupings).toHaveLength(4);
    expect(groupings[0]).toMatch(/^minute = BUCKET\(@timestamp, 1 minute\), /);
    expect(groupings.slice(1, 3).every((grouping) => grouping.startsWith('minute, '))).toBe(true);
    expect(groupings[3]).toBe('orchestrator.cluster.name, kubernetes.namespace, workload');
    expect(previewQuery).toContain('| KEEP minute, ');
    expect(previewQuery).toContain('| INLINE STATS rank_value = MAX(value)');
    expect(previewQuery).toContain('| SORT rank_value DESC, ');
    expect(previewQuery).toContain('| LIMIT 160');
  });

  it('ships ten signals without restarts or OOM kills', () => {
    expect(SIGNAL_TEMPLATES).toHaveLength(10);
    expect(SIGNAL_TEMPLATES.map(({ signal }) => signal)).not.toEqual(
      expect.arrayContaining(['k8s.container.restarts', 'k8s.container.oom_killed'])
    );
  });

  it('renders parseable stored and preview queries for every available schema set', () => {
    const fieldPresenceSets = SIGNAL_TEMPLATES.flatMap((template) => [
      ...template.variants.map((variant) => ({ template, presence: [createPresence(variant)] })),
      { template, presence: template.variants.map(createPresence) },
    ]);

    fieldPresenceSets.forEach(({ template, presence }) => {
      const { definitions, previewPlans } = build([template.subtypes[0]], template, presence);
      expect(definitions).toHaveLength(1);
      const [definition] = definitions;
      expect(Parser.parse(definition.esql).errors).toEqual([]);
      expect(Parser.parse(definition.esql_per_minute).errors).toEqual([]);
      expect(Parser.parse(renderPreview(previewPlans[0])).errors).toEqual([]);
    });
  });
});
