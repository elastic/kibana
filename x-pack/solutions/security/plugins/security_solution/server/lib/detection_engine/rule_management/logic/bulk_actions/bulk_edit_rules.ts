/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { RulesClient } from '@kbn/alerting-plugin/server';

import { convertObjectKeysToCamelCase } from '../../../../../utils/object_case_converters';
import type { BulkActionEditPayload } from '../../../../../../common/api/detection_engine/rule_management';

import type { MlAuthz } from '../../../../machine_learning/authz';

import type { RuleAlertType, RuleParams } from '../../../rule_schema';

import type { IPrebuiltRuleAssetsClient } from '../../../prebuilt_rules/logic/rule_assets/prebuilt_rule_assets_client';
import { convertAlertingRuleToRuleResponse } from '../detection_rules_client/converters/convert_alerting_rule_to_rule_response';
import { calculateExternalRuleSource } from '../detection_rules_client/mergers/rule_source/calculate_external_rule_source';
import { bulkEditActionToRulesClientOperation } from './action_to_rules_client_operation';
import { ruleParamsModifier } from './rule_params_modifier';
import { splitBulkEditActions } from './split_bulk_edit_actions';
import { validateBulkEditRule } from './validations';
import type { PrebuiltRulesCustomizationStatus } from '../../../../../../common/detection_engine/prebuilt_rules/prebuilt_rule_customization_status';
import { invariant } from '../../../../../../common/utils/invariant';
import { createDefaultInternalRuleSource } from '../detection_rules_client/mergers/rule_source/create_default_internal_rule_source';

export interface BulkEditRulesArguments {
  actionsClient: ActionsClient;
  rulesClient: RulesClient;
  prebuiltRuleAssetClient: IPrebuiltRuleAssetsClient;
  actions: BulkActionEditPayload[];
  rules: RuleAlertType[];
  mlAuthz: MlAuthz;
  ruleCustomizationStatus: PrebuiltRulesCustomizationStatus;
}

/**
 * calls rulesClient.bulkEdit
 * transforms bulk actions payload into rulesClient compatible operations
 * enriches query filter with rule types search queries
 * @param BulkEditRulesArguments
 * @returns edited rules and caught errors
 */
export const bulkEditRules = async ({
  actionsClient,
  rulesClient,
  prebuiltRuleAssetClient,
  rules,
  actions,
  mlAuthz,
  ruleCustomizationStatus,
}: BulkEditRulesArguments) => {
  // Split operations
  const { attributesActions, paramsActions } = splitBulkEditActions(actions);
  const operations = attributesActions
    .map((attribute) => bulkEditActionToRulesClientOperation(actionsClient, attribute))
    .flat();

  // Check if there are any prebuilt rules and fetch their base versions
  const prebuiltRules = rules.filter((rule) => rule.params.immutable);
  const baseVersions = await prebuiltRuleAssetClient.fetchAssetsByVersion(
    prebuiltRules.map((rule) => ({
      rule_id: rule.params.ruleId,
      version: rule.params.version,
    }))
  );
  const baseVersionsMap = new Map(
    baseVersions.map((baseVersion) => [baseVersion.rule_id, baseVersion])
  );
  const currentRulesMap = new Map(rules.map((rule) => [rule.id, rule]));

  const result = await rulesClient.bulkEdit<RuleParams>({
    ids: Array.from(currentRulesMap.keys()),
    operations,
    // Rules Client applies operations to rules client aware fields like tags
    // the rule before passing it to paramsModifier().
    paramsModifier: async (partiallyModifiedRule) => {
      const ruleParams = partiallyModifiedRule.params;

      await validateBulkEditRule({
        mlAuthz,
        ruleType: ruleParams.type,
        edit: actions,
        immutable: ruleParams.immutable,
        ruleCustomizationStatus,
      });

      const currentRule = currentRulesMap.get(partiallyModifiedRule.id);

      invariant(currentRule, "Unable to extract rule's current data in paramsModifier");

      const { modifiedParams, isParamsUpdateSkipped } = ruleParamsModifier(
        ruleParams,
        paramsActions
      );

      const nextRule = convertAlertingRuleToRuleResponse({
        ...partiallyModifiedRule,
        params: modifiedParams,
      });

      if (nextRule.immutable === true) {
        const baseRule = baseVersionsMap.get(nextRule.rule_id);
        const ruleSource = calculateExternalRuleSource({
          baseRule,
          currentRule: convertAlertingRuleToRuleResponse(currentRule),
          nextRule,
        });

        modifiedParams.ruleSource = convertObjectKeysToCamelCase(ruleSource);
      } else {
        modifiedParams.ruleSource = createDefaultInternalRuleSource();
      }

      return { modifiedParams, isParamsUpdateSkipped };
    },
  });

  return result;
};
