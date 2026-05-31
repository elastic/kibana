/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { ActionsClient } from '@kbn/actions-plugin/server';

import type { SecurityRuleChangeTracking } from '../../../../../../../common/detection_engine/rule_management/rule_change_tracking';
import { SecurityRuleChangeTrackingAction } from '../../../../../../../common/detection_engine/rule_management/rule_change_tracking';
import type {
  RuleResponse,
  RuleSource,
} from '../../../../../../../common/api/detection_engine/model/rule_schema';
import type { RuleToImport } from '../../../../../../../common/api/detection_engine';
import type { MlAuthz } from '../../../../../machine_learning/authz';
import type { IPrebuiltRuleAssetsClient } from '../../../../prebuilt_rules/logic/rule_assets/prebuilt_rule_assets_client';
import { convertAlertingRuleToRuleResponse } from '../converters/convert_alerting_rule_to_rule_response';
import { convertRuleResponseToAlertingRule } from '../converters/convert_rule_response_to_alerting_rule';
import { applyRuleUpdate } from '../mergers/apply_rule_update';
import { validateMlAuth, toggleRuleEnabledOnUpdate } from '../utils';
import { createRule } from './create_rule';
import { getRuleByRuleId } from './get_rule_by_rule_id';
import { createRuleImportErrorObject } from '../../import/errors';

interface ImportOptions {
  overwriteRule?: boolean;
  allowMissingConnectorSecrets?: boolean;
  overrideFields?: { rule_source: RuleSource; immutable: boolean };
}

interface ImportRuleDeps {
  actionsClient: ActionsClient;
  rulesClient: RulesClient;
  prebuiltRuleAssetClient: IPrebuiltRuleAssetsClient;
  mlAuthz: MlAuthz;
}

interface ImportRuleParams {
  ruleToImport: RuleToImport;
  importOptions?: ImportOptions;
  deps: ImportRuleDeps;
  changeTracking?: SecurityRuleChangeTracking;
}

export async function importRule({
  ruleToImport,
  importOptions,
  deps: { actionsClient, rulesClient, prebuiltRuleAssetClient, mlAuthz },
  changeTracking,
}: ImportRuleParams): Promise<RuleResponse> {
  const { overwriteRule, allowMissingConnectorSecrets, overrideFields } = importOptions ?? {};
  // For backwards compatibility, immutable is false by default
  const rule = { ...ruleToImport, immutable: false, ...overrideFields };

  await validateMlAuth(mlAuthz, ruleToImport.type);

  const existingRule = await getRuleByRuleId({
    ruleId: rule.rule_id,
    rulesClient,
  });

  if (existingRule && !overwriteRule) {
    throw createRuleImportErrorObject({
      ruleId: existingRule.rule_id,
      type: 'conflict',
      message: 'Rule with this rule_id already exists',
    });
  }

  if (existingRule && overwriteRule) {
    let ruleWithUpdates = await applyRuleUpdate({
      prebuiltRuleAssetClient,
      existingRule,
      ruleUpdate: rule,
    });
    // applyRuleUpdate prefers the existing rule's values for `rule_source` and `immutable`, but we want to use the importing rule's calculated values
    ruleWithUpdates = { ...ruleWithUpdates, ...overrideFields };

    const updatedRule = await rulesClient.update({
      id: existingRule.id,
      data: convertRuleResponseToAlertingRule(ruleWithUpdates, actionsClient),
      changeTracking: { action: SecurityRuleChangeTrackingAction.ruleImport, ...changeTracking },
    });

    // We strip `enabled` from the rule object to use in the rules client and need to enable it separately if user has enabled the updated rule
    const { enabled } = await toggleRuleEnabledOnUpdate(rulesClient, existingRule, ruleWithUpdates);

    return convertAlertingRuleToRuleResponse({ ...updatedRule, enabled });
  }

  /* Rule does not exist, so we'll create it */
  return createRule({
    rule,
    allowMissingConnectorSecrets,
    deps: { actionsClient, rulesClient, mlAuthz },
    changeTracking: { ...changeTracking, action: SecurityRuleChangeTrackingAction.ruleImport },
  });
}
