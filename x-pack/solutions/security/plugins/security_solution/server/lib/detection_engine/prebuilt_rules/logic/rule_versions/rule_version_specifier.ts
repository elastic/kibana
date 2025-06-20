/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Type } from '@kbn/securitysolution-io-ts-alerting-types';
import type {
  RuleSignatureId,
  RuleVersion,
} from '../../../../../../common/api/detection_engine/model/rule_schema';
import type { MlAuthz } from '../../../../machine_learning/authz';

export interface RuleVersionSpecifier {
  rule_id: RuleSignatureId;
  version: RuleVersion;
}

export interface BasicRuleInfo extends RuleVersionSpecifier {
  type: Type;
}

export async function excludeLicenseRestrictedRules<T extends { type: Type }>(
  rules: T[],
  mlAuthz: MlAuthz
): Promise<T[]> {
  const validationResults = await Promise.all(
    rules.map((rule) => mlAuthz.validateRuleType(rule.type))
  );

  // Filter out rules that are not valid due to insufficient license
  return rules.filter((_rule, index) => validationResults[index].valid);
}
