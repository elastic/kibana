/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { DataTableRecord } from '@kbn/discover-utils';
import {
  usePersistedAttackEntities,
  parsePersistedEntities,
  parseObservableEntities,
} from './use_persisted_attack_entities';

const buildHit = (source: Record<string, unknown> | undefined): DataTableRecord =>
  ({
    id: 'attack-1',
    raw: {
      _id: 'attack-1',
      _index: '.alerts-security.attack-discovery.alerts-default',
      _source: source,
    },
    flattened: {},
    isAnchor: false,
  } as unknown as DataTableRecord);

const validEntities = [
  { id: 'user:jane@acme.com@okta', type: 'user' },
  { id: 'host:HW-UUID', type: 'host' },
  { id: 'service:payments@prod', type: 'service' },
];

const validObservables = [
  { type_key: 'observable-type-ipv4', value: '10.0.0.1' },
  { type_key: 'observable-type-user-name', value: 'jdoe' },
];

describe('usePersistedAttackEntities', () => {
  it('returns undefined persistedEntities when the field is absent (older documents)', () => {
    const { result } = renderHook(() =>
      usePersistedAttackEntities(buildHit({ '@timestamp': '2024-01-01T00:00:00.000Z' }))
    );

    expect(result.current.persistedEntities).toBeUndefined();
    expect(result.current.observableEntities).toEqual([]);
  });

  it('returns undefined persistedEntities when _source is missing', () => {
    const { result } = renderHook(() => usePersistedAttackEntities(buildHit(undefined)));

    expect(result.current.persistedEntities).toBeUndefined();
    expect(result.current.observableEntities).toEqual([]);
  });

  it('reads dotted top-level keys from _source', () => {
    const { result } = renderHook(() =>
      usePersistedAttackEntities(
        buildHit({
          'kibana.alert.attack_discovery.entities': validEntities,
          'kibana.alert.attack_discovery.observable_entities': validObservables,
        })
      )
    );

    expect(result.current.persistedEntities).toEqual(validEntities);
    expect(result.current.observableEntities).toEqual([
      { typeKey: 'observable-type-ipv4', value: '10.0.0.1' },
      { typeKey: 'observable-type-user-name', value: 'jdoe' },
    ]);
  });

  it('reads fully-nested keys from _source', () => {
    const { result } = renderHook(() =>
      usePersistedAttackEntities(
        buildHit({
          kibana: {
            alert: {
              attack_discovery: {
                entities: validEntities,
                observable_entities: validObservables,
              },
            },
          },
        })
      )
    );

    expect(result.current.persistedEntities).toEqual(validEntities);
    expect(result.current.observableEntities).toHaveLength(2);
  });

  it('returns an empty array (not undefined) when the entities field is an empty array', () => {
    const { result } = renderHook(() =>
      usePersistedAttackEntities(buildHit({ 'kibana.alert.attack_discovery.entities': [] }))
    );

    expect(result.current.persistedEntities).toEqual([]);
  });

  it('treats a non-array entities field as absent', () => {
    const { result } = renderHook(() =>
      usePersistedAttackEntities(
        buildHit({ 'kibana.alert.attack_discovery.entities': 'not-an-array' })
      )
    );

    expect(result.current.persistedEntities).toBeUndefined();
  });
});

describe('parsePersistedEntities', () => {
  it('filters out malformed entries', () => {
    expect(
      parsePersistedEntities([
        { id: 'user:jane@acme.com@okta', type: 'user' },
        { id: '', type: 'user' },
        { id: 'host:HW-UUID', type: 'unknown-type' },
        { id: 123, type: 'host' },
        'not-an-object',
        null,
      ])
    ).toEqual([{ id: 'user:jane@acme.com@okta', type: 'user' }]);
  });
});

describe('parseObservableEntities', () => {
  it('filters out malformed entries and maps type_key to typeKey', () => {
    expect(
      parseObservableEntities([
        { type_key: 'observable-type-ipv4', value: '10.0.0.1' },
        { type_key: '', value: '10.0.0.2' },
        { type_key: 'observable-type-email', value: '' },
        { type_key: 'observable-type-url', value: 42 },
        null,
      ])
    ).toEqual([{ typeKey: 'observable-type-ipv4', value: '10.0.0.1' }]);
  });

  it('returns an empty array for non-array input', () => {
    expect(parseObservableEntities(undefined)).toEqual([]);
    expect(parseObservableEntities({})).toEqual([]);
  });
});
