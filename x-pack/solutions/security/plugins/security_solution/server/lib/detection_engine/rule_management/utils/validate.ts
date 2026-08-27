/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PartialRule } from '@kbn/alerting-plugin/server';
import { isEqual } from 'lodash';
import type { z } from '@kbn/zod/v4';
import { stringifyZodError } from '@kbn/zod-helpers/v4';
import { BadRequestError } from '@kbn/securitysolution-es-utils';
import {
  EqlRulePatchProps,
  EsqlRulePatchProps,
  MachineLearningRulePatchProps,
  NewTermsRulePatchProps,
  QueryRulePatchProps,
  type RulePatchProps,
  RuleResponse,
  type RuleUpdateProps,
  SavedQueryRulePatchProps,
  ThreatMatchRulePatchProps,
  ThresholdRulePatchProps,
} from '../../../../../common/api/detection_engine';
import { hasValidRuleType, type RuleParams } from '../../rule_schema';
import { type BulkError, createBulkErrorObject } from '../../routes/utils';
import { internalRuleToAPIResponse } from '../logic/detection_rules_client/converters/internal_rule_to_api_response';
import { ClientError } from '../logic/detection_rules_client/utils';

export const transformValidateBulkError = (
  ruleId: string,
  rule: PartialRule<RuleParams>
): RuleResponse | BulkError => {
  if (hasValidRuleType(rule)) {
    const transformed = internalRuleToAPIResponse(rule);
    const result = RuleResponse.safeParse(transformed);
    if (!result.success) {
      return createBulkErrorObject({
        ruleId,
        statusCode: 500,
        message: stringifyZodError(result.error),
      });
    }
    return result.data;
  } else {
    return createBulkErrorObject({
      ruleId,
      statusCode: 500,
      message: 'Internal error transforming',
    });
  }
};

export const validateNonCustomizableUpdateFields = (
  ruleUpdate: RuleUpdateProps,
  existingRule: RuleResponse
) => {
  // We don't allow non-customizable fields to be changed for prebuilt rules
  if (existingRule.rule_source && existingRule.rule_source.type === 'external') {
    if (!isEqual(ruleUpdate.author, existingRule.author)) {
      throw new ClientError(`Cannot update "author" field for prebuilt rules`, 400);
    } else if (ruleUpdate.license !== existingRule.license) {
      throw new ClientError(`Cannot update "license" field for prebuilt rules`, 400);
    }
  }
};

const RULE_PATCH_SCHEMA_BY_TYPE: Record<RuleResponse['type'], z.ZodType> = {
  eql: EqlRulePatchProps,
  query: QueryRulePatchProps,
  saved_query: SavedQueryRulePatchProps,
  threshold: ThresholdRulePatchProps,
  threat_match: ThreatMatchRulePatchProps,
  machine_learning: MachineLearningRulePatchProps,
  new_terms: NewTermsRulePatchProps,
  esql: EsqlRulePatchProps,
};

/**
 * Validates a raw PATCH request body against the patch schema of the existing rule's type.
 *
 * `type` is optional in PATCH bodies, so the route cannot validate against the
 * `RulePatchProps` union upfront: a typeless body matches the union's first branch and its
 * strip-mode parsing silently drops the actual type's specific fields (e.g. `threshold`).
 * Validating after the existing rule is read selects the correct schema; a `type` in the
 * body that contradicts the rule's actual type fails the branch's literal check here.
 */
export const validateRulePatchByRuleType = (
  body: unknown,
  ruleType: RuleResponse['type']
): RulePatchProps => {
  const result = RULE_PATCH_SCHEMA_BY_TYPE[ruleType].safeParse(body);
  if (!result.success) {
    throw new BadRequestError(stringifyZodError(result.error));
  }
  return result.data as RulePatchProps;
};

export const validateNonCustomizablePatchFields = (
  rulePatch: RulePatchProps,
  existingRule: RuleResponse
) => {
  // We don't allow non-customizable fields to be changed for prebuilt rules
  if (existingRule.rule_source && existingRule.rule_source.type === 'external') {
    if (rulePatch.author && !isEqual(rulePatch.author, existingRule.author)) {
      throw new ClientError(`Cannot update "author" field for prebuilt rules`, 400);
    } else if (rulePatch.license != null && rulePatch.license !== existingRule.license) {
      throw new ClientError(`Cannot update "license" field for prebuilt rules`, 400);
    }
  }
};
