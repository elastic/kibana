/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OutputColumn } from '../inventory/generator';
import { toTypeColumns } from './type_columns';

const columns: OutputColumn[] = [
  { name: 'entity.id', kind: 'id' },
  { name: 'kubernetes.namespace', kind: 'identity' },
  { name: 'k8s.cluster.name', kind: 'attribute', fieldByPlan: { 0: 'orchestrator.cluster.name' } },
  { name: 'k8s.deployment.uid', kind: 'attribute', fieldByPlan: { 1: 'k8s.deployment.uid' } },
  { name: 'last_seen', kind: 'last_seen' },
];

describe('toTypeColumns', () => {
  it('labels an identity field and an attribute from the display labels', () => {
    expect(
      toTypeColumns(columns, [
        { name: 'kubernetes.namespace', label: 'Namespace' },
        { name: 'k8s.cluster.name', label: 'Cluster' },
      ])
    ).toEqual([
      { name: 'entity.id', kind: 'id', label: 'ID' },
      { name: 'kubernetes.namespace', kind: 'identity', label: 'Namespace' },
      { name: 'k8s.cluster.name', kind: 'attribute', label: 'Cluster' },
      { name: 'k8s.deployment.uid', kind: 'attribute' },
      { name: 'last_seen', kind: 'last_seen', label: 'Last seen' },
    ]);
  });

  it('labels only the generated columns when there are no display labels', () => {
    expect(toTypeColumns(columns)).toEqual([
      { name: 'entity.id', kind: 'id', label: 'ID' },
      { name: 'kubernetes.namespace', kind: 'identity' },
      { name: 'k8s.cluster.name', kind: 'attribute' },
      { name: 'k8s.deployment.uid', kind: 'attribute' },
      { name: 'last_seen', kind: 'last_seen', label: 'Last seen' },
    ]);
  });

  it('ignores a display label that matches no column', () => {
    expect(toTypeColumns(columns, [{ name: 'not.a.column', label: 'Nothing' }])).toEqual(
      toTypeColumns(columns)
    );
  });

  it('does not label a column named like an inherited property of an object', () => {
    const result = toTypeColumns([
      { name: '__proto__', kind: 'attribute' },
      { name: 'constructor', kind: 'attribute' },
      { name: 'toString', kind: 'attribute' },
    ]);

    expect(result).toEqual([
      { name: '__proto__', kind: 'attribute' },
      { name: 'constructor', kind: 'attribute' },
      { name: 'toString', kind: 'attribute' },
    ]);
    result.forEach((column) => expect(column).not.toHaveProperty('label'));
  });

  it('never returns the source fields of an attribute', () => {
    toTypeColumns(columns).forEach((column) => expect(column).not.toHaveProperty('fieldByPlan'));
  });
});
