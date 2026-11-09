/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEuidSourceFields } from '@kbn/entity-store/common/domain/euid';
import { getBuiltInEntityDefinition } from '@kbn/entity-store/common/euid_helpers';
import { ALLOWED_ENTITY_TYPES, ENTITY_FIELDS } from './common';

describe('ENTITY_FIELDS', () => {
  it.each(ALLOWED_ENTITY_TYPES)(
    'keeps only the %s identity fields that its entity definition stores',
    (type) => {
      const definition = getBuiltInEntityDefinition(type);
      const storedFields = new Set(
        definition.extraction.fields.map(({ destination }) => destination)
      );
      const keptIdentityFields = getEuidSourceFields(definition).identitySourceFields.filter(
        (field) => (ENTITY_FIELDS as readonly string[]).includes(field)
      );

      // The grid reads these from the entity records, so an unstored field is an unknown column.
      expect(keptIdentityFields.filter((field) => !storedFields.has(field))).toEqual([]);
    }
  );
});
