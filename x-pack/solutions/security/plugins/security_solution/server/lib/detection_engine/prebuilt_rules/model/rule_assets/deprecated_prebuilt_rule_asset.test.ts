/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectParseError, expectParseSuccess, stringifyZodError } from '@kbn/zod-helpers/v4';
import { DeprecatedPrebuiltRuleAsset } from './deprecated_prebuilt_rule_asset';
import { getDeprecatedPrebuiltRuleMock } from './deprecated_prebuilt_rule_asset.mock';

describe('Deprecated prebuilt rule asset schema', () => {
  test('validates a minimal deprecated rule asset', () => {
    const payload = getDeprecatedPrebuiltRuleMock();

    const result = DeprecatedPrebuiltRuleAsset.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('validates with optional deprecated_reason', () => {
    const payload = getDeprecatedPrebuiltRuleMock({
      deprecated_reason: 'Replaced by rule XYZ',
    });

    const result = DeprecatedPrebuiltRuleAsset.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('does not validate without rule_id', () => {
    const { rule_id, ...payload } = getDeprecatedPrebuiltRuleMock();

    const result = DeprecatedPrebuiltRuleAsset.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toContain('rule_id');
  });

  test('does not validate without version', () => {
    const { version, ...payload } = getDeprecatedPrebuiltRuleMock();

    const result = DeprecatedPrebuiltRuleAsset.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toContain('version');
  });

  test('does not validate without name', () => {
    const { name, ...payload } = getDeprecatedPrebuiltRuleMock();

    const result = DeprecatedPrebuiltRuleAsset.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toContain('name');
  });

  test('does not validate without deprecated field', () => {
    const { deprecated, ...payload } = getDeprecatedPrebuiltRuleMock();

    const result = DeprecatedPrebuiltRuleAsset.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toContain('deprecated');
  });

  test('does not validate when deprecated is false', () => {
    const payload = {
      ...getDeprecatedPrebuiltRuleMock(),
      deprecated: false,
    };

    const result = DeprecatedPrebuiltRuleAsset.safeParse(payload);
    expectParseError(result);
  });

  test('does not validate with an empty object', () => {
    const result = DeprecatedPrebuiltRuleAsset.safeParse({});
    expectParseError(result);
  });

  test('strips unknown fields', () => {
    const payload = {
      ...getDeprecatedPrebuiltRuleMock(),
      unknown_field: 'should be stripped',
    };

    const result = DeprecatedPrebuiltRuleAsset.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).not.toHaveProperty('unknown_field');
  });
});
