/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLColumn } from '@kbn/es-types';
import type { OutputColumn, QueryPlan } from '../generator';
import { interpretPlanResult } from './plan_result';
import type { PlanResult } from './types';

const plan: QueryPlan = {
  index: 1,
  sourceIndex: 0,
  indexPattern: 'p',
  engine: 'FROM',
  attributes: [],
};

const result = (types: Record<string, string>): PlanResult => ({
  plan,
  columns: Object.entries(types).map(([name, type]): ESQLColumn => ({ name, type })),
  rows: [],
  isPartial: false,
});

const outputColumns: OutputColumn[] = [
  { name: 'entity.id', kind: 'id' },
  { name: 'host.id', kind: 'identity' },
  { name: 'host.name', kind: 'identity' },
  { name: 'os', kind: 'attribute', fieldByPlan: { 0: 'host.os.name', 1: 'os.name' } },
  { name: 'ip', kind: 'attribute', fieldByPlan: { 1: 'host.ip' } },
  { name: 'arch', kind: 'attribute', fieldByPlan: { 0: 'host.architecture' } },
  { name: 'last_seen', kind: 'last_seen' },
];

const noWitnesses: ReadonlyMap<string, string> = new Map();
const identity = { compositions: [['host.id'], ['host.name']], witnessColumns: noWitnesses };
const entityIdWitness: ReadonlyMap<string, string> = new Map([['entity.id', 'mapped:entity.id']]);

describe('interpretPlanResult', () => {
  it('is usable when a composition is mapped and every attribute is', () => {
    expect(
      interpretPlanResult(
        result({
          'entity.id': 'keyword',
          'host.id': 'keyword',
          'host.name': 'keyword',
          os: 'keyword',
          ip: 'ip',
          last_seen: 'date',
        }),
        identity,
        outputColumns
      )
    ).toEqual({ usable: true, unavailableFields: [] });
  });

  it('is unusable when last_seen is null', () => {
    expect(
      interpretPlanResult(
        result({ 'host.id': 'keyword', os: 'keyword', ip: 'ip', last_seen: 'null' }),
        identity,
        outputColumns
      )
    ).toEqual({
      usable: false,
      reason: 'no readable index behind "p" maps @timestamp',
      unavailableFields: [],
    });
  });

  it('treats an attribute column the result lacks as unavailable', () => {
    expect(
      interpretPlanResult(
        result({ 'host.id': 'keyword', os: 'keyword', last_seen: 'date' }),
        identity,
        outputColumns
      ).unavailableFields
    ).toEqual(['host.ip']);
  });

  it('is unusable when last_seen is absent', () => {
    expect(
      interpretPlanResult(result({ 'host.id': 'keyword' }), identity, outputColumns).reason
    ).toBe('no readable index behind "p" maps @timestamp');
  });

  it('reports a null last_seen before an unmapped identity', () => {
    expect(
      interpretPlanResult(
        result({ 'host.id': 'null', 'host.name': 'null', last_seen: 'null' }),
        identity,
        outputColumns
      ).reason
    ).toBe('no readable index behind "p" maps @timestamp');
  });

  it('is unusable when no composition is fully mapped', () => {
    expect(
      interpretPlanResult(
        result({
          'host.id': 'keyword',
          'host.name': 'null',
          os: 'keyword',
          ip: 'ip',
          last_seen: 'date',
        }),
        {
          compositions: [['host.id', 'host.name'], ['host.hostname']],
          witnessColumns: noWitnesses,
        },
        outputColumns
      )
    ).toEqual({
      usable: false,
      reason:
        'no index behind "p" maps every field of an identity composition (host.id + host.name, host.hostname)',
      unavailableFields: [],
    });
  });

  it('is usable through a later ranked composition when an earlier one is unmapped', () => {
    expect(
      interpretPlanResult(
        result({ 'host.id': 'null', 'host.name': 'keyword', last_seen: 'date' }),
        identity,
        outputColumns
      ).usable
    ).toBe(true);
  });

  it('lists the plan field of each null attribute it carries, under its own field name', () => {
    expect(
      interpretPlanResult(
        result({
          'host.id': 'keyword',
          os: 'null',
          ip: 'null',
          arch: 'null',
          last_seen: 'date',
        }),
        identity,
        outputColumns
      )
    ).toEqual({ usable: true, unavailableFields: ['os.name', 'host.ip'] });
  });

  it('lists unavailable fields of an unusable plan too, once each', () => {
    const columns: OutputColumn[] = [
      { name: 'os', kind: 'attribute', fieldByPlan: { 1: 'os.name' } },
      { name: 'os_again', kind: 'attribute', fieldByPlan: { 1: 'os.name' } },
      { name: 'last_seen', kind: 'last_seen' },
    ];
    expect(
      interpretPlanResult(
        result({ 'host.id': 'null', os: 'null', os_again: 'null', last_seen: 'date' }),
        { compositions: [['host.id']], witnessColumns: noWitnesses },
        columns
      )
    ).toEqual({
      usable: false,
      reason: 'no index behind "p" maps every field of an identity composition (host.id)',
      unavailableFields: ['os.name'],
    });
  });

  // The id evaluation types `entity.id` keyword even when no index maps it; the witness keeps the
  // grouped column's type.
  const entityIdResult = (witnessType: string) =>
    interpretPlanResult(
      result({ 'entity.id': 'keyword', 'mapped:entity.id': witnessType, last_seen: 'date' }),
      { compositions: [['entity.id']], witnessColumns: entityIdWitness },
      []
    );

  it('is unusable when the witness of an entity.id identity is null', () => {
    expect(entityIdResult('null')).toEqual({
      usable: false,
      reason: 'no index behind "p" maps every field of an identity composition (entity.id)',
      unavailableFields: [],
    });
  });

  it('is usable when the witness of an entity.id identity is mapped', () => {
    expect(entityIdResult('keyword')).toEqual({ usable: true, unavailableFields: [] });
  });

  it('is usable through a ranked composition when the entity.id witness is null', () => {
    expect(
      interpretPlanResult(
        result({
          'entity.id': 'keyword',
          'mapped:entity.id': 'null',
          'host.hostname': 'keyword',
          last_seen: 'date',
        }),
        { compositions: [['entity.id'], ['host.hostname']], witnessColumns: entityIdWitness },
        outputColumns
      ).usable
    ).toBe(true);
  });
});
