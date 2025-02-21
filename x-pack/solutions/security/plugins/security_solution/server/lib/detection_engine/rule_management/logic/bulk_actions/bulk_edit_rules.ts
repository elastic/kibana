/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { RulesClient } from '@kbn/alerting-plugin/server';

import type { BulkActionEditPayload } from '../../../../../../common/api/detection_engine/rule_management';

import type { MlAuthz } from '../../../../machine_learning/authz';

import type { RuleAlertType, RuleParams } from '../../../rule_schema';

import type { IPrebuiltRuleAssetsClient } from '../../../prebuilt_rules/logic/rule_assets/prebuilt_rule_assets_client';
import { convertAlertingRuleToRuleResponse } from '../detection_rules_client/converters/convert_alerting_rule_to_rule_response';
import { calculateIsCustomized } from '../detection_rules_client/mergers/rule_source/calculate_is_customized';
import { bulkEditActionToRulesClientOperation } from './action_to_rules_client_operation';
import { ruleParamsModifier } from './rule_params_modifier';
import { splitBulkEditActions } from './split_bulk_edit_actions';
import { validateBulkEditRule } from './validations';
import type { PrebuiltRulesCustomizationStatus } from '../../../../../../common/detection_engine/prebuilt_rules/prebuilt_rule_customization_status';

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

  const result = await rulesClient.bulkEdit<RuleParams>({
    ids: rules.map((rule) => rule.id),
    operations,
    paramsModifier: async (rule) => {
      const ruleParams = rule.params;

      await validateBulkEditRule({
        mlAuthz,
        ruleType: ruleParams.type,
        edit: actions,
        immutable: ruleParams.immutable,
        ruleCustomizationStatus,
      });
      const { modifiedParams, isParamsUpdateSkipped } = ruleParamsModifier(
        ruleParams,
        paramsActions
      );

      // Update rule source
      const updatedRule = {
        ...rule,
        params: modifiedParams,
      };
      const ruleResponse = convertAlertingRuleToRuleResponse(updatedRule);
      let isCustomized = false;
      if (ruleResponse.immutable === true) {
        isCustomized = calculateIsCustomized({
          baseRule: baseVersionsMap.get(ruleResponse.rule_id),
          nextRule: ruleResponse,
          ruleCustomizationStatus,
        });
      }

      const ruleSource =
        ruleResponse.immutable === true
          ? {
              type: 'external' as const,
              isCustomized,
            }
          : {
              type: 'internal' as const,
            };
      modifiedParams.ruleSource = ruleSource;

      return { modifiedParams, isParamsUpdateSkipped };
    },
  });

  return result;
};
