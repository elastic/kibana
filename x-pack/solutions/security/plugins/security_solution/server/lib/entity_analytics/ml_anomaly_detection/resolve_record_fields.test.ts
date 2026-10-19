/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Entity } from '@kbn/entity-store/common';
import type { RawAnomalyRecord } from './types';
import {
  getEntityIdentityFields,
  getIdentityFieldsByEntityId,
  resolveRecordFields,
  selectCause,
} from './resolve_record_fields';

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

const asEntities = (records: unknown[]): Entity[] => records as Entity[];

const toObject = (fields: Map<string, Set<string>>) =>
  Object.fromEntries([...fields].map(([key, values]) => [key, [...values].sort()]));

describe('getEntityIdentityFields', () => {
  it("flattens the entity type's namespace into dotted field paths with string values", () => {
    const records = asEntities([
      {
        entity: { id: 'user:alice', name: 'alice@WIN-1' },
        user: { name: 'alice', id: ['u-1', 'u-2'], domain: 'CORP', risk: { level: 'High' } },
        host: { name: 'WIN-1' },
      },
    ]);

    expect(toObject(getEntityIdentityFields('user', records))).toEqual({
      'user.name': ['alice'],
      'user.id': ['u-1', 'u-2'],
      'user.domain': ['CORP'],
      'user.risk.level': ['High'],
    });
  });

  it('ignores other namespaces on the record (shared context, not identity)', () => {
    const records = asEntities([{ user: { name: 'alice' }, host: { name: 'WIN-1' } }]);

    expect(getEntityIdentityFields('user', records).has('host.name')).toBe(false);
    expect(toObject(getEntityIdentityFields('host', records))).toEqual({ 'host.name': ['WIN-1'] });
  });

  it('uses the entity namespace for generic entities', () => {
    const records = asEntities([{ entity: { id: 'generic:1', name: 'pod-1' } }]);

    expect(toObject(getEntityIdentityFields('generic', records))).toEqual({
      'entity.id': ['generic:1'],
      'entity.name': ['pod-1'],
    });
  });

  it('returns an empty map when the namespace is absent', () => {
    expect(getEntityIdentityFields('user', asEntities([{ entity: { id: 'x' } }])).size).toBe(0);
  });
});

describe('getIdentityFieldsByEntityId', () => {
  it('keys each record by entity.id and skips records without one', () => {
    const records = asEntities([
      { entity: { id: 'user:henry' }, user: { name: 'henry.clark' } },
      { entity: { id: 'user:olivia' }, user: { name: 'olivia.perez' } },
      { user: { name: 'orphan' } },
    ]);

    const byId = getIdentityFieldsByEntityId('user', records);

    expect([...byId.keys()]).toEqual(['user:henry', 'user:olivia']);
    expect(toObject(byId.get('user:henry') ?? new Map())).toEqual({ 'user.name': ['henry.clark'] });
    expect(toObject(byId.get('user:olivia') ?? new Map())).toEqual({
      'user.name': ['olivia.perez'],
    });
  });
});

describe('selectCause', () => {
  const alice = getEntityIdentityFields(
    'user',
    asEntities([{ user: { name: 'alice' }, host: { name: 'WIN-1' } }])
  );

  it('returns undefined without causes', () => {
    expect(selectCause(undefined, alice)).toBeUndefined();
    expect(selectCause([], alice)).toBeUndefined();
  });

  it('matches on field name and value, not on value alone', () => {
    const causes = [
      cause({ by_field_name: 'process.name', by_field_value: 'alice' }),
      cause({ by_field_name: 'user.name', by_field_value: 'alice' }),
    ];

    expect(selectCause(causes, alice)).toBe(causes[1]);
  });

  it("does not select another user's cause on a shared partition value", () => {
    // Both causes share the host partition; only the second belongs to Alice.
    const causes = [
      cause({
        by_field_name: 'user.name',
        by_field_value: 'mallory',
        partition_field_name: 'host.name',
        partition_field_value: 'WIN-1',
      }),
      cause({
        by_field_name: 'user.name',
        by_field_value: 'alice',
        partition_field_name: 'host.name',
        partition_field_value: 'WIN-1',
      }),
    ];

    expect(selectCause(causes, alice)).toBe(causes[1]);
  });

  it('matches over and numeric partition dimensions of the identity namespace', () => {
    const host = getEntityIdentityFields(
      'host',
      asEntities([{ host: { name: 'host-9', id: '443' } }])
    );
    const causes = [
      cause({ over_field_name: 'host.name', over_field_value: 'other' }),
      cause({ over_field_name: 'host.name', over_field_value: 'host-9' }),
      cause({ partition_field_name: 'host.id', partition_field_value: 443 }),
    ];

    expect(selectCause(causes, host)).toBe(causes[1]);
    expect(selectCause([causes[0], causes[2]], host)).toBe(causes[2]);
  });

  it('prefers the cause with more matching dimensions', () => {
    const causes = [
      cause({ by_field_name: 'user.name', by_field_value: 'alice' }),
      cause({
        by_field_name: 'user.name',
        by_field_value: 'alice',
        partition_field_name: 'user.domain',
        partition_field_value: 'CORP',
      }),
    ];
    const aliceCorp = getEntityIdentityFields(
      'user',
      asEntities([{ user: { name: 'alice', domain: 'CORP' } }])
    );

    expect(selectCause(causes, aliceCorp)).toBe(causes[1]);
  });

  it('falls back to the first cause when nothing matches or no identities are given', () => {
    const causes = [
      cause({ by_field_name: 'user.name', by_field_value: 'mallory' }),
      cause({ by_field_name: 'user.name', by_field_value: 'trent' }),
    ];

    expect(selectCause(causes, alice)).toBe(causes[0]);
    expect(selectCause(causes, new Map())).toBe(causes[0]);
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
      function: 'time_of_day',
      by_field_name: 'user.name',
      over_field_name: 'source.geo.region_iso_code',
      over_field_value: 'US-CA',
      causes: [
        cause({
          by_field_name: 'user.name',
          by_field_value: 'olivia.perez',
          actual: [7200],
          typical: [50400],
        }),
        cause({
          by_field_name: 'user.name',
          by_field_value: 'henry.clark',
          actual: [11460],
          typical: [46800],
        }),
      ],
    };
    const henry = getEntityIdentityFields('user', asEntities([{ user: { name: 'henry.clark' } }]));

    expect(resolveRecordFields(record, henry)).toMatchObject({
      byFieldName: 'user.name',
      byFieldValue: 'henry.clark',
      overFieldValue: 'US-CA',
      actual: 11460,
      typical: 46800,
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
