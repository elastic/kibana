/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { k8sDeploymentFixture } from '../__fixtures__/definitions';
import { probeAllAs } from '../__fixtures__/source_probes';
import { buildAttributePredicate } from './attribute_filters';
import { buildColumns } from './columns';
import { resolveIdentityPlan } from './identity';
import { planSources } from './source_plans';
import type { OutputColumn } from './columns';
import type { QueryPlan } from './types';

// Plans 0 and 1 read the first source, which declares `cluster`; plans 2 and 3 read the second,
// which declares `cluster` and `paused`.
const plans = planSources(k8sDeploymentFixture, probeAllAs(k8sDeploymentFixture, true));
const identity = resolveIdentityPlan(k8sDeploymentFixture);
const columns = buildColumns(k8sDeploymentFixture, plans, identity);
const [, fromFirstSource, , fromSecondSource] = plans;

const labelledPlan: QueryPlan = {
  index: 0,
  sourceIndex: 0,
  indexPattern: 'metrics-example-*',
  engine: 'FROM',
  attributes: [
    { name: 'phase', field: 'k8s.pod.phase', valueLabels: { '2': 'running', '3': 'pending' } },
  ],
};
const labelledColumns: OutputColumn[] = [
  { name: 'phase', kind: 'attribute', fieldByPlan: { 0: 'k8s.pod.phase' } },
];

describe('buildAttributePredicate', () => {
  it('has no predicate when nothing is selected', () => {
    expect(buildAttributePredicate(fromSecondSource, columns, {})).toEqual({ params: [] });
    expect(buildAttributePredicate(fromSecondSource, columns, { cluster: [] })).toEqual({
      params: [],
    });
  });

  it('reads the selected attribute from the field its source declares, with the values as parameters', () => {
    expect(buildAttributePredicate(fromSecondSource, columns, { cluster: ['eu', 'us'] })).toEqual({
      predicate: 'TO_STRING(`orchestrator.cluster.name`) IN (?a0v0, ?a0v1)',
      params: [{ a0v0: 'eu' }, { a0v1: 'us' }],
    });
  });

  it('requires every selected attribute', () => {
    expect(
      buildAttributePredicate(fromSecondSource, columns, { cluster: ['eu'], paused: ['true'] })
    ).toEqual({
      predicate:
        'TO_STRING(`orchestrator.cluster.name`) IN (?a0v0) AND TO_STRING(`kubernetes.deployment.paused`) IN (?a1v0)',
      params: [{ a0v0: 'eu' }, { a1v0: 'true' }],
    });
  });

  it('reads an identity column from its own field in every plan', () => {
    [fromFirstSource, fromSecondSource].forEach((plan) => {
      expect(
        buildAttributePredicate(plan, columns, { 'kubernetes.namespace': ['default'] })
      ).toEqual({
        predicate: 'TO_STRING(`kubernetes.namespace`) IN (?a0v0)',
        params: [{ a0v0: 'default' }],
      });
    });
  });

  it('cannot match when the plan carries no field for a selected attribute', () => {
    expect(buildAttributePredicate(fromFirstSource, columns, { paused: ['true'] })).toBeUndefined();
  });

  it('cannot match an attribute the definition does not declare', () => {
    expect(buildAttributePredicate(fromSecondSource, columns, { unknown: ['x'] })).toBeUndefined();
  });

  describe('with value labels', () => {
    it('selects the raw values that read as the label', () => {
      expect(
        buildAttributePredicate(labelledPlan, labelledColumns, { phase: ['running'] })
      ).toEqual({
        predicate: 'TO_STRING(`k8s.pod.phase`) IN (?a0v0, ?a0v1)',
        params: [{ a0v0: '2' }, { a0v1: 'running' }],
      });
    });

    it('selects an unmapped value as itself', () => {
      expect(buildAttributePredicate(labelledPlan, labelledColumns, { phase: ['failed'] })).toEqual(
        {
          predicate: 'TO_STRING(`k8s.pod.phase`) IN (?a0v0)',
          params: [{ a0v0: 'failed' }],
        }
      );
    });

    it('cannot match a label that only a mapped raw value would produce under another label', () => {
      // "2" is a raw value that reads "running", so no raw value reads as "2".
      expect(
        buildAttributePredicate(labelledPlan, labelledColumns, { phase: ['2'] })
      ).toBeUndefined();
    });
  });
});
