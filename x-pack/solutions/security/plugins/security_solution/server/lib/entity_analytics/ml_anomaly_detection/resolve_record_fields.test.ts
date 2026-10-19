/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Entity } from '@kbn/entity-store/common';
import type { RawAnomalyRecord } from './types';
import { getEntityIdentityValues, resolveRecordFields, selectCause } from './resolve_record_fields';

const baseRecord: RawAnomalyRecord = {
  timestamp: 1_700_000_000_000,
  job_id: 'job-1',
  detector_index: 0,
  record_score: 50,
};

const cause = (
  overrides: Partial<NonNullable<RawAnomalyRecord['causes']>[number]>
): NonNullable<RawAnomalyRecord['causes']>[number] => ({
  function: 'rare',
  function_description: 'rare',
  probability: 0.01,
  actual: [1],
  typical: [0.01],
  ...overrides,
});

describe('getEntityIdentityValues', () => {
  it('collects string and string[] values of the user/host/service namespaces and entity.name', () => {
    const records = [
      {
        entity: { id: 'user:alice', name: 'alice@WIN-1' },
        user: { name: 'alice', id: ['u-1', 'u-2'], domain: 'CORP', risk: { score: 3 } },
        host: { name: 'WIN-1' },
      },
    ] as unknown as Entity[];

    expect([...getEntityIdentityValues(records)].sort()).toEqual(
      ['CORP', 'WIN-1', 'alice', 'alice@WIN-1', 'u-1', 'u-2'].sort()
    );
  });

  it('returns an empty set for records without identity namespaces', () => {
    expect(getEntityIdentityValues([{ entity: { id: 'x' } } as unknown as Entity]).size).toBe(0);
  });
});

describe('selectCause', () => {
  const causes = [
    cause({ by_field_value: 'mallory' }),
    cause({ by_field_value: 'alice' }),
    cause({ over_field_value: 'host-9' }),
    cause({ partition_field_value: 7 }),
  ];

  it('returns undefined without causes', () => {
    expect(selectCause(undefined, new Set(['alice']))).toBeUndefined();
    expect(selectCause([], new Set(['alice']))).toBeUndefined();
  });

  it('prefers the cause whose by/over/partition value is an identity value', () => {
    expect(selectCause(causes, new Set(['alice']))).toBe(causes[1]);
    expect(selectCause(causes, new Set(['host-9']))).toBe(causes[2]);
    expect(selectCause(causes, new Set(['7']))).toBe(causes[3]);
  });

  it('falls back to the first cause when nothing matches or no identities are given', () => {
    expect(selectCause(causes, new Set(['nobody']))).toBe(causes[0]);
    expect(selectCause(causes, new Set())).toBe(causes[0]);
    expect(selectCause(causes)).toBe(causes[0]);
  });
});

describe('resolveRecordFields', () => {
  it('reads top-level fields when present', () => {
    const record: RawAnomalyRecord = {
      ...baseRecord,
      function: 'high_count',
      field_name: 'bytes',
      by_field_name: 'user.name',
      by_field_value: 'alice',
      partition_field_name: 'host.name',
      partition_field_value: 'WIN-1',
      actual: [10],
      typical: [2],
      causes: [cause({ by_field_value: 'ignored', actual: [99], typical: [98] })],
    };

    expect(resolveRecordFields(record)).toEqual({
      actual: 10,
      typical: 2,
      detectorFunction: 'high_count',
      fieldName: 'bytes',
      byFieldName: 'user.name',
      byFieldValue: 'alice',
      overFieldName: undefined,
      overFieldValue: undefined,
      partitionFieldName: 'host.name',
      partitionFieldValue: 'WIN-1',
    });
  });

  it("completes a by+over population record from the entity's cause", () => {
    const record: RawAnomalyRecord = {
      ...baseRecord,
      function: 'rare',
      by_field_name: 'process.name',
      over_field_name: 'host.name',
      over_field_value: 'WIN-1',
      causes: [
        cause({ by_field_value: 'cmd.exe', over_field_value: 'WIN-1' }),
        cause({
          by_field_value: 'mimikatz.exe',
          over_field_value: 'WIN-1',
          actual: [1],
          typical: [0.0001],
        }),
      ],
    };

    // Neither cause is tied to the entity itself (both share the over value); first cause wins.
    expect(resolveRecordFields(record, new Set(['WIN-1']))).toMatchObject({
      byFieldName: 'process.name',
      byFieldValue: 'cmd.exe',
      overFieldValue: 'WIN-1',
      actual: 1,
      typical: 0.01,
    });
  });

  it('stringifies a numeric partition_field_value taken from a cause', () => {
    const record: RawAnomalyRecord = {
      ...baseRecord,
      causes: [cause({ partition_field_value: 443 })],
    };

    expect(resolveRecordFields(record).partitionFieldValue).toBe('443');
  });

  it('leaves values undefined when neither the record nor its causes carry them', () => {
    expect(resolveRecordFields(baseRecord)).toEqual({
      actual: undefined,
      typical: undefined,
      detectorFunction: undefined,
      fieldName: undefined,
      byFieldName: undefined,
      byFieldValue: undefined,
      overFieldName: undefined,
      overFieldValue: undefined,
      partitionFieldName: undefined,
      partitionFieldValue: undefined,
    });
  });
});
