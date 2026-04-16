/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { stringifyZodError } from '@kbn/zod-helpers/v4';
import { BadRequestError } from '@kbn/securitysolution-es-utils';
import type { PrebuiltRuleAsset } from '../../model/rule_assets/prebuilt_rule_asset';
import type { DeprecatedPrebuiltRuleAsset } from '../../model/rule_assets/deprecated_prebuilt_rule_asset';

/**
 * Zod schemas from .gen.ts files are heavy on memory. Loading them lazily via
 * dynamic import() keeps the schema chain out of the heap until validation is
 * actually needed. Node.js caches the module after the first import() call,
 * so subsequent invocations resolve instantly.
 */
const loadPrebuiltRuleAssetSchema = async () => {
  const { PrebuiltRuleAsset: schema } = await import('../../model/rule_assets/prebuilt_rule_asset');
  return schema;
};

const loadDeprecatedPrebuiltRuleAssetSchema = async () => {
  const { DeprecatedPrebuiltRuleAsset: schema } = await import(
    '../../model/rule_assets/deprecated_prebuilt_rule_asset'
  );
  return schema;
};

export const validatePrebuiltRuleAssets = async (
  rules: PrebuiltRuleAsset[]
): Promise<PrebuiltRuleAsset[]> => {
  const schema = await loadPrebuiltRuleAssetSchema();
  return rules.map((rule) => {
    const result = schema.safeParse(rule);

    if (!result.success) {
      const ruleName = rule.name ? rule.name : '(rule name unknown)';
      const ruleId = rule.rule_id ? rule.rule_id : '(rule rule_id unknown)';
      throw new BadRequestError(
        `name: "${ruleName}", rule_id: "${ruleId}" within the security-rule saved object ` +
          `is not a valid detection engine rule. Expect the system ` +
          `to not work with pre-packaged rules until this rule is fixed ` +
          `or the file is removed. Error is: ${stringifyZodError(
            result.error
          )}, Full rule contents are:\n${JSON.stringify(rule, null, 2)}`
      );
    }

    return result.data;
  });
};

export const validatePrebuiltRuleAsset = async (
  rule: PrebuiltRuleAsset
): Promise<PrebuiltRuleAsset> => {
  const schema = await loadPrebuiltRuleAssetSchema();
  const result = schema.safeParse(rule);

  if (!result.success) {
    const ruleName = rule.name ? rule.name : '(rule name unknown)';
    const ruleId = rule.rule_id ? rule.rule_id : '(rule rule_id unknown)';
    throw new BadRequestError(
      `name: "${ruleName}", rule_id: "${ruleId}" within the security-rule saved object ` +
        `is not a valid detection engine rule. Expect the system ` +
        `to not work with pre-packaged rules until this rule is fixed ` +
        `or the file is removed. Error is: ${stringifyZodError(
          result.error
        )}, Full rule contents are:\n${JSON.stringify(rule, null, 2)}`
    );
  }

  return result.data;
};

export const validateDeprecatedRuleAssets = async (
  rules: DeprecatedPrebuiltRuleAsset[]
): Promise<DeprecatedPrebuiltRuleAsset[]> => {
  const schema = await loadDeprecatedPrebuiltRuleAssetSchema();
  return rules.map((rule) => {
    const result = schema.safeParse(rule);

    if (!result.success) {
      const ruleName = rule.name ? rule.name : '(rule name unknown)';
      const ruleId = rule.rule_id ? rule.rule_id : '(rule rule_id unknown)';
      throw new BadRequestError(
        `name: "${ruleName}", rule_id: "${ruleId}" within the security-rule saved object ` +
          `is not a valid deprecated rule asset. Error is: ${stringifyZodError(
            result.error
          )}, Full rule contents are:\n${JSON.stringify(rule, null, 2)}`
      );
    }

    return result.data;
  });
};

export const validateDeprecatedRuleAsset = async (
  rule: DeprecatedPrebuiltRuleAsset
): Promise<DeprecatedPrebuiltRuleAsset> => {
  const schema = await loadDeprecatedPrebuiltRuleAssetSchema();
  const result = schema.safeParse(rule);

  if (!result.success) {
    const ruleName = rule.name ? rule.name : '(rule name unknown)';
    const ruleId = rule.rule_id ? rule.rule_id : '(rule rule_id unknown)';
    throw new BadRequestError(
      `name: "${ruleName}", rule_id: "${ruleId}" within the security-rule saved object ` +
        `is not a valid deprecated rule asset. Error is: ${stringifyZodError(
          result.error
        )}, Full rule contents are:\n${JSON.stringify(rule, null, 2)}`
    );
  }

  return result.data;
};
