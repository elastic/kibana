/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Parser } from '@elastic/esql';
import { buildSignalChecks, type MetricsTypeKnowledgeIndicator } from './build_signal_checks';
import type { SignalFieldPresence } from './check_signal_fields';
import { SIGNAL_TEMPLATES } from './signal_templates';
import { getSignalVariantFields } from './types';
import type { SignalTemplate, SignalTemplateVariant } from './types';

const SOURCE_ID = 'source-id';

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

const createPresence = (variant: SignalTemplateVariant, cluster?: string): SignalFieldPresence => ({
  dataset: variant.dataset,
  cluster,
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
): ReturnType<typeof buildSignalChecks> =>
  buildSignalChecks({
    esql: 'FROM metrics-*',
    typeKIs: subtypes.map(createTypeKI),
    templates: [template],
    fieldPresence,
  });

describe('buildSignalChecks', () => {
  it('skips a template whose fields have no data', () => {
    const { checks, skipped } = build(['service'], getTemplate('service.error_rate'), []);

    expect(checks).toEqual([]);
    expect(skipped).toEqual([
      expect.objectContaining({
        signal: 'service.error_rate',
        reason: expect.stringContaining('No ECS or OTel template field has data'),
      }),
    ]);
  });

  it('keeps a near limit container visible next to healthy containers of the same workload', () => {
    const template = getTemplate('k8s.container.memory_vs_limit');
    const [check] = build(['k8s.deployment'], template, [
      createPresence(getVariant(template, 'ecs'), 'cluster-a'),
    ]).checks;

    expect(check.esql_preview).toContain(
      'BY orchestrator.cluster.name, kubernetes.namespace, workload, kubernetes.pod.name, kubernetes.container.name'
    );
    expect(check.esql_preview).toContain('| STATS signal_value = MAX(container_value)');
    expect(check.esql_preview).toContain('WHERE container_value > 0.9');
  });

  it('measures ECS only and OTel only hosts in one check that prefers OTel per host', () => {
    const template = getTemplate('host.cpu.utilization');
    const ecs = getVariant(template, 'ecs');
    const otel = getVariant(template, 'otel');

    const { checks } = build(['host'], template, [createPresence(ecs), createPresence(otel)]);

    expect(checks).toHaveLength(1);
    const [check] = checks;
    expect(check.measurements.map(({ schema }) => schema)).toEqual(['otel', 'ecs']);
    expect(check.scope).toBeUndefined();
    expect(check.esql_preview).toContain(`data_stream.dataset == "${ecs.dataset}"`);
    expect(check.esql_preview).toContain(`data_stream.dataset == "${otel.dataset}"`);
    expect(check.esql_preview).toContain(
      'signal_value = CASE(samples_0 >= 5, 1 - average_0, average_1)'
    );
  });

  it('builds OOM checks from restart data and prefers a schema with termination reasons', () => {
    const template = getTemplate('k8s.container.oom_killed');
    const { checks: restartOnlyChecks } = build(['k8s.deployment'], template, [
      {
        dataset: 'kubernetes.state_container',
        fields: new Set(['kubernetes.container.status.restarts']),
      },
    ]);

    expect(restartOnlyChecks).toHaveLength(1);
    const [restartOnlyCheck] = restartOnlyChecks;
    expect(restartOnlyCheck.measurements.map(({ schema }) => schema)).toEqual(['ecs']);
    expect(restartOnlyCheck.esql_preview).toContain(
      'kubernetes.pod.uid, kubernetes.container.name, restart_level = kubernetes.container.status.restarts'
    );
    expect(restartOnlyCheck.esql_preview).toContain('WHERE oom_samples > 0');
    expect(restartOnlyCheck.esql_preview).toContain('| WHERE oom_level > min_restarts');

    const { checks: preferredChecks } = build(['k8s.deployment'], template, [
      {
        dataset: 'kubernetes.state_container',
        cluster: 'cluster-a',
        fields: new Set([
          'kubernetes.container.status.restarts',
          'kubernetes.container.status.last_terminated_reason',
        ]),
      },
      {
        dataset: 'k8sclusterreceiver.otel',
        cluster: 'cluster-a',
        fields: new Set(['k8s.container.restarts']),
      },
    ]);

    expect(preferredChecks).toHaveLength(1);
    expect(preferredChecks[0].measurements.map(({ schema }) => schema)).toEqual(['ecs']);
  });

  it('splits formulas that cannot merge by cluster and counts each cluster once', () => {
    const template = getTemplate('k8s.container.restarts');
    const ecs = getVariant(template, 'ecs');
    const otel = getVariant(template, 'otel');

    const { checks } = build(['k8s.deployment'], template, [
      createPresence(ecs, 'cluster-a'),
      createPresence(ecs, 'cluster-b'),
      createPresence(otel, 'cluster-b'),
    ]);

    expect(
      checks.map(({ measurements, scope }) => ({ schema: measurements[0].schema, scope }))
    ).toEqual([
      { schema: 'otel', scope: undefined },
      { schema: 'ecs', scope: { not: { field: 'orchestrator.cluster.name', eq: 'cluster-b' } } },
    ]);
  });

  it('runs host checks on the Hosts KI only', () => {
    const template = getTemplate('host.cpu.utilization');
    const { checks } = build(['host', 'k8s.node'], template, [
      createPresence(getVariant(template, 'ecs'), 'cluster-a'),
    ]);

    expect(checks).toEqual([
      expect.objectContaining({ type_ki_id: `host:${SOURCE_ID}`, breakdown: ['host.name'] }),
    ]);
  });

  it('groups workloads by cluster, namespace and derived owner', () => {
    const template = getTemplate('k8s.container.cpu_vs_limit');
    const [check] = build(['k8s.deployment'], template, [
      createPresence(getVariant(template, 'ecs'), 'cluster-a'),
    ]).checks;

    expect(check.breakdown).toEqual([
      'orchestrator.cluster.name',
      'kubernetes.namespace',
      'workload',
    ]);
    expect(check.esql_preview).toContain('| WHERE kind == "deployment"');
  });

  it('casts both sides of ratio previews to double', () => {
    const template = getTemplate('k8s.node.filesystem_usage');
    const [check] = build(['k8s.node'], template, [
      createPresence(getVariant(template, 'ecs'), 'cluster-a'),
    ]).checks;

    expect(check.esql_preview).toContain(
      'TO_DOUBLE(numerator_value) / TO_DOUBLE(denominator_value)'
    );
  });

  it('records source provenance for every template variant', () => {
    SIGNAL_TEMPLATES.flatMap(({ variants }) => variants).forEach(({ source }) => {
      if (source.kind === 'integration_rule_template') {
        expect(source.integration).not.toBe('');
        expect(source.integrationVersion).not.toBe('');
        expect(source.ruleTemplateId).not.toBe('');
      }
    });
  });

  it('renders parseable previews for every variant alone and for all variants together', () => {
    const fieldPresenceSets = SIGNAL_TEMPLATES.flatMap((template) => [
      ...template.variants.map((variant) => ({ template, presence: [createPresence(variant)] })),
      { template, presence: template.variants.map((variant) => createPresence(variant)) },
    ]);

    fieldPresenceSets.forEach(({ template, presence }) => {
      const { checks } = build([template.subtypes[0]], template, presence);
      expect(checks.length).toBeGreaterThan(0);
      checks.forEach(({ esql_preview: esqlPreview }) => {
        expect(Parser.parse(esqlPreview).errors).toEqual([]);
        expect(esqlPreview).toContain('| WHERE @timestamp >= NOW() - ');
        expect(esqlPreview).not.toContain('\n\n');
      });
    });
  });
});
