/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as z from '@kbn/zod/v4';
import {
  PrebuiltAssetBaseProps,
  PrebuiltRuleAssetIdentityFields,
} from '../../../model/rule_assets/prebuilt_rule_asset';
import { TypeSpecificCreatePropsInternal } from '../../../../../../../common/api/detection_engine/model/rule_schema';
import { PREBUILT_RULE_ASSET_BASELINE_FIELDS } from './build_source_includes';

const requiredKeysWithOptinUndefined = (shape: z.ZodRawShape): string[] =>
  Object.entries(shape)
    .filter(([, def]) => def._zod.optin === undefined)
    .map(([key]) => key);

/** Previous predicate; on zod >= 4.5 treats `.default()` fields as required. */
const requiredKeysLegacyPredicate = (shape: z.ZodRawShape): string[] =>
  Object.entries(shape)
    .filter(([, def]) => def._zod.optin !== 'optional')
    .map(([key]) => key);

const computeBaselineWith = (predicate: (shape: z.ZodRawShape) => string[]): Set<string> =>
  new Set([
    ...predicate(PrebuiltAssetBaseProps.shape),
    ...TypeSpecificCreatePropsInternal.options.flatMap((v) => predicate(v.shape as z.ZodRawShape)),
    ...predicate(PrebuiltRuleAssetIdentityFields.shape),
  ]);

describe('build_source_includes', () => {
  describe('requiredKeysOf predicate', () => {
    it('includes only keys with undefined optin (required), not optional or defaulted', () => {
      const shape = {
        required_field: z.string(),
        optional_field: z.string().optional(),
        default_field: z.string().default('default-value'),
      } satisfies z.ZodRawShape;

      expect(requiredKeysWithOptinUndefined(shape)).toEqual(['required_field']);
      expect(shape.optional_field._zod.optin).toBe('optional');
      expect(shape.default_field._zod.optin).toBe('defaulted');
    });
  });

  describe('PREBUILT_RULE_ASSET_BASELINE_FIELDS', () => {
    it('includes required prebuilt fields and excludes optional ones', () => {
      expect(PREBUILT_RULE_ASSET_BASELINE_FIELDS.has('name')).toBe(true);
      expect(PREBUILT_RULE_ASSET_BASELINE_FIELDS.has('rule_id')).toBe(true);
      expect(PREBUILT_RULE_ASSET_BASELINE_FIELDS.has('type')).toBe(true);
      expect(PREBUILT_RULE_ASSET_BASELINE_FIELDS.has('note')).toBe(false);
    });

    it('matches the optin === undefined baseline and differs from the legacy predicate only for defaulted keys', () => {
      const expected = computeBaselineWith(requiredKeysWithOptinUndefined);
      expect(PREBUILT_RULE_ASSET_BASELINE_FIELDS).toEqual(expected);

      const legacyBaseline = computeBaselineWith(requiredKeysLegacyPredicate);
      const onlyInLegacy = [...legacyBaseline].filter(
        (key) => !PREBUILT_RULE_ASSET_BASELINE_FIELDS.has(key)
      );
      const onlyInCurrent = [...PREBUILT_RULE_ASSET_BASELINE_FIELDS].filter(
        (key) => !legacyBaseline.has(key)
      );

      expect(onlyInCurrent).toEqual([]);

      for (const key of onlyInLegacy) {
        const fromBase =
          PrebuiltAssetBaseProps.shape[key as keyof typeof PrebuiltAssetBaseProps.shape];
        const fromUnion = TypeSpecificCreatePropsInternal.options
          .map((v) => (v.shape as z.ZodRawShape)[key])
          .find(Boolean);
        const fieldDef = fromBase ?? fromUnion;
        expect(fieldDef?._zod.optin).toBe('defaulted');
      }
    });
  });
});
