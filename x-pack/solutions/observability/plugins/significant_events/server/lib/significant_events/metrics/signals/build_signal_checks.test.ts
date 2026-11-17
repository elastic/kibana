/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Parser } from '@elastic/esql';
import type { Condition } from '@kbn/streamlang';
import { buildSignalChecks, type MetricsTypeKnowledgeIndicator } from './build_signal_checks';
import type { SignalFieldPresence } from './check_signal_fields';
import { SIGNAL_TEMPLATES } from './signal_templates';
import type { SignalTemplate, SignalTemplateVariant } from './types';

const createTypeKI = ({
  id,
  subtype,
  breakdown,
  cluster,
}: {
  id: string;
  subtype: string;
  breakdown: string[];
  cluster?: string;
}): MetricsTypeKnowledgeIndicator => {
  const filter: Condition =
    cluster === undefined
      ? { always: {} }
      : { and: [{ field: 'orchestrator.cluster.name', eq: cluster }] };
  const feature: MetricsTypeKnowledgeIndicator = {
    id,
    uuid: `${id}-uuid`,
    source_id: 'source-id',
    type: subtype === 'service' ? 'entity' : 'infrastructure',
    subtype,
    description: id,
    properties: { origin: 'metrics', breakdown, list_query: 'FROM metrics-*' },
    confidence: 100,
    filter,
  };
  return feature;
};

const getBreakdown = (subtype: string): string[] => {
  if (subtype.startsWith('k8s.') && subtype !== 'k8s.node') {
    return ['kubernetes.namespace', 'kubernetes.deployment.name'];
  }
  if (subtype === 'k8s.node') {
    return ['kubernetes.node.name'];
  }
  return [subtype === 'host' ? 'host.name' : 'service.name'];
};

const createPresence = (variant: SignalTemplateVariant, cluster?: string): SignalFieldPresence => ({
  dataset: variant.dataset,
  cluster,
  fields: new Set([variant.field]),
});

