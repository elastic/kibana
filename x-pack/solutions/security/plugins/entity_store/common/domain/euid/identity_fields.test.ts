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
    const result = getEuidSourceFields(EntityType.Values.host);

    expect(result.requiresOneOf).toEqual(
      expect.arrayContaining(['host.entity.id', 'host.id', 'host.name', 'host.hostname'])
    );
    expect(result.identitySourceFields).toHaveLength(new Set(result.identitySourceFields).size);
    expect(result.identitySourceFields).toEqual(
      expect.arrayContaining([
        'host.entity.id',
        'host.id',
        'host.name',
        'host.domain',
        'host.hostname',
      ])
    );
  });
});
