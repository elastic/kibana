/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { attributeAlertsToEntities } from './attribute_alerts';
import type { EntityRow, MatchKey } from './types';

const uidKey: MatchKey = ['k8s.pod.uid'];
const nameKey: MatchKey = ['k8s.pod.name', 'k8s.namespace.name'];

const pod = (uid: string, name: string | null, namespace: string): EntityRow => ({
  'entity.id': `k8s.pod:${uid}`,
  'k8s.pod.uid': uid,
  'k8s.pod.name': name,
  'k8s.namespace.name': namespace,
});

describe('attributeAlertsToEntities', () => {
  it('attributes alerts to the entity whose values equal the alert group', () => {
    const result = attributeAlertsToEntities(
      [pod('u1', 'cart-1', 'checkout'), pod('u2', 'cart-2', 'checkout')],
      [{ key: uidKey, groups: [{ values: ['u1'], alertIds: ['a1', 'a2'] }] }]
    );

    expect([...(result.get('k8s.pod:u1') ?? [])]).toEqual(['a1', 'a2']);
    expect(result.has('k8s.pod:u2')).toBe(false);
  });

  it('matches a key of several columns only when every column equals', () => {
    const result = attributeAlertsToEntities(
      [pod('u1', 'cart-1', 'checkout'), pod('u2', 'cart-1', 'payments')],
      [{ key: nameKey, groups: [{ values: ['cart-1', 'checkout'], alertIds: ['a1'] }] }]
    );

    expect([...result.keys()]).toEqual(['k8s.pod:u1']);
  });

  it('counts an alert once when several keys reach it', () => {
    const result = attributeAlertsToEntities(
      [pod('u1', 'cart-1', 'checkout')],
      [
        { key: uidKey, groups: [{ values: ['u1'], alertIds: ['a1', 'a2'] }] },
        { key: nameKey, groups: [{ values: ['cart-1', 'checkout'], alertIds: ['a2', 'a3'] }] },
      ]
    );

    expect(result.get('k8s.pod:u1')).toEqual(new Set(['a1', 'a2', 'a3']));
  });

  it('skips an entity that lacks a value for the key', () => {
    const result = attributeAlertsToEntities(
      [pod('u1', null, 'checkout')],
      [{ key: nameKey, groups: [{ values: ['null', 'checkout'], alertIds: ['a1'] }] }]
    );

    expect(result.size).toBe(0);
  });

  it('reads the first value of a multi-value column', () => {
    const entity: EntityRow = { 'entity.id': 'k8s.pod:u1', 'k8s.pod.uid': ['u1', 'u9'] };

    const result = attributeAlertsToEntities(
      [entity],
      [{ key: uidKey, groups: [{ values: ['u1'], alertIds: ['a1'] }] }]
    );

    expect(result.get('k8s.pod:u1')).toEqual(new Set(['a1']));
  });

  it('returns nothing when there are no keys or no alerts', () => {
    expect(attributeAlertsToEntities([pod('u1', 'cart-1', 'checkout')], []).size).toBe(0);
    expect(
      attributeAlertsToEntities([pod('u1', 'cart-1', 'checkout')], [{ key: uidKey, groups: [] }])
        .size
    ).toBe(0);
  });
});
