/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable max-classes-per-file */

import type { BulkOperationError, RulesClient } from '@kbn/alerting-plugin/server';

import type { Type } from '@kbn/securitysolution-io-ts-alerting-types';
import { camelCase, isEmpty } from 'lodash';
import type { ValidReadAuthEditFields } from '@kbn/alerting-plugin/common/constants';
import { validFields } from '@kbn/alerting-plugin/common/constants';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { BulkEditResult } from '@kbn/alerting-plugin/server/rules_client/common/bulk_edit/types';

import type { MlAuthz } from '../../../../machine_learning/authz';

import type { RuleSignatureId } from '../../../../../../common/api/detection_engine/model/rule_schema/common_attributes.gen';
import { throwAuthzError } from '../../../../machine_learning/validation';
import type { RulePatchProps, RuleResponse } from '../../../../../../common/api/detection_engine';
import type { RuleParams } from '../../../rule_schema';
import { convertRuleResponseToAlertingRule } from './converters/convert_rule_response_to_alerting_rule';
import type { IPrebuiltRuleAssetsClient } from '../../../prebuilt_rules/logic/rule_assets/prebuilt_rule_assets_client';
import { applyRulePatch } from './mergers/apply_rule_patch';

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

/**
 * Typeguard to determine if given key is one of
 * valid string literals for editable rule fields
 * with read authz
 * @param someKey unknown
 * @returns boolean
 */
export const isEveryReadKeyValid = (someKey: unknown): someKey is ValidReadAuthEditFields =>
  someKey != null &&
  typeof someKey === 'string' &&
  Object.values(validFields).includes(camelCase(someKey) as ValidReadAuthEditFields);

/**
 * utility for throwing errors found in bulk patch response
 * @param appliedPatchesWithReadPrivs Array<BulkEditResult<RuleParams>>
 */
export const gatherErrors = (appliedPatchesWithReadPrivs: Array<BulkEditResult<RuleParams>>) => {
  if (appliedPatchesWithReadPrivs.some((patchResp) => !isEmpty(patchResp.errors))) {
    // gather errors
    const errors = appliedPatchesWithReadPrivs.reduce((acc, patches) => {
      const theErrors = patches.errors;
      return patches.errors != null ? acc.concat(theErrors) : acc;
    }, [] as BulkOperationError[]);
    throw new Error(errors.reduce((acc, error) => `${acc}\n${error.message}`, ''));
  }
};

/**
 * Generate parameter for editable rule field
 * with read authz
 * @param field
 * @param rulePatch
 * @param existingRule
 * @returns
 */
export const getReadAuthFieldValue = (
  field: string,
  rulePatch: RulePatchProps,
  existingRule: RuleResponse
) => {
  if (
    camelCase(field) === validFields.EXCEPTIONS_LIST &&
    !isEmpty(rulePatch.exceptions_list) &&
    rulePatch.exceptions_list != null
  ) {
    const ruleExceptionLists = existingRule.exceptions_list;
    return [
      ...ruleExceptionLists,
      ...rulePatch.exceptions_list.map((exceptionList) => ({
        id: exceptionList.id,
        list_id: exceptionList.list_id,
        type: exceptionList.type,
        namespace_type: exceptionList.namespace_type,
      })),
    ];
  }
};

/**
 * Applies the `bulkEditRUleParamsWithReadAuth` function
 * to patch rule field values
 * @param rulesClient
 * @param rulePatch
 * @param existingRule
 * @returns
 */
export const applyPatchRuleWithReadPrivileges = async (
  rulesClient: RulesClient,
  rulePatch: RulePatchProps, // make this a type
  existingRule: RuleResponse
): Promise<Array<BulkEditResult<RuleParams>>> => {
  const validFieldValues = Object.values(validFields);
  return Promise.all(
    validFieldValues.map(async (field) =>
      rulesClient.bulkEditRuleParamsWithReadAuth<RuleParams>({
        ids: [existingRule.id],
        operations: [
          {
            field,
            operation: 'set',
            value: getReadAuthFieldValue(field, rulePatch, existingRule),
          },
        ],
      })
    )
  );
};

/**
 * Determines which patch function to apply to
 * the rule object based on the fields we are patching
 *
 * If the fields are all included in the `validFields` type
 * we can check if the user has read authz privileges for rules
 * and use the special function provided to us by the alerting
 * rules client. Otherwise the user will need `all` privilegs
 * for rules.
 * properties we are patching on the rule.
 * @param rulesClient
 * @param rulePatch
 * @param existingRule
 * @returns SanitizedRule
 */
export const patchApplicator = async (
  rulesClient: RulesClient,
  actionsClient: ActionsClient,
  rulePatch: RulePatchProps,
  existingRule: RuleResponse,
  prebuiltRuleAssetClient: IPrebuiltRuleAssetsClient
) => {
  if (Object.keys(rulePatch).every((key) => isEveryReadKeyValid(key))) {
    const appliedPatchesWithReadPrivs: Array<BulkEditResult<RuleParams>> =
      await applyPatchRuleWithReadPrivileges(rulesClient, rulePatch, existingRule);

    // gather and throw errors from bulk operation
    gatherErrors(appliedPatchesWithReadPrivs);
    return appliedPatchesWithReadPrivs[0].rules[0];
  } else {
    const patchedRule = await applyRulePatch({
      prebuiltRuleAssetClient,
      existingRule,
      rulePatch,
    });

    const patchedInternalRule = await rulesClient.update({
      id: existingRule.id,
      data: convertRuleResponseToAlertingRule(patchedRule, actionsClient),
    });

    const { enabled } = await toggleRuleEnabledOnUpdate(rulesClient, existingRule, patchedRule);

    return { ...patchedInternalRule, enabled };
  }
};
