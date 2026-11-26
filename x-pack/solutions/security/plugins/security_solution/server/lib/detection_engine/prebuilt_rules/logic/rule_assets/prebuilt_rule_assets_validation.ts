/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { stringifyZodError } from '@kbn/zod-helpers/v4';
import { BadRequestError } from '@kbn/securitysolution-es-utils';
import {
  PrebuiltRuleAsset,
  type PrebuiltRuleAssetRecord,
} from '../../model/rule_assets/prebuilt_rule_asset';
import { DeprecatedPrebuiltRuleAsset } from '../../model/rule_assets/deprecated_prebuilt_rule_asset';

export const validatePrebuiltRuleAssets = (
  rules: PrebuiltRuleAsset[]
): PrebuiltRuleAssetRecord[] => {
  return rules.map((rule) => validatePrebuiltRuleAsset(rule));
};

// Parsing drops fields the asset schema does not know, so the ones that say where a rule came from are
// read first and put back after.
const readLibraryFields = (
  rule: PrebuiltRuleAsset
): Pick<PrebuiltRuleAssetRecord, 'library_id' | 'library_title' | 'library_path'> => {
  const {
    library_id: id,
    library_title: title,
    library_path: path,
  } = rule as {
    library_id?: string;
    library_title?: string;
    library_path?: string;
  };
  return {
    ...(id ? { library_id: id } : {}),
    ...(title ? { library_title: title } : {}),
    ...(path ? { library_path: path } : {}),
  };
};

export const validatePrebuiltRuleAsset = (rule: PrebuiltRuleAsset): PrebuiltRuleAssetRecord => {
  const libraryFields = readLibraryFields(rule);
  const result = PrebuiltRuleAsset.safeParse(rule);

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

  return { ...result.data, ...libraryFields };
};

export const validateDeprecatedRuleAssets = (
  rules: DeprecatedPrebuiltRuleAsset[]
): DeprecatedPrebuiltRuleAsset[] => {
  return rules.map((rule) => validateDeprecatedRuleAsset(rule));
};

export const validateDeprecatedRuleAsset = (
  rule: DeprecatedPrebuiltRuleAsset
): DeprecatedPrebuiltRuleAsset => {
  const result = DeprecatedPrebuiltRuleAsset.safeParse(rule);

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
