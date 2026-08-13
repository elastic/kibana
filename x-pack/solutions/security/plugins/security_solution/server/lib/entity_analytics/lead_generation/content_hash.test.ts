/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { computeContentHash, computeEntityIdentityKey } from './content_hash';

const BASE_ENTITIES = [{ type: 'user', id: 'user:alice', name: 'alice' }];

const BASE_OBSERVATIONS = [
  { moduleId: 'risk_analysis', type: 'high_risk_score', severity: 'high' as const },
  { moduleId: 'alert_analysis', type: 'alert_spike', severity: 'medium' as const },
];

describe('computeEntityIdentityKey', () => {
  it('returns the same key for the same entities', () => {
    expect(computeEntityIdentityKey({ entities: BASE_ENTITIES })).toBe(
      computeEntityIdentityKey({ entities: BASE_ENTITIES })
    );
  });

  it('is stable regardless of entity array order', () => {
    const entities = [
      { type: 'host', id: 'host:web01', name: 'web01' },
      { type: 'user', id: 'user:alice', name: 'alice' },
    ];
    const a = computeEntityIdentityKey({ entities });
    const b = computeEntityIdentityKey({ entities: [...entities].reverse() });
    expect(a).toBe(b);
  });

  it('produces different keys for different entities', () => {
    const a = computeEntityIdentityKey({ entities: BASE_ENTITIES });
    const b = computeEntityIdentityKey({
      entities: [{ type: 'user', id: 'user:bob', name: 'bob' }],
    });
    expect(a).not.toBe(b);
  });

  it('falls back to name when id is missing', () => {
    const withId = computeEntityIdentityKey({
      entities: [{ type: 'user', id: 'alice', name: 'alice' }],
    });
    const withoutId = computeEntityIdentityKey({
      entities: [{ type: 'user', name: 'alice' }],
    });
    expect(withId).toBe(withoutId);
  });

  it('includes entity type so the same id under different types differs', () => {
    const user = computeEntityIdentityKey({
      entities: [{ type: 'user', id: 'shared', name: 'shared' }],
    });
    const host = computeEntityIdentityKey({
      entities: [{ type: 'host', id: 'shared', name: 'shared' }],
    });
    expect(user).not.toBe(host);
  });
});

describe('computeContentHash', () => {
  it('returns the same hash for the same observations', () => {
    expect(computeContentHash({ observations: BASE_OBSERVATIONS })).toBe(
      computeContentHash({ observations: BASE_OBSERVATIONS })
    );
  });

  it('is stable regardless of observation order', () => {
    const a = computeContentHash({ observations: BASE_OBSERVATIONS });
    const b = computeContentHash({
      observations: [...BASE_OBSERVATIONS].reverse(),
    });
    expect(a).toBe(b);
  });

  it('deduplicates repeated moduleId:type:severity triples', () => {
    const a = computeContentHash({ observations: BASE_OBSERVATIONS });
    const b = computeContentHash({
      observations: [...BASE_OBSERVATIONS, BASE_OBSERVATIONS[0]],
    });
    expect(a).toBe(b);
  });

  it('does not depend on entities — entity identity is a separate key', () => {
    const a = computeContentHash({ observations: BASE_OBSERVATIONS });
    const b = computeContentHash({ observations: BASE_OBSERVATIONS });
    expect(a).toBe(b);
    // Same signals for different entities still share a content hash; lookup is
    // scoped by entity_identity_key before comparing content_hash.
    expect(a).not.toBe(computeEntityIdentityKey({ entities: BASE_ENTITIES }));
  });

  it('produces different hashes for different observation types', () => {
    const a = computeContentHash({ observations: BASE_OBSERVATIONS });
    const b = computeContentHash({
      observations: [{ moduleId: 'risk_analysis', type: 'lateral_movement', severity: 'high' }],
    });
    expect(a).not.toBe(b);
  });

  it('produces different hashes when the same type comes from a different module', () => {
    const a = computeContentHash({
      observations: [{ moduleId: 'risk_analysis', type: 'high_risk_score', severity: 'high' }],
    });
    const b = computeContentHash({
      observations: [{ moduleId: 'entity_profile', type: 'high_risk_score', severity: 'high' }],
    });
    expect(a).not.toBe(b);
  });

  it('changes when a new moduleId:type is added (versioning signal)', () => {
    const hashV1 = computeContentHash({
      observations: [{ moduleId: 'risk_analysis', type: 'high_risk_score', severity: 'high' }],
    });
    const hashV2 = computeContentHash({
      observations: [
        { moduleId: 'risk_analysis', type: 'high_risk_score', severity: 'high' },
        { moduleId: 'alert_analysis', type: 'alert_spike', severity: 'medium' },
      ],
    });
    expect(hashV1).not.toBe(hashV2);
  });

  it('changes when the same moduleId:type escalates in severity', () => {
    const day1 = computeContentHash({
      observations: [{ moduleId: 'risk_analysis', type: 'high_risk_score', severity: 'low' }],
    });
    const day2 = computeContentHash({
      observations: [{ moduleId: 'risk_analysis', type: 'high_risk_score', severity: 'critical' }],
    });
    expect(day1).not.toBe(day2);
  });

  it('ignores scores and LLM prose — only moduleId:type:severity matter', () => {
    const a = computeContentHash({ observations: BASE_OBSERVATIONS });
    const b = computeContentHash({
      observations: [
        {
          moduleId: 'risk_analysis',
          type: 'high_risk_score',
          severity: 'high',
          // @ts-expect-error — intentionally passing extra fields to prove they're ignored
          score: 99,
          description: 'LLM prose that changes every run',
        },
        {
          moduleId: 'alert_analysis',
          type: 'alert_spike',
          severity: 'medium',
          // @ts-expect-error — intentionally passing extra fields to prove they're ignored
          confidence: 0.1,
        },
      ],
    });
    expect(a).toBe(b);
  });
});
