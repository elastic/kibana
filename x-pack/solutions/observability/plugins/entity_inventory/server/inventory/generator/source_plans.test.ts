/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DynamicSource, EntityDefinitionWithoutId } from '@kbn/entity-store/common';
import { k8sDeploymentFixture, k8sNodeFixture } from '../__fixtures__/definitions';
import { probeAllAs } from '../__fixtures__/source_probes';
import { InventoryDefinitionError } from './errors';
import { assertSafeIndexPattern } from './esql_syntax';
import { planSources } from './source_plans';
import type { SourceProbe } from './types';
import { MAX_QUERY_PLANS } from './types';

const withSources = (sources: DynamicSource[]): EntityDefinitionWithoutId => ({
  ...k8sNodeFixture,
  dynamic: { sources },
});

const TIME_SERIES: SourceProbe = { hasTimeSeries: true };
const NO_TIME_SERIES: SourceProbe = { hasTimeSeries: false };

const messageOf = (fn: () => void): string => {
  try {
    fn();
  } catch (error) {
    return (error as Error).message;
  }
  throw new Error('expected the call to throw');
};

describe('planSources', () => {
  it('gives a source with a time-series index a TS plan then a FROM plan, numbered across sources', () => {
    expect(planSources(k8sDeploymentFixture, [TIME_SERIES, NO_TIME_SERIES])).toEqual([
      {
        index: 0,
        sourceIndex: 0,
        indexPattern: 'metrics-kubeletstatsreceiver.otel-default',
        attributes: [{ name: 'cluster', field: 'orchestrator.cluster.name' }],
        engine: 'TS',
      },
      {
        index: 1,
        sourceIndex: 0,
        indexPattern: 'metrics-kubeletstatsreceiver.otel-default',
        attributes: [{ name: 'cluster', field: 'orchestrator.cluster.name' }],
        engine: 'FROM',
      },
      {
        index: 2,
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

  it('gives a source without a time-series index only a FROM plan', () => {
    const plans = planSources(k8sDeploymentFixture, probeAllAs(k8sDeploymentFixture, false));
    expect(plans.map(({ index, sourceIndex, engine }) => ({ index, sourceIndex, engine }))).toEqual(
      [
        { index: 0, sourceIndex: 0, engine: 'FROM' },
        { index: 1, sourceIndex: 1, engine: 'FROM' },
      ]
    );
  });

  it('numbers the plans in order when a later source has a time-series index', () => {
    const plans = planSources(k8sDeploymentFixture, [NO_TIME_SERIES, TIME_SERIES]);
    expect(plans.map(({ index, sourceIndex, engine }) => ({ index, sourceIndex, engine }))).toEqual(
      [
        { index: 0, sourceIndex: 0, engine: 'FROM' },
        { index: 1, sourceIndex: 1, engine: 'TS' },
        { index: 2, sourceIndex: 1, engine: 'FROM' },
      ]
    );
  });

  it('gives a source without attributes an empty attribute list', () => {
    const [plan] = planSources(withSources([{ indexPattern: 'metrics-*' }]), [NO_TIME_SERIES]);
    expect(plan.attributes).toEqual([]);
    expect(plan).not.toHaveProperty('filter');
  });

  it('throws when the probes do not match the sources', () => {
    const probes = [TIME_SERIES];
    expect(() => planSources(k8sDeploymentFixture, probes)).toThrow(InventoryDefinitionError);
    expect(() => planSources(k8sDeploymentFixture, probes)).toThrow(
      'definition "k8s.deployment" has 2 sources but 1 probes were given'
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
    const probes = sources.map(() => NO_TIME_SERIES);
    expect(() => planSources(withSources(sources), probes)).toThrow(InventoryDefinitionError);
    expect(() => planSources(withSources(sources), probes)).toThrow(
      `definition "k8s.node" expands to 33 query plans; at most ${MAX_QUERY_PLANS} are allowed`
    );
  });

  it('throws on an unsafe index pattern with the pattern rule message', () => {
    const indexPattern = 'metrics-* | DROP x';
    const expected = messageOf(() => assertSafeIndexPattern(indexPattern));
    expect(() => planSources(withSources([{ indexPattern }]), [NO_TIME_SERIES])).toThrow(
      InventoryDefinitionError
    );
    expect(() => planSources(withSources([{ indexPattern }]), [NO_TIME_SERIES])).toThrow(expected);
  });

  it('stores the canonical form of a source filter on every plan of the source', () => {
    const plans = planSources(
      withSources([{ indexPattern: 'metrics-*', filter: '(state=="idle"  OR  a>1) // note' }]),
      [TIME_SERIES]
    );
    expect(plans.map(({ filter }) => filter)).toEqual([
      '(state == "idle" OR a > 1)',
      '(state == "idle" OR a > 1)',
    ]);
  });

  it('throws on a bad filter with the filter rule message, labelled by the source', () => {
    const indexPattern = 'metrics-*';
    const filter = 'true | LIMIT 1';
    const expected = 'source metrics-* filter must be a single ES|QL expression: ';
    const probes = [NO_TIME_SERIES];
    expect(() => planSources(withSources([{ indexPattern, filter }]), probes)).toThrow(
      InventoryDefinitionError
    );
    expect(() => planSources(withSources([{ indexPattern, filter }]), probes)).toThrow(expected);
  });

  it('counts the plans after the split against the budget', () => {
    const half = MAX_QUERY_PLANS / 2;
    const sources = Array.from(
      { length: half + 1 },
      (_, index): DynamicSource => ({ indexPattern: `metrics-${index}-*` })
    );
    expect(
      planSources(
        withSources(sources.slice(0, half)),
        sources.slice(0, half).map(() => TIME_SERIES)
      )
    ).toHaveLength(MAX_QUERY_PLANS);
    expect(() =>
      planSources(
        withSources(sources),
        sources.map(() => TIME_SERIES)
      )
    ).toThrow(
      `definition "k8s.node" expands to ${
        MAX_QUERY_PLANS + 2
      } query plans; at most ${MAX_QUERY_PLANS} are allowed`
    );
  });
});
