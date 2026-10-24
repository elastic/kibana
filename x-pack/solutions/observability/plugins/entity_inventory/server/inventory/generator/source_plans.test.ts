/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DynamicSource, EntityDefinitionWithoutId } from '@kbn/entity-store/common';
import { k8sDeploymentFixture, k8sNodeFixture } from '../__fixtures__/definitions';
import { resolveAllAs } from '../__fixtures__/resolved_sources';
import { InventoryDefinitionError } from './errors';
import { assertSafeIndexPattern } from './esql_syntax';
import { planSources } from './source_plans';
import type { ResolvedSource } from './types';
import { MAX_QUERY_PLANS } from './types';

const withSources = (sources: DynamicSource[]): EntityDefinitionWithoutId => ({
  ...k8sNodeFixture,
  dynamic: { sources },
});

const standard = (...names: string[]): ResolvedSource => ({
  indices: names.map((name) => ({ name, mode: 'standard' })),
});

const messageOf = (fn: () => void): string => {
  try {
    fn();
  } catch (error) {
    return (error as Error).message;
  }
  throw new Error('expected the call to throw');
};

describe('planSources', () => {
  it('returns one plan per single-mode source of k8s.deployment, in definition order', () => {
    const resolved: ResolvedSource[] = [
      {
        indices: [
          {
            name: '.ds-metrics-kubeletstatsreceiver.otel-default-2026.10.19-000002',
            mode: 'time_series',
          },
          {
            name: '.ds-metrics-kubeletstatsreceiver.otel-default-2026.10.18-000001',
            mode: 'time_series',
          },
        ],
      },
      standard('.ds-metrics-kubernetes.state_deployment-default-2026.10.19-000001'),
    ];
    expect(planSources(k8sDeploymentFixture, resolved)).toEqual([
      {
        index: 0,
        sourceIndex: 0,
        indexPattern: 'metrics-kubeletstatsreceiver.otel-default',
        indices: [
          '.ds-metrics-kubeletstatsreceiver.otel-default-2026.10.18-000001',
          '.ds-metrics-kubeletstatsreceiver.otel-default-2026.10.19-000002',
        ],
        queryTarget: 'pattern',
        attributes: [{ name: 'cluster', field: 'orchestrator.cluster.name' }],
        engine: 'TS',
      },
      {
        index: 1,
        sourceIndex: 1,
        indexPattern: 'metrics-kubernetes.state_deployment-*',
        indices: ['.ds-metrics-kubernetes.state_deployment-default-2026.10.19-000001'],
        queryTarget: 'pattern',
        filter: 'metricset.name == "state_deployment"',
        attributes: [
          { name: 'cluster', field: 'orchestrator.cluster.name' },
          { name: 'paused', field: 'kubernetes.deployment.paused' },
        ],
        engine: 'FROM',
      },
    ]);
  });

  it('gives a source without attributes an empty attribute list', () => {
    const [plan] = planSources(withSources([{ indexPattern: 'metrics-*' }]), [
      standard('metrics-a'),
    ]);
    expect(plan.attributes).toEqual([]);
    expect(plan).not.toHaveProperty('filter');
  });

  it('throws when the resolved sources do not match the sources', () => {
    const resolved = [standard('metrics-a')];
    expect(() => planSources(k8sDeploymentFixture, resolved)).toThrow(InventoryDefinitionError);
    expect(() => planSources(k8sDeploymentFixture, resolved)).toThrow(
      'definition "k8s.deployment" has 2 sources but 1 resolved sources were given'
    );
  });

  it('throws when the definition has no dynamic block', () => {
    const { dynamic, ...withoutDynamic } = k8sNodeFixture;
    expect(() => planSources(withoutDynamic, [])).toThrow(InventoryDefinitionError);
    expect(() => planSources(withoutDynamic, [])).toThrow(
      'definition "k8s.node" has no dynamic block; the inventory cannot query it'
    );
  });

  it(`throws when the definition expands to more than ${MAX_QUERY_PLANS} plans`, () => {
    // Built directly: the store's schema caps sources at 16, below the plan budget.
    const sources = Array.from(
      { length: MAX_QUERY_PLANS + 1 },
      (_, index): DynamicSource => ({ indexPattern: `metrics-${index}-*` })
    );
    const resolved = sources.map((_, index) => standard(`metrics-${index}-a`));
    expect(() => planSources(withSources(sources), resolved)).toThrow(InventoryDefinitionError);
    expect(() => planSources(withSources(sources), resolved)).toThrow(
      `definition "k8s.node" expands to 33 query plans; at most ${MAX_QUERY_PLANS} are allowed`
    );
  });

  it('throws on an unsafe index pattern with the pattern rule message', () => {
    const indexPattern = 'metrics-* | DROP x';
    const expected = messageOf(() => assertSafeIndexPattern(indexPattern));
    expect(() => planSources(withSources([{ indexPattern }]), [standard('metrics-a')])).toThrow(
      InventoryDefinitionError
    );
    expect(() => planSources(withSources([{ indexPattern }]), [standard('metrics-a')])).toThrow(
      expected
    );
  });

  it('stores the canonical form of a source filter on its plans', () => {
    const [plan] = planSources(
      withSources([{ indexPattern: 'metrics-*', filter: '(state=="idle"  OR  a>1) // note' }]),
      [standard('metrics-a')]
    );
    expect(plan.filter).toBe('(state == "idle" OR a > 1)');
  });

  it('throws on a bad filter with the filter rule message, labelled by the source', () => {
    const indexPattern = 'metrics-*';
    const filter = 'true | LIMIT 1';
    const expected = 'source metrics-* filter must be a single ES|QL expression: ';
    const resolved = [standard('metrics-a')];
    expect(() => planSources(withSources([{ indexPattern, filter }]), resolved)).toThrow(
      InventoryDefinitionError
    );
    expect(() => planSources(withSources([{ indexPattern, filter }]), resolved)).toThrow(expected);
  });

  it('splits a mixed source into a TS plan then a FROM plan over its own indices', () => {
    const definition = withSources([
      { indexPattern: 'metrics-a-*', attributes: [{ name: 'os', field: 'host.os.name' }] },
      { indexPattern: 'metrics-*-*', filter: 'service.type == "kubernetes"' },
    ]);
    const plans = planSources(definition, [
      standard('metrics-a-1'),
      {
        indices: [
          { name: '.ds-metrics-kubernetes.event-default-2026.10.19-000001', mode: 'standard' },
          { name: '.ds-metrics-kubernetes.pod-default-2026.10.19-000001', mode: 'time_series' },
          { name: '.ds-metrics-kubernetes.node-default-2026.10.19-000001', mode: 'time_series' },
          { name: 'metrics-legacy-2026', mode: 'standard' },
        ],
      },
    ]);
    expect(plans).toEqual([
      {
        index: 0,
        sourceIndex: 0,
        indexPattern: 'metrics-a-*',
        indices: ['metrics-a-1'],
        queryTarget: 'pattern',
        attributes: [{ name: 'os', field: 'host.os.name' }],
        engine: 'FROM',
      },
      {
        index: 1,
        sourceIndex: 1,
        indexPattern: 'metrics-*-*',
        indices: [
          '.ds-metrics-kubernetes.node-default-2026.10.19-000001',
          '.ds-metrics-kubernetes.pod-default-2026.10.19-000001',
        ],
        queryTarget: 'indices',
        filter: 'service.type == "kubernetes"',
        attributes: [],
        engine: 'TS',
      },
      {
        index: 2,
        sourceIndex: 1,
        indexPattern: 'metrics-*-*',
        indices: ['.ds-metrics-kubernetes.event-default-2026.10.19-000001', 'metrics-legacy-2026'],
        queryTarget: 'indices',
        filter: 'service.type == "kubernetes"',
        attributes: [],
        engine: 'FROM',
      },
    ]);
  });

  it('queries a single-mode source by its pattern under its one engine', () => {
    const plans = planSources(k8sNodeFixture, resolveAllAs(k8sNodeFixture, 'time_series'));
    expect(plans).toHaveLength(1);
    expect(plans[0]).toMatchObject({ engine: 'TS', queryTarget: 'pattern' });
  });

  it('emits no plan for a source without indices and keeps the plan order dense', () => {
    const plans = planSources(k8sDeploymentFixture, [
      { indices: [] },
      standard('.ds-metrics-kubernetes.state_deployment-default-2026.10.19-000001'),
    ]);
    expect(plans.map(({ index, sourceIndex }) => ({ index, sourceIndex }))).toEqual([
      { index: 0, sourceIndex: 1 },
    ]);
  });

  it('lists an index the resolver reported twice once', () => {
    const [plan] = planSources(withSources([{ indexPattern: 'metrics-*' }]), [
      standard('metrics-b', 'metrics-a', 'metrics-b'),
    ]);
    expect(plan.indices).toEqual(['metrics-a', 'metrics-b']);
  });

  it('counts the plans after the split against the budget', () => {
    const half = MAX_QUERY_PLANS / 2;
    const sources = Array.from(
      { length: half + 1 },
      (_, index): DynamicSource => ({ indexPattern: `metrics-${index}-*` })
    );
    const mixed = (index: number): ResolvedSource => ({
      indices: [
        { name: `metrics-${index}-ts`, mode: 'time_series' },
        { name: `metrics-${index}-std`, mode: 'standard' },
      ],
    });
    expect(
      planSources(
        withSources(sources.slice(0, half)),
        sources.slice(0, half).map((_, index) => mixed(index))
      )
    ).toHaveLength(MAX_QUERY_PLANS);
    expect(() =>
      planSources(
        withSources(sources),
        sources.map((_, index) => mixed(index))
      )
    ).toThrow(
      `definition "k8s.node" expands to ${
        MAX_QUERY_PLANS + 2
      } query plans; at most ${MAX_QUERY_PLANS} are allowed`
    );
  });
});
