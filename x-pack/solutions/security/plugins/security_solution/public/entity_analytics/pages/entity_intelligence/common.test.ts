/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Entity } from '../../../../common/api/entity_analytics';
import { EntityType } from '../../../../common/entity_analytics/types';
import { toIntelligenceEntity } from './common';

describe('toIntelligenceEntity', () => {
  it('returns undefined when the record has no entity id', () => {
    expect(toIntelligenceEntity({} as Entity)).toBeUndefined();
  });

  it('flattens a scalar host record', () => {
    const result = toIntelligenceEntity({
      entity: { id: 'host:h1', name: 'SRV01', EngineMetadata: { Type: 'host' } },
      host: { name: 'SRV01' },
    } as unknown as Entity);
    expect(result).toMatchObject({
      id: 'host:h1',
      name: 'SRV01',
      type: EntityType.host,
      identifierValue: 'SRV01',
    });
  });

  // Regression: ECS `*.name` fields are multi-valued. A host entity carrying an
  // array `host.name` previously produced an array `identifierValue`, which
  // crashed the Entities tab at `identifierValue.toLowerCase()` (React error
  // boundary). The normalizer must coerce polymorphic name fields to a string.
  it('coerces a multi-valued host.name array to the first string (no array identifier)', () => {
    const result = toIntelligenceEntity({
      entity: {
        id: 'host:23BFBF61',
        name: ['Jamess-MBP-4.localdomain', 'Jamess-MacBook-Pro-4.local'],
        EngineMetadata: { Type: 'host' },
      },
      host: { name: ['Jamess-MBP-4.localdomain', 'Jamess-MacBook-Pro-4.local'] },
    } as unknown as Entity);

    expect(result).toBeDefined();
    expect(typeof result?.identifierValue).toBe('string');
    expect(result?.identifierValue).toBe('Jamess-MBP-4.localdomain');
    expect(typeof result?.name).toBe('string');
    expect(result?.name).toBe('Jamess-MBP-4.localdomain');
    // Downstream correlation relies on this being a string.
    expect(() => result?.identifierValue.toLowerCase()).not.toThrow();
  });

  it('coerces a multi-valued entity.name array while falling back to id when the type field is absent', () => {
    const result = toIntelligenceEntity({
      entity: {
        id: 'user:u1',
        name: ['alex.chen', 'a.chen'],
        EngineMetadata: { Type: 'user' },
      },
      // user.name array also present
      user: { name: ['alex.chen'] },
    } as unknown as Entity);
    expect(result?.name).toBe('alex.chen');
    expect(result?.identifierValue).toBe('alex.chen');
  });

  it('falls back to the entity id when no usable identifier string exists', () => {
    const result = toIntelligenceEntity({
      entity: { id: 'user:u2', EngineMetadata: { Type: 'user' } },
      user: { name: [] },
    } as unknown as Entity);
    expect(result?.name).toBe('user:u2');
    expect(result?.identifierValue).toBe('user:u2');
  });

  it('retains a singleton ECS identity ID without guessing among multiple accounts', () => {
    const record = {
      entity: { id: 'user:subject', name: 'Requester', EngineMetadata: { Type: 'user' } },
      user: { id: 'google-subject', name: 'requester@example.com' },
    } as Entity;
    expect(toIntelligenceEntity(record)?.identityId).toBe('google-subject');
    expect(
      toIntelligenceEntity({
        ...record,
        user: { id: ['first', 'second'], name: 'requester@example.com' },
      } as Entity)?.identityId
    ).toBeUndefined();
  });
});
