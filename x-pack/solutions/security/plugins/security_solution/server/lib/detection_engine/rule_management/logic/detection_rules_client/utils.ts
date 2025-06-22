/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable max-classes-per-file */

import type { RulesClient } from '@kbn/alerting-plugin/server';

import type { Type } from '@kbn/securitysolution-io-ts-alerting-types';
import type { MlAuthz } from '../../../../machine_learning/authz';

import type { RuleSignatureId } from '../../../../../../common/api/detection_engine/model/rule_schema/common_attributes.gen';
import { throwAuthzError } from '../../../../machine_learning/validation';
import type { RuleResponse } from '../../../../../../common/api/detection_engine';

export const toggleRuleEnabledOnUpdate = async (
  rulesClient: RulesClient,
  existingRule: RuleResponse,
  updatedRule: RuleResponse
): Promise<{ enabled: boolean }> => {
  if (existingRule.enabled && !updatedRule.enabled) {
    await rulesClient.disableRule({ id: existingRule.id });
    return { enabled: false };
  }

  if (!existingRule.enabled && updatedRule.enabled) {
    await rulesClient.enableRule({ id: existingRule.id });
    return { enabled: true };
  }

  return { enabled: existingRule.enabled };
};

export const validateMlAuth = async (mlAuthz: MlAuthz, ruleType: Type) => {
  throwAuthzError(await mlAuthz.validateRuleType(ruleType));
};

export class ClientError extends Error {
  public readonly statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
  }
}

/**
 * Represents an error that occurred while validating a RuleResponse object.
 * Includes the ruleId (rule signature id) of the rule that failed validation.
 * Thrown when a rule does not match the RuleResponse schema.
 * @param message - The error message
 * @param ruleId - The rule signature id of the rule that failed validation
 * @extends Error
 */
export class RuleResponseValidationError extends Error {
  public readonly ruleId: RuleSignatureId;
  constructor({ message, ruleId }: { message: string; ruleId: RuleSignatureId }) {
    super(message);
    this.ruleId = ruleId;
  }
}

/**
 * Given a rule from the file system and the set of installed rules this will merge the exception lists
 * from the installed rules onto the rules from the file system.
 * @param latestPrebuiltRule The latest prepackaged rule version that might have exceptions_lists
 * @param existingRule The installed rules which might have user driven exceptions_lists
 */
export const mergeExceptionLists = (
  latestPrebuiltRule: RuleResponse,
  existingRule: RuleResponse
): RuleResponse => {
  if (latestPrebuiltRule.exceptions_list != null) {
    if (existingRule.exceptions_list != null) {
      const uniqueExceptionsLists = latestPrebuiltRule.exceptions_list.filter(
        (potentialDuplicateList) =>
          existingRule.exceptions_list.every(
            (list) => list.list_id !== potentialDuplicateList.list_id
          )
      );
      return {
        ...latestPrebuiltRule,
        exceptions_list: [...uniqueExceptionsLists, ...existingRule.exceptions_list],
      };
    } else {
      return latestPrebuiltRule;
    }
  } else {
    // Carry over the previous version's exception list
    latestPrebuiltRule.exceptions_list = existingRule.exceptions_list;
    return latestPrebuiltRule;
  }
};
