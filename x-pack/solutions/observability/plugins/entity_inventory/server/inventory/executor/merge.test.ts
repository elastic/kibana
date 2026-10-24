/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { k8sDeploymentFixture } from '../__fixtures__/definitions';
import { buildColumns, resolveIdentityPlan } from '../generator';
import type { OutputColumn, QueryPlan } from '../generator';
import { mergeRows } from './merge';
import type { EsqlColumn, InventoryRow, PlanResult } from './types';

const columns: OutputColumn[] = [
  { name: 'entity.id', kind: 'id' },
  { name: 'host.name', kind: 'identity' },
  { name: 'os', kind: 'attribute', fieldByPlan: { 0: 'host.os.name', 1: 'os.name' } },
  { name: 'last_seen', kind: 'last_seen' },
];

const plan = (index: number, indexPattern = `pattern-${index}`): QueryPlan => ({
  index,
  sourceIndex: index,
  indexPattern,
  indices: [],
  queryTarget: 'pattern',
  engine: 'FROM',
  attributes: [],
});

const result = (
  index: number,
  rows: InventoryRow[],
  esqlColumns: EsqlColumn[] = [],
  indexPattern?: string
): PlanResult => ({ plan: plan(index, indexPattern), columns: esqlColumns, rows });

describe('mergeRows', () => {
  it('keeps an entity returned by any plan', () => {
    const { rows } = mergeRows(
      [
        result(0, [{ 'entity.id': 'a', last_seen: '2026-01-01T00:00:00.000Z' }]),
        result(1, [{ 'entity.id': 'b', last_seen: '2026-01-01T00:00:00.000Z' }]),
      ],
      columns
    );
    expect(rows.map((row) => row['entity.id'])).toEqual(['a', 'b']);
  });

  it('takes an attribute from the row with the newest last_seen, even from a later plan', () => {
    const { rows, provenance } = mergeRows(
      [
        result(0, [{ 'entity.id': 'a', os: 'old', last_seen: '2026-01-01T00:00:00.000Z' }]),
        result(1, [{ 'entity.id': 'a', os: 'new', last_seen: '2026-01-02T00:00:00.000Z' }]),
      ],
      columns
    );
    expect(rows[0].os).toBe('new');
    expect(provenance).toEqual({ a: { os: 'pattern-1' } });
  });

  it('keeps an earlier plan attribute when a later plan is older or equal', () => {
    const { rows } = mergeRows(
      [
        result(0, [{ 'entity.id': 'a', os: 'first', last_seen: '2026-01-02T00:00:00.000Z' }]),
        result(1, [{ 'entity.id': 'a', os: 'older', last_seen: '2026-01-01T00:00:00.000Z' }]),
        result(2, [{ 'entity.id': 'a', os: 'tie', last_seen: '2026-01-02T00:00:00.000Z' }]),
      ],
      columns
    );
    expect(rows[0].os).toBe('first');
  });

  it('compares last_seen as instants, not strings', () => {
    // As strings the first sorts after the second; as instants it is an hour earlier.
    const { rows } = mergeRows(
      [
        result(0, [{ 'entity.id': 'a', os: 'earlier', last_seen: '2026-01-01T10:00:00+02:00' }]),
        result(1, [{ 'entity.id': 'a', os: 'later', last_seen: '2026-01-01T09:00:00Z' }]),
      ],
      columns
    );
    expect(rows[0].os).toBe('later');
    expect(rows[0].last_seen).toBe('2026-01-01T09:00:00Z');
  });

  it('compares an attribute against the row that supplied it, not the entity newest row', () => {
    const { rows, provenance } = mergeRows(
      [
        result(0, [{ 'entity.id': 'a', os: 'oldest', last_seen: '2026-01-01T00:00:00.000Z' }]),
        result(1, [{ 'entity.id': 'a', os: null, last_seen: '2026-01-03T00:00:00.000Z' }]),
        result(2, [{ 'entity.id': 'a', os: 'middle', last_seen: '2026-01-02T00:00:00.000Z' }]),
      ],
      columns
    );
    expect(rows[0]).toEqual({
      'entity.id': 'a',
      os: 'middle',
      last_seen: '2026-01-03T00:00:00.000Z',
    });
    expect(provenance.a.os).toBe('pattern-2');
  });

  it('takes the first non-null identity field and id', () => {
    const { rows } = mergeRows(
      [
        result(0, [{ 'entity.id': 'a', 'host.name': null, last_seen: '2026-01-01T00:00:00.000Z' }]),
        result(1, [{ 'entity.id': 'a', 'host.name': 'h1', last_seen: '2026-01-01T00:00:00.000Z' }]),
        result(2, [{ 'entity.id': 'a', 'host.name': 'h2', last_seen: '2026-01-05T00:00:00.000Z' }]),
      ],
      columns
    );
    expect(rows[0]['host.name']).toBe('h1');
    expect(rows[0]['entity.id']).toBe('a');
  });

  it('takes the newest last_seen', () => {
    const { rows } = mergeRows(
      [
        result(0, [{ 'entity.id': 'a', last_seen: '2026-01-01T00:00:00.000Z' }]),
        result(1, [{ 'entity.id': 'a', last_seen: '2026-01-03T00:00:00.000Z' }]),
        result(2, [{ 'entity.id': 'a', last_seen: '2026-01-02T00:00:00.000Z' }]),
      ],
      columns
    );
    expect(rows[0].last_seen).toBe('2026-01-03T00:00:00.000Z');
  });

  it('never lets a null replace a value', () => {
    const { rows, provenance } = mergeRows(
      [
        result(0, [
          {
            'entity.id': 'a',
            'host.name': 'h',
            os: 'linux',
            last_seen: '2026-01-01T00:00:00.000Z',
          },
        ]),
        result(1, [{ 'entity.id': 'a', 'host.name': null, os: null, last_seen: null }]),
      ],
      columns
    );
    expect(rows[0]).toEqual({
      'entity.id': 'a',
      'host.name': 'h',
      os: 'linux',
      last_seen: '2026-01-01T00:00:00.000Z',
    });
    expect(provenance.a.os).toBe('pattern-0');
  });

  it('merges rows of one plan that share an id by the same rules', () => {
    const { rows } = mergeRows(
      [
        result(0, [
          { 'entity.id': 'a', 'host.name': null, os: 'old', last_seen: '2026-01-01T00:00:00.000Z' },
          { 'entity.id': 'a', 'host.name': 'h', os: 'new', last_seen: '2026-01-02T00:00:00.000Z' },
          { 'entity.id': 'a', 'host.name': 'h2', os: null, last_seen: '2026-01-03T00:00:00.000Z' },
        ]),
      ],
      columns
    );
    expect(rows).toEqual([
      { 'entity.id': 'a', 'host.name': 'h', os: 'new', last_seen: '2026-01-03T00:00:00.000Z' },
    ]);
  });

  it('records provenance per entity per attribute as the plan index pattern', () => {
    const attributeColumns: OutputColumn[] = [
      { name: 'entity.id', kind: 'id' },
      { name: 'os', kind: 'attribute', fieldByPlan: { 0: 'a', 1: 'b' } },
      { name: 'arch', kind: 'attribute', fieldByPlan: { 1: 'c' } },
      { name: 'last_seen', kind: 'last_seen' },
    ];
    const { provenance } = mergeRows(
      [
        result(0, [{ 'entity.id': 'a', os: 'linux', last_seen: 2 }], [], 'metrics-a'),
        result(
          1,
          [
            { 'entity.id': 'a', os: 'mac', arch: 'arm', last_seen: 1 },
            { 'entity.id': 'b', os: null, arch: 'x86', last_seen: 1 },
          ],
          [],
          'metrics-b'
        ),
      ],
      attributeColumns
    );
    expect(provenance).toEqual({
      a: { os: 'metrics-a', arch: 'metrics-b' },
      b: { arch: 'metrics-b' },
    });
  });

  it('takes each column type from the first plan, in plan order, that returned it', () => {
    const { columns: typed } = mergeRows(
      [
        result(
          1,
          [],
          [
            { name: 'entity.id', type: 'keyword' },
            { name: 'os', type: 'text' },
            { name: 'last_seen', type: 'date' },
          ]
        ),
        result(
          0,
          [],
          [
            { name: 'entity.id', type: 'keyword' },
            { name: 'last_seen', type: 'date_nanos' },
          ]
        ),
      ],
      columns
    );
    expect(typed).toEqual([
      { name: 'entity.id', kind: 'id', type: 'keyword' },
      { name: 'host.name', kind: 'identity', type: null },
      { name: 'os', kind: 'attribute', type: 'text' },
      { name: 'last_seen', kind: 'last_seen', type: 'date_nanos' },
    ]);
  });

  it('skips a null column type for the first plan that returned a real one', () => {
    const { columns: typed } = mergeRows(
      [
        result(0, [], [{ name: 'os', type: 'null' }]),
        result(1, [], [{ name: 'os', type: 'keyword' }]),
        result(2, [], [{ name: 'os', type: 'text' }]),
        result(3, [], [{ name: 'last_seen', type: 'null' }]),
      ],
      columns
    );
    expect(typed.find(({ name }) => name === 'os')?.type).toBe('keyword');
    expect(typed.find(({ name }) => name === 'last_seen')?.type).toBeNull();
  });

  it('drops and counts rows without an id', () => {
    const { rows, droppedRows } = mergeRows(
      [
        result(0, [
          { 'entity.id': null, last_seen: 1 },
          { last_seen: 1 },
          { 'entity.id': 'a', last_seen: 1 },
        ]),
      ],
      columns
    );
    expect(rows).toEqual([{ 'entity.id': 'a', last_seen: 1 }]);
    expect(droppedRows).toBe(2);
  });

  it('ignores columns that are not output columns', () => {
    const { rows } = mergeRows(
      [result(0, [{ 'entity.id': 'a', helper: 'x', last_seen: 1 }])],
      columns
    );
    expect(rows).toEqual([{ 'entity.id': 'a', last_seen: 1 }]);
  });

  it('merges against columns built from a fixture', () => {
    const plans: QueryPlan[] = (k8sDeploymentFixture.dynamic?.sources ?? []).map(
      ({ indexPattern, attributes = [] }, index) => ({
        index,
        sourceIndex: index,
        indexPattern,
        indices: [],
        queryTarget: 'pattern',
        engine: 'FROM',
        attributes,
      })
    );
    const fixtureColumns = buildColumns(
      k8sDeploymentFixture,
      plans,
      resolveIdentityPlan(k8sDeploymentFixture)
    );
    const { rows, provenance } = mergeRows(
      [
        {
          plan: plans[0],
          columns: [],
          rows: [{ 'entity.id': 'ns/d', cluster: 'c0', last_seen: 1 }],
        },
        {
          plan: plans[1],
          columns: [],
          rows: [{ 'entity.id': 'ns/d', cluster: 'c1', paused: false, last_seen: 2 }],
        },
      ],
      fixtureColumns
    );
    expect(rows).toEqual([{ 'entity.id': 'ns/d', cluster: 'c1', paused: false, last_seen: 2 }]);
    expect(provenance).toEqual({
      'ns/d': {
        cluster: 'metrics-kubernetes.state_deployment-*',
        paused: 'metrics-kubernetes.state_deployment-*',
      },
    });
  });
});
