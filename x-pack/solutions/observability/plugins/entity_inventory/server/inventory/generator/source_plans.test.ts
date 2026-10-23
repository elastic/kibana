/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DynamicSource, EntityDefinitionWithoutId } from '@kbn/entity-store/common';
import { k8sDeploymentFixture, k8sNodeFixture } from '../__fixtures__/definitions';
import { InventoryDefinitionError } from './errors';
import { assertSafeIndexPattern } from './esql_syntax';
import { planSources } from './source_plans';
import type { QueryEngine } from './types';
import { MAX_QUERY_PLANS } from './types';

const withSources = (sources: DynamicSource[]): EntityDefinitionWithoutId => ({
  ...k8sNodeFixture,
  dynamic: { sources },
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
  it('returns one plan per source of k8s.deployment, in definition order', () => {
    expect(planSources(k8sDeploymentFixture, ['TS', 'FROM'])).toEqual([
      {
        index: 0,
        sourceIndex: 0,
        indexPattern: 'metrics-kubeletstatsreceiver.otel-default',
        attributes: [{ name: 'cluster', field: 'orchestrator.cluster.name' }],
        engine: 'TS',
      },
      {
        index: 1,
        sourceIndex: 1,
        indexPattern: 'metrics-kubernetes.state_deployment-*',
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
    const [plan] = planSources(withSources([{ indexPattern: 'metrics-*' }]), ['FROM']);
    expect(plan.attributes).toEqual([]);
    expect(plan).not.toHaveProperty('filter');
  });

  it('throws when the engines do not match the sources', () => {
    expect(() => planSources(k8sDeploymentFixture, ['TS'])).toThrow(InventoryDefinitionError);
    expect(() => planSources(k8sDeploymentFixture, ['TS'])).toThrow(
      'definition "k8s.deployment" has 2 sources but 1 engines were given'
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
    const engines = sources.map((): QueryEngine => 'FROM');
    expect(() => planSources(withSources(sources), engines)).toThrow(InventoryDefinitionError);
    expect(() => planSources(withSources(sources), engines)).toThrow(
      `definition "k8s.node" expands to 33 query plans; at most ${MAX_QUERY_PLANS} are allowed`
    );
  });

  it('throws on an unsafe index pattern with the pattern rule message', () => {
    const indexPattern = 'metrics-* | DROP x';
    const expected = messageOf(() => assertSafeIndexPattern(indexPattern));
    expect(() => planSources(withSources([{ indexPattern }]), ['FROM'])).toThrow(
      InventoryDefinitionError
    );
    expect(() => planSources(withSources([{ indexPattern }]), ['FROM'])).toThrow(expected);
  });

  it('throws on a bad filter with the filter rule message, labelled by the source', () => {
    const indexPattern = 'metrics-*';
    const filter = 'true | LIMIT 1';
    expect(() => planSources(withSources([{ indexPattern, filter }]), ['FROM'])).toThrow(
      InventoryDefinitionError
    );
    expect(() => planSources(withSources([{ indexPattern, filter }]), ['FROM'])).toThrow(
      'source metrics-* filter must be a single ES|QL expression: '
    );
  });

  it('stores the canonical form of a source filter on its plan', () => {
    const [plan] = planSources(
      withSources([{ indexPattern: 'metrics-*', filter: '(state=="idle"  OR  a>1) // note' }]),
      ['FROM']
    );
    expect(plan.filter).toBe('(state == "idle" OR a > 1)');
  });
});
