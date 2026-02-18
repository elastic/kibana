/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityType } from '../definitions/entity_schema';
import { getIdentitySourceFields } from './identity_fields';

describe('getIdentitySourceFields', () => {
  it('returns requiresOneOf and identitySourceFields for host', () => {
    const result = getIdentitySourceFields('host' as EntityType);
    expect(result.requiresOneOf).toEqual([
      'host.entity.id',
      'host.id',
      'host.name',
      'host.hostname',
    ]);
    expect(result.identitySourceFields).toEqual([
      'host.entity.id',
      'host.id',
      'host.name',
      'host.domain',
      'host.hostname',
    ]);
  });

  it('returns requiresOneOf and identitySourceFields for user', () => {
    const result = getIdentitySourceFields('user' as EntityType);
    expect(result.requiresOneOf).toContain('user.entity.id');
    expect(result.requiresOneOf).toContain('user.name');
    expect(result.identitySourceFields).toContain('user.name');
    expect(result.identitySourceFields).toContain('user.email');
    expect(result.identitySourceFields).toContain('host.entity.id');
  });

  it('returns requiresOneOf and identitySourceFields for service', () => {
    const result = getIdentitySourceFields('service' as EntityType);
    expect(result.requiresOneOf).toEqual(['service.entity.id', 'service.name']);
    expect(result.identitySourceFields).toEqual(['service.entity.id', 'service.name']);
  });

  it('deduplicates identity source fields in definition order', () => {
    const result = getIdentitySourceFields('host' as EntityType);
    const seen = new Set<string>();
    for (const f of result.identitySourceFields) {
      expect(seen.has(f)).toBe(false);
      seen.add(f);
    }
  });
});
