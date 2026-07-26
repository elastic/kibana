/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityType } from '../definitions/entity_schema';
import { getEuidSourceFields } from './identity_fields';

describe('getEuidSourceFields', () => {
  it('returns expected host identity invariants deduplicated', () => {
    const result = getEuidSourceFields(EntityType.enum.host);

    expect(result.requiresOneOf).toEqual(result.identitySourceFields);
    expect(result.requiresOneOf).toEqual(
      expect.arrayContaining(['host.id', 'host.name', 'host.hostname'])
    );
    expect(result.identitySourceFields).toHaveLength(new Set(result.identitySourceFields).size);
  });

  it('excludes fieldEvaluation destinations (entity.namespace, entity.confidence) for user', () => {
    const result = getEuidSourceFields(EntityType.enum.user);

    expect(result.identitySourceFields).not.toContain('entity.namespace');
    expect(result.identitySourceFields).not.toContain('entity.confidence');
    expect(result.identitySourceFields).toEqual(
      expect.arrayContaining(['user.email', 'user.id', 'user.name', 'user.domain', 'host.id'])
    );
    expect(result.requiresOneOf).toEqual(result.identitySourceFields);
  });
});
