/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { ActionsClient } from '@kbn/actions-plugin/server';

import type { RuleResponse } from '../../../../../../../common/api/detection_engine/model/rule_schema';
import type { MlAuthz } from '../../../../../machine_learning/authz';
import type { IPrebuiltRuleAssetsClient } from '../../../../prebuilt_rules/logic/rule_assets/prebuilt_rule_assets_client';
import { convertAlertingRuleToRuleResponse } from '../converters/convert_alerting_rule_to_rule_response';
import { convertRuleResponseToAlertingRule } from '../converters/convert_rule_response_to_alerting_rule';
import type { ImportRuleArgs } from '../detection_rules_client_interface';
import { applyRuleUpdate } from '../mergers/apply_rule_update';
import { validateMlAuth, toggleRuleEnabledOnUpdate } from '../utils';
import { createRule } from './create_rule';
import { getRuleByRuleId } from './get_rule_by_rule_id';
import { createRuleImportErrorObject } from '../../import/errors';
import type { PrebuiltRulesCustomizationStatus } from '../../../../../../../common/detection_engine/prebuilt_rules/prebuilt_rule_customization_status';

interface ImportRuleOptions {
  actionsClient: ActionsClient;
  rulesClient: RulesClient;
  prebuiltRuleAssetClient: IPrebuiltRuleAssetsClient;
  importRulePayload: ImportRuleArgs;
  mlAuthz: MlAuthz;
  ruleCustomizationStatus: PrebuiltRulesCustomizationStatus;
}

export const importRule = async ({
  actionsClient,
  rulesClient,
  importRulePayload,
  prebuiltRuleAssetClient,
  mlAuthz,
  ruleCustomizationStatus,
}: ImportRuleOptions): Promise<RuleResponse> => {
  const { ruleToImport, overwriteRules, overrideFields, allowMissingConnectorSecrets } =
    importRulePayload;
  // For backwards compatibility, immutable is false by default
  const rule = { ...ruleToImport, immutable: false, ...overrideFields };

  await validateMlAuth(mlAuthz, ruleToImport.type);

  const existingRule = await getRuleByRuleId({
    rulesClient,
    ruleId: rule.rule_id,
  });

  if (existingRule && !overwriteRules) {
    throw createRuleImportErrorObject({
      ruleId: existingRule.rule_id,
      type: 'conflict',
      message: `rule_id: "${existingRule.rule_id}" already exists`,
    });
  }

  if (existingRule && overwriteRules) {
    let ruleWithUpdates = await applyRuleUpdate({
      prebuiltRuleAssetClient,
      existingRule,
      ruleUpdate: rule,
      ruleCustomizationStatus,
    });
    // applyRuleUpdate prefers the existing rule's values for `rule_source` and `immutable`, but we want to use the importing rule's calculated values
    ruleWithUpdates = { ...ruleWithUpdates, ...overrideFields };

    const updatedRule = await rulesClient.update({
      id: existingRule.id,
      data: convertRuleResponseToAlertingRule(ruleWithUpdates, actionsClient),
    });

    // We strip `enabled` from the rule object to use in the rules client and need to enable it separately if user has enabled the updated rule
    const { enabled } = await toggleRuleEnabledOnUpdate(rulesClient, existingRule, ruleWithUpdates);

    return convertAlertingRuleToRuleResponse({ ...updatedRule, enabled });
  }

  /* Rule does not exist, so we'll create it */
  return createRule({
    actionsClient,
    rulesClient,
    mlAuthz,
    rule,
    allowMissingConnectorSecrets,
  });
};
