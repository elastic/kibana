/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { normalizeRuleSource } from './normalize_rule_source';
import type { BaseRuleParams } from '../../../../rule_schema';

describe('normalizeRuleSource', () => {
  describe('when ruleSource is missing (undefined)', () => {
    describe('and immutable is false', () => {
      it('returns a default rule_source of type `internal`', () => {
        const result = normalizeRuleSource({
          immutable: false,
          ruleSource: undefined,
        });

        expect(result).toEqual({
          type: 'internal',
        });
      });
    });

    describe('and immutable is true', () => {
      it('returns a default rule_source of type `external` with an empty list of customized fields', () => {
        const result = normalizeRuleSource({
          immutable: true,
          ruleSource: undefined,
        });

        expect(result).toEqual({
          type: 'external',
          is_customized: false,
          customized_fields: [],
          has_base_version: true,
        });
      });
    });
  });

  describe('when ruleSource is present', () => {
    describe('and all its nested fields are present', () => {
      it('normalizes existing value of internal rule source', () => {
        const internalRuleSource: BaseRuleParams['ruleSource'] = {
          type: 'internal',
        };

        const internalResult = normalizeRuleSource({
          immutable: false,
          ruleSource: internalRuleSource,
        });

        expect(internalResult).toEqual({
          type: 'internal',
        });
      });

      it('normalizes existing value of external rule source', () => {
        const externalRuleSource: BaseRuleParams['ruleSource'] = {
          type: 'external',
          isCustomized: true,
          customizedFields: [{ fieldName: 'tags' }],
          hasBaseVersion: true,
        };

        const externalResult = normalizeRuleSource({
          immutable: true,
          ruleSource: externalRuleSource,
        });

        expect(externalResult).toEqual({
          type: 'external',
          is_customized: true,
          customized_fields: [{ field_name: 'tags' }],
          has_base_version: true,
        });
      });
    });

    describe('but customization fields are missing', () => {
      it('initializes the missing customization fields with default values', () => {
        // We are purposefully setting this to a value that omits fields
        const externalRuleSource: BaseRuleParams['ruleSource'] = {
          type: 'external',
          isCustomized: true,
        };

        const externalResult = normalizeRuleSource({
          immutable: true,
          ruleSource: externalRuleSource,
        });

        expect(externalResult).toEqual({
          type: 'external',
          is_customized: true,
          customized_fields: [],
          has_base_version: true,
        });
      });
    });
  });
});
