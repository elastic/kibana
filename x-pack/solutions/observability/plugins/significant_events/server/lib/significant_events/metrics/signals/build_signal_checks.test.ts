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
import { getSignalVariantFields } from './types';
import type { SignalTemplate, SignalTemplateVariant } from './types';

const createTypeKI = ({
  id,
  subtype,
  breakdown,
}: {
  id: string;
  subtype: string;
  breakdown: string[];
}): MetricsTypeKnowledgeIndicator => {
  const filter: Condition = { field: 'data_stream.dataset', eq: 'kubernetes.container' };
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
  if (subtype === 'k8s.namespace') {
    return ['orchestrator.cluster.name', 'kubernetes.namespace'];
  }
  if (subtype.startsWith('k8s.') && subtype !== 'k8s.node') {
    return ['orchestrator.cluster.name', 'kubernetes.namespace', 'kubernetes.deployment.name'];
  }
  if (subtype === 'k8s.node') {
    return ['orchestrator.cluster.name', 'kubernetes.node.name'];
  }
  return [subtype === 'host' ? 'host.name' : 'service.name'];
};

const createPresence = (variant: SignalTemplateVariant, cluster?: string): SignalFieldPresence => ({
  dataset: variant.dataset,
  cluster,
  fields: new Set(getSignalVariantFields(variant)),
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

  it('picks ECS or OTel per cluster inside one source and counts each cluster once', () => {
    const cpuTemplate = SIGNAL_TEMPLATES.find(
      ({ signal }) => signal === 'k8s.container.cpu_vs_limit'
    );
    if (!cpuTemplate) {
      throw new Error('Container CPU template is missing');
    }
    const [ecs, otel] = cpuTemplate.variants;

    const { checks } = buildSignalChecks({
      esql: 'FROM metrics-*',
      typeKIs: [
        createTypeKI({
          id: 'k8s.deployments:source-id',
          subtype: 'k8s.deployment',
          breakdown: getBreakdown('k8s.deployment'),
        }),
      ],
      templates: [cpuTemplate],
      fieldPresence: [
        createPresence(ecs, 'cluster-a'),
        createPresence(ecs, 'cluster-b'),
        createPresence(otel, 'cluster-b'),
      ],
    });

    expect(checks.map(({ type_ki_id: id, schema, scope }) => ({ id, schema, scope }))).toEqual([
      { id: 'k8s.deployments:source-id', schema: 'otel', scope: undefined },
      {
        id: 'k8s.deployments:source-id',
        schema: 'ecs',
        scope: { not: { field: 'orchestrator.cluster.name', eq: 'cluster-b' } },
      },
    ]);
  });

  it('runs host checks on the Hosts KI only', () => {
    const cpuTemplate = SIGNAL_TEMPLATES.find(({ signal }) => signal === 'host.cpu.utilization');
    if (!cpuTemplate) {
      throw new Error('Host CPU template is missing');
    }
    const [ecs] = cpuTemplate.variants;

    const { checks } = buildSignalChecks({
      esql: 'FROM metrics-*',
      typeKIs: [
        createTypeKI({ id: 'hosts:source-id', subtype: 'host', breakdown: ['host.name'] }),
        createTypeKI({
          id: 'k8s.nodes:source-id',
          subtype: 'k8s.node',
          breakdown: getBreakdown('k8s.node'),
        }),
      ],
      templates: [cpuTemplate],
      fieldPresence: [createPresence(ecs, 'cluster-a')],
    });

    expect(checks).toEqual([
      expect.objectContaining({
        type_ki_id: 'hosts:source-id',
        breakdown: ['host.name'],
        esql_preview: expect.stringContaining('BY host.name'),
      }),
    ]);
  });

  it('records source provenance for every template variant', () => {
    SIGNAL_TEMPLATES.forEach(({ variants }) => {
      variants.forEach(({ source }) => {
        expect(source).toBeDefined();
        if (source.kind === 'integration_rule_template') {
          expect(source.integration).not.toBe('');
          expect(source.integrationVersion).not.toBe('');
          expect(source.ruleTemplateId).not.toBe('');
        }
      });
    });
  });

  it('casts both sides of ratio previews to double', () => {
    const filesystemTemplate = SIGNAL_TEMPLATES.find(
      ({ signal }) => signal === 'k8s.node.filesystem_usage'
    );
    if (!filesystemTemplate) {
      throw new Error('Node filesystem template is missing');
    }
    const [ecs] = filesystemTemplate.variants;
    const [check] = buildSignalChecks({
      esql: 'FROM metrics-*',
      typeKIs: [
        createTypeKI({
          id: 'k8s.nodes:source-id',
          subtype: 'k8s.node',
          breakdown: getBreakdown('k8s.node'),
        }),
      ],
      templates: [filesystemTemplate],
      fieldPresence: [createPresence(ecs, 'cluster-a')],
    }).checks;

    expect(check.esql_preview).toContain(
      'TO_DOUBLE(numerator_value) / TO_DOUBLE(denominator_value)'
    );
  });

  it('renders ES|QL previews that parse for every template variant', () => {
    const checks = SIGNAL_TEMPLATES.flatMap((template: SignalTemplate) =>
      template.variants.flatMap((variant) => {
        const [subtype] = template.subtypes;
        return buildSignalChecks({
          esql: 'FROM metrics-*',
          typeKIs: [
            createTypeKI({
              id: `${template.signal}:${variant.schema}`,
              subtype,
              breakdown: getBreakdown(subtype),
            }),
          ],
          templates: [template],
          fieldPresence: [createPresence(variant, 'cluster-a')],
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
      id: 'k8s.deployments:source-id',
      subtype: 'k8s.deployment',
      breakdown: getBreakdown('k8s.deployment'),
    });

    const { checks } = buildSignalChecks({
      esql: 'FROM metrics-*',
      typeKIs: [typeKI],
      templates: [cpuTemplate],
      fieldPresence: [createPresence(ecs, 'cluster-a')],
    });
    const [check] = checks;

    expect(check.breakdown).toEqual([
      'orchestrator.cluster.name',
      'kubernetes.namespace',
      'workload',
    ]);
    expect(check.esql_preview).toContain(
      'BY orchestrator.cluster.name, kubernetes.namespace, workload'
    );
  });
});
