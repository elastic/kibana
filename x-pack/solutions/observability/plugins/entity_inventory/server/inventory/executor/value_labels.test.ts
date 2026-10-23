/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryPlan } from '../generator';
import { applyValueLabels } from './value_labels';

const plan: QueryPlan = {
  index: 0,
  sourceIndex: 0,
  indexPattern: 'metrics-*',
  indices: [],
  queryTarget: 'pattern',
  engine: 'FROM',
  attributes: [
    { name: 'phase', field: 'k8s.pod.phase', valueLabels: { '2': 'running', Running: 'running' } },
    { name: 'ready', field: 'k8s.pod.ready', valueLabels: { true: 'yes' } },
    { name: 'os', field: 'host.os.name' },
  ],
};

describe('applyValueLabels', () => {
  it('maps a raw value to its label, matching numbers and booleans by their string form', () => {
    expect(applyValueLabels([{ phase: 2, ready: true }], plan)).toEqual([
      { phase: 'running', ready: 'yes' },
    ]);
    expect(applyValueLabels([{ phase: 'Running' }], plan)).toEqual([{ phase: 'running' }]);
  });

  it('passes an unmapped raw value through stringified', () => {
    expect(applyValueLabels([{ phase: 3, ready: false }], plan)).toEqual([
      { phase: '3', ready: 'false' },
    ]);
  });

  it('keeps null and does not add a column the row lacks', () => {
    expect(applyValueLabels([{ phase: null }], plan)).toEqual([{ phase: null }]);
  });

  it('maps multi-values element-wise', () => {
    expect(applyValueLabels([{ phase: [2, 'Pending', null] }], plan)).toEqual([
      { phase: ['running', 'Pending', null] },
    ]);
  });

  it('leaves attributes without labels and other columns untouched', () => {
    expect(applyValueLabels([{ os: 2, 'entity.id': 'a', last_seen: 5 }], plan)).toEqual([
      { os: 2, 'entity.id': 'a', last_seen: 5 },
    ]);
  });

  it('returns new rows', () => {
    const rows = [{ phase: 2 }];
    const [labelled] = applyValueLabels(rows, plan);
    expect(labelled).not.toBe(rows[0]);
    expect(rows[0]).toEqual({ phase: 2 });
  });
});