describe('buildSignalChecks', () => {
  it('skips a template whose fields have no data', () => {
    const typeKI = createTypeKI({
      id: 'services:source-id',
      subtype: 'service',
      breakdown: ['service.name'],
    });
    const serviceTemplate = SIGNAL_TEMPLATES.find(({ signal }) => signal === 'service.error_rate');
    if (!serviceTemplate) {
      throw new Error('Service error-rate template is missing');
    }

    const result = buildSignalChecks({
      esql: 'FROM metrics-*',
      typeKIs: [typeKI],
      templates: [serviceTemplate],
      fieldPresence: [],
    });

    expect(result.checks).toEqual([]);
    expect(result.skipped).toEqual([
      expect.objectContaining({
        signal: 'service.error_rate',
        type_ki_id: 'services:source-id',
        reason: expect.stringContaining('No ECS or OTel template field has data'),
      }),
    ]);
  });

  it('selects ECS or OTel from field data in each cluster', () => {
    const cpuTemplate = SIGNAL_TEMPLATES.find(
      ({ signal }) => signal === 'k8s.container.cpu_vs_limit'
    );
    if (!cpuTemplate) {
      throw new Error('Container CPU template is missing');
    }
    const [ecs, otel] = cpuTemplate.variants;
    const typeKIs = [
      createTypeKI({
        id: 'k8s.deployments:cluster-a',
        subtype: 'k8s.deployment',
        breakdown: ['kubernetes.namespace', 'kubernetes.deployment.name'],
        cluster: 'cluster-a',
      }),
      createTypeKI({
        id: 'k8s.deployments:cluster-b',
        subtype: 'k8s.deployment',
        breakdown: ['kubernetes.namespace', 'kubernetes.deployment.name'],
        cluster: 'cluster-b',
      }),
    ];

    const { checks } = buildSignalChecks({
      esql: 'FROM metrics-*',
      typeKIs,
      templates: [cpuTemplate],
      fieldPresence: [createPresence(ecs, 'cluster-a'), createPresence(otel, 'cluster-b')],
    });

    expect(checks.map(({ type_ki_id: id, schema }) => ({ id, schema }))).toEqual([
      { id: 'k8s.deployments:cluster-a', schema: 'ecs' },
      { id: 'k8s.deployments:cluster-b', schema: 'otel' },
    ]);
  });

  it('builds a host CPU check for a Kubernetes node KI', () => {
    const cpuTemplate = SIGNAL_TEMPLATES.find(({ signal }) => signal === 'host.cpu.utilization');
    if (!cpuTemplate) {
      throw new Error('Host CPU template is missing');
    }
    const [ecs] = cpuTemplate.variants;
    const typeKI = createTypeKI({
      id: 'k8s.nodes:cluster-a',
      subtype: 'k8s.node',
      breakdown: ['kubernetes.node.name'],
      cluster: 'cluster-a',
    });

    const { checks } = buildSignalChecks({
      esql: 'FROM metrics-*',
      typeKIs: [typeKI],
      templates: [cpuTemplate],
      fieldPresence: [createPresence(ecs, 'cluster-a')],
    });

    expect(checks).toEqual([
      expect.objectContaining({
        signal: 'host.cpu.utilization',
        schema: 'ecs',
        breakdown: ['kubernetes.node.name'],
        esql_preview: expect.stringContaining('BY kubernetes.node.name'),
      }),
    ]);
  });

  it('renders ES|QL previews that parse for every template variant', () => {
    const checks = SIGNAL_TEMPLATES.flatMap((template: SignalTemplate) =>
      template.variants.flatMap((variant, index) => {
        const [subtype] = template.subtypes;
        const cluster = subtype.startsWith('k8s.') ? `cluster-${index}` : undefined;
        return buildSignalChecks({
          esql: 'FROM metrics-*',
          typeKIs: [
            createTypeKI({
              id: `${template.signal}:${variant.schema}`,
              subtype,
              breakdown: getBreakdown(subtype),
              cluster,
            }),
          ],
          templates: [template],
          fieldPresence: [createPresence(variant, cluster)],
        }).checks;
      })
    );

    expect(checks).toHaveLength(
      SIGNAL_TEMPLATES.reduce((count, { variants }) => count + variants.length, 0)
    );
    checks.forEach(({ esql_preview: esqlPreview }) => {
      expect(Parser.parse(esqlPreview).errors).toEqual([]);
      expect(esqlPreview).toContain('| WHERE @timestamp >= NOW() - ');
      expect(esqlPreview).not.toContain('\n\n');
    });
  });

  it('groups workloads by their derived owner', () => {
    const cpuTemplate = SIGNAL_TEMPLATES.find(
      ({ signal }) => signal === 'k8s.container.cpu_vs_limit'
    );
    if (!cpuTemplate) {
      throw new Error('Container CPU template is missing');
    }
    const [ecs] = cpuTemplate.variants;
    const typeKI = createTypeKI({
      id: 'k8s.deployments:cluster-a',
      subtype: 'k8s.deployment',
      breakdown: ['kubernetes.namespace', 'kubernetes.deployment.name'],
      cluster: 'cluster-a',
    });

    const { checks } = buildSignalChecks({
      esql: 'FROM metrics-*',
      typeKIs: [typeKI],
      templates: [cpuTemplate],
      fieldPresence: [createPresence(ecs, 'cluster-a')],
    });
    const [check] = checks;

    expect(check.breakdown).toEqual(['kubernetes.namespace', 'workload']);
    expect(check.esql_preview).toContain(
      'STATS signal_value = AVG(kubernetes.container.cpu.usage.limit.pct) BY kubernetes.namespace, workload'
    );
    expect(check.esql_preview).not.toContain('BY kubernetes.namespace, kubernetes.deployment.name');
  });
});
