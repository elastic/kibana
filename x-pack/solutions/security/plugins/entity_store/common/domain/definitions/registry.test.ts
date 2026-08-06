/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALL_ENTITY_TYPES, entitySchema } from './entity_schema';
import { getEntityDefinitionWithoutId } from './registry';

describe('entitiesDefinitionRegistry', () => {
  it.each(ALL_ENTITY_TYPES)('%s definition parses against entitySchema', (entityType) => {
    const definition = getEntityDefinitionWithoutId(entityType);

    // `entitySchema` requires `id`, which `EntityDefinitionWithoutId` omits — every other field,
    // including the `creatableFromDocument` requires/rejectionReason pairing, is exercised here.
    expect(() => entitySchema.parse({ ...definition, id: entityType })).not.toThrow();
  });
});
