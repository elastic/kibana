/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getCommonFieldDescriptions, getEntityFieldsDescriptions } from './common_fields';
import { ALL_ENTITY_TYPES } from './entity_schema';

const UNTEMPLATED_VAR = /\$\{[^}]*\}/;

describe('common_fields', () => {
  describe('getCommonFieldDescriptions', () => {
    it.each(ALL_ENTITY_TYPES)(
      'should not contain untemplated variables for ecsField=%s',
      (entityType) => {
        const fields = getCommonFieldDescriptions(entityType);

        for (const field of fields) {
          expect(field.source).not.toMatch(UNTEMPLATED_VAR);
          expect(field.destination).not.toMatch(UNTEMPLATED_VAR);
        }
      }
    );
  });

  describe('getEntityFieldsDescriptions', () => {
    it.each(ALL_ENTITY_TYPES)(
      'should not contain untemplated variables for rootField=%s',
      (rootField) => {
        const fields = getEntityFieldsDescriptions(rootField);

        for (const field of fields) {
          expect(field.source).not.toMatch(UNTEMPLATED_VAR);
          expect(field.destination).not.toMatch(UNTEMPLATED_VAR);
        }
      }
    );
  });
});
