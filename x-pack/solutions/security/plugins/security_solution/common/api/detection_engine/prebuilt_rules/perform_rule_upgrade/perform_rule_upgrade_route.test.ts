/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { expectParseError, expectParseSuccess, stringifyZodError } from '@kbn/zod-helpers';
import {
  RuleUpgradeSpecifier,
  UpgradeSpecificRulesRequest,
  UpgradeAllRulesRequest,
  PerformRuleUpgradeResponseBody,
  PerformRuleUpgradeRequestBody,
  RuleFieldsToUpgrade,
  DiffableUpgradableFields,
  PickVersionValues,
} from './perform_rule_upgrade_route';

describe('Perform Rule Upgrade Route Schemas', () => {
  describe('PickVersionValues', () => {
    test('validates correct enum values', () => {
      const validValues = ['BASE', 'CURRENT', 'TARGET', 'MERGED'];
      validValues.forEach((value) => {
        const result = PickVersionValues.safeParse(value);
        expectParseSuccess(result);
        expect(result.data).toBe(value);
      });
    });

    test('rejects invalid enum values', () => {
      const invalidValues = ['RESOLVED', 'MALFORMED_STRING'];
      invalidValues.forEach((value) => {
        const result = PickVersionValues.safeParse(value);
        expectParseError(result);
        expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
          `"Invalid enum value. Expected 'BASE' | 'CURRENT' | 'TARGET' | 'MERGED', received '${value}'"`
        );
      });
    });
  });

  describe('RuleFieldsToUpgrade', () => {
    it('contains only upgradable fields defined in the diffable rule schemas', () => {
      expect(Object.keys(RuleFieldsToUpgrade.shape)).toStrictEqual(
        Object.keys(DiffableUpgradableFields.shape)
      );
    });

    describe('correctly validates valid and invalid inputs', () => {
      it('validates 5 valid cases: BASE, CURRENT, TARGET, MERGED, RESOLVED', () => {
        const validInputs = [
          {
            name: {
              pick_version: 'BASE',
            },
          },
          {
            description: {
              pick_version: 'CURRENT',
            },
          },
          {
            risk_score: {
              pick_version: 'TARGET',
            },
          },
          {
            note: {
              pick_version: 'MERGED',
            },
          },
          {
            references: {
              pick_version: 'RESOLVED',
              resolved_value: ['www.example.com'],
            },
          },
        ];

        validInputs.forEach((input) => {
          const result = RuleFieldsToUpgrade.safeParse(input);
          expectParseSuccess(result);
          expect(result.data).toEqual(input);
        });
      });

      it('does not validate invalid combination of pick_version and resolved_value', () => {
        const input = {
          references: {
            pick_version: 'MERGED',
            resolved_value: ['www.example.com'],
          },
        };
        const result = RuleFieldsToUpgrade.safeParse(input);
        expectParseError(result);
        expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
          `"references: Unrecognized key(s) in object: 'resolved_value'"`
        );
      });

      it('invalidates incorrect types of resolved_values provided to multiple fields', () => {
        const input = {
          references: {
            pick_version: 'RESOLVED',
            resolved_value: 'www.example.com',
          },
          tags: {
            pick_version: 'RESOLVED',
            resolved_value: 4,
          },
        };
        const result = RuleFieldsToUpgrade.safeParse(input);
        expectParseError(result);
        expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
          `"tags.resolved_value: Expected array, received number, references.resolved_value: Expected array, received string"`
        );
      });

      it('invalidates unknown fields', () => {
        const input = {
          unknown_field: {
            pick_version: 'CURRENT',
          },
        };
        const result = RuleFieldsToUpgrade.safeParse(input);
        expectParseError(result);
        expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
          `"Unrecognized key(s) in object: 'unknown_field'"`
        );
      });

      it('invalidates rule fields not part of RuleFieldsToUpgrade', () => {
        const input = {
          type: {
            pick_version: 'BASE',
          },
          rule_id: {
            pick_version: 'CURRENT',
          },
          version: {
            pick_version: 'TARGET',
          },
          author: {
            pick_version: 'MERGED',
          },
          license: {
            pick_version: 'RESOLVED',
            resolved_value: 'Elastic License',
          },
          concurrent_searches: {
            pick_version: 'TARGET',
          },
          items_per_search: {
            pick_version: 'TARGET',
          },
        };
        const result = RuleFieldsToUpgrade.safeParse(input);
        expectParseError(result);
        expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
          `"Unrecognized key(s) in object: 'type', 'rule_id', 'version', 'author', 'license', 'concurrent_searches', 'items_per_search'"`
        );
      });
    });
  });

  describe('RuleUpgradeSpecifier', () => {
    const validSpecifier = {
      rule_id: 'rule-1',
      revision: 1,
      version: 1,
      pick_version: 'TARGET',
    };

    test('validates a valid upgrade specifier without fields property', () => {
      const result = RuleUpgradeSpecifier.safeParse(validSpecifier);
      expectParseSuccess(result);
      expect(result.data).toEqual(validSpecifier);
    });

    test('validates a valid upgrade specifier with a valid field property', () => {
      const specifierWithFields = {
        ...validSpecifier,
        fields: {
          name: {
            pick_version: 'CURRENT',
          },
        },
      };
      const result = RuleUpgradeSpecifier.safeParse(specifierWithFields);
      expectParseSuccess(result);
      expect(result.data).toEqual(specifierWithFields);
    });

    test('rejects an upgrade specifier with an invalid fields property', () => {
      const specifierWithFields = {
        ...validSpecifier,
        fields: {
          unknown_field: {
            pick_version: 'CURRENT',
          },
        },
      };
      const result = RuleUpgradeSpecifier.safeParse(specifierWithFields);
      expectParseError(result);
      expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
        `"fields: Unrecognized key(s) in object: 'unknown_field'"`
      );
    });

    test('rejects an upgrade specifier with a field property with an invalid type', () => {
      const specifierWithFields = {
        ...validSpecifier,
        fields: {
          name: {
            pick_version: 'CURRENT',
            resolved_value: 'My name',
          },
        },
      };
      const result = RuleUpgradeSpecifier.safeParse(specifierWithFields);
      expectParseError(result);
      expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
        `"fields.name: Unrecognized key(s) in object: 'resolved_value'"`
      );
    });

    test('rejects upgrade specifier with invalid pick_version rule_id', () => {
      const invalid = { ...validSpecifier, rule_id: 123 };
      const result = RuleUpgradeSpecifier.safeParse(invalid);
      expectParseError(result);
      expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
        `"rule_id: Expected string, received number"`
      );
    });
  });

  describe('UpgradeSpecificRulesRequest', () => {
    const validRequest = {
      mode: 'SPECIFIC_RULES',
      rules: [
        {
          rule_id: 'rule-1',
          revision: 1,
          version: 1,
        },
      ],
    };

    test('validates a correct upgrade specific rules request', () => {
      const result = UpgradeSpecificRulesRequest.safeParse(validRequest);
      expectParseSuccess(result);
      expect(result.data).toEqual(validRequest);
    });

    test('rejects invalid mode', () => {
      const invalid = { ...validRequest, mode: 'INVALID_MODE' };
      const result = UpgradeSpecificRulesRequest.safeParse(invalid);
      expectParseError(result);
      expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
        `"mode: Invalid literal value, expected \\"SPECIFIC_RULES\\""`
      );
    });

    test('rejects paylaod with missing rules array', () => {
      const invalid = { ...validRequest, rules: undefined };
      const result = UpgradeSpecificRulesRequest.safeParse(invalid);
      expectParseError(result);
      expect(stringifyZodError(result.error)).toMatchInlineSnapshot(`"rules: Required"`);
    });
  });

  describe('UpgradeAllRulesRequest', () => {
    const validRequest = {
      mode: 'ALL_RULES',
    };

    test('validates a correct upgrade all rules request', () => {
      const result = UpgradeAllRulesRequest.safeParse(validRequest);
      expectParseSuccess(result);
      expect(result.data).toEqual(validRequest);
    });

    test('allows optional pick_version', () => {
      const withPickVersion = { ...validRequest, pick_version: 'BASE' };
      const result = UpgradeAllRulesRequest.safeParse(withPickVersion);
      expectParseSuccess(result);
      expect(result.data).toEqual(withPickVersion);
    });
  });

  describe('PerformRuleUpgradeRequestBody', () => {
    test('validates a correct upgrade specific rules request', () => {
      const validRequest = {
        mode: 'SPECIFIC_RULES',
        pick_version: 'BASE',
        rules: [
          {
            rule_id: 'rule-1',
            revision: 1,
            version: 1,
          },
        ],
      };
      const result = PerformRuleUpgradeRequestBody.safeParse(validRequest);
      expectParseSuccess(result);
      expect(result.data).toEqual(validRequest);
    });

    test('validates a correct upgrade all rules request', () => {
      const validRequest = {
        mode: 'ALL_RULES',
        pick_version: 'BASE',
      };
      const result = PerformRuleUpgradeRequestBody.safeParse(validRequest);
      expectParseSuccess(result);
      expect(result.data).toEqual(validRequest);
    });

    test('rejects invalid mode', () => {
      const invalid = { mode: 'INVALID_MODE' };
      const result = PerformRuleUpgradeRequestBody.safeParse(invalid);
      expectParseError(result);
      expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
        `"mode: Invalid discriminator value. Expected 'ALL_RULES' | 'SPECIFIC_RULES'"`
      );
    });
  });

  describe('PerformRuleUpgradeResponseBody', () => {
    const validResponse = {
      summary: {
        total: 1,
        succeeded: 1,
        skipped: 0,
        failed: 0,
      },
      results: {
        updated: [],
        skipped: [],
      },
      errors: [],
    };

    test('validates a correct perform rule upgrade response', () => {
      const result = PerformRuleUpgradeResponseBody.safeParse(validResponse);
      expectParseSuccess(result);
      expect(result.data).toEqual(validResponse);
    });

    test('rejects missing required fields', () => {
      const propsToDelete = Object.keys(validResponse);
      propsToDelete.forEach((deletedProp) => {
        const invalidResponse = Object.fromEntries(
          Object.entries(validResponse).filter(([key]) => key !== deletedProp)
        );
        const result = PerformRuleUpgradeResponseBody.safeParse(invalidResponse);
        expectParseError(result);
        expect(stringifyZodError(result.error)).toMatchInlineSnapshot(`"${deletedProp}: Required"`);
      });
    });
  });
});
