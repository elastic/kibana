/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { SanitizedRule } from '@kbn/alerting-types';

import { SecurityRuleChangeTrackingAction } from '../../../../../../../common/detection_engine/rule_management/rule_change_tracking';
import type { DetectionRulesAuthz } from '../../../../../../../common/detection_engine/rule_management/authz';
import type {
  RuleResponse,
  RuleObjectId,
} from '../../../../../../../common/api/detection_engine/model/rule_schema';
import type { MlAuthz } from '../../../../../machine_learning/authz';
import type { IPrebuiltRuleAssetsClient } from '../../../../prebuilt_rules/logic/rule_assets/prebuilt_rule_assets_client';
import type { RuleParams } from '../../../../rule_schema';
import { convertAlertingRuleToRuleResponse } from '../converters/convert_alerting_rule_to_rule_response';
import { convertRuleResponseToAlertingRule } from '../converters/convert_rule_response_to_alerting_rule';
import { applyRuleUpdate } from '../mergers/apply_rule_update';
import { ClientError, validateFieldWritePermissions, validateMlAuth } from '../utils';
import { getRuleById } from './get_rule_by_id';

export const restoreRuleFromHistory = async ({
  actionsClient,
  rulesClient,
  prebuiltRuleAssetClient,
  mlAuthz,
  rulesAuthz,
  ruleId,
  changeId,
}: {
  actionsClient: ActionsClient;
  rulesClient: RulesClient;
  prebuiltRuleAssetClient: IPrebuiltRuleAssetsClient;
  mlAuthz: MlAuthz;
  rulesAuthz: DetectionRulesAuthz;
  ruleId: RuleObjectId;
  changeId: string;
}): Promise<RuleResponse> => {
  const existingRule = await getRuleById({ rulesClient, id: ruleId });

  if (existingRule == null) {
    throw new ClientError(`id: "${ruleId}" not found`, 404);
  }

  await validateMlAuth(mlAuthz, existingRule.type);

  // `from` is intentionally omitted: the event.id term-filter makes the target
  // document the first (and only) hit; ES default of 0 is correct here.
  const historyResult = await rulesClient.getHistory({
    module: 'security',
    ruleId,
    size: 1,
    filters: [{ term: { 'event.id': changeId } }],
  });

  if (historyResult.items.length === 0) {
    throw new ClientError(`changeId: "${changeId}" not found`, 404);
  }

  const item = historyResult.items[0];

  if (!item.rule) {
    throw new ClientError(`Snapshot for changeId: "${changeId}" could not be hydrated`, 500);
  }

  const snapshotRule = convertAlertingRuleToRuleResponse(item.rule as SanitizedRule<RuleParams>);

  const ruleWithUpdates = await applyRuleUpdate({
    prebuiltRuleAssetClient,
    existingRule,
    ruleUpdate: snapshotRule,
  });

  // Restore preserves the current enabled state per phase decision D-02.
  // Execution fields (e.g. execution_summary) are never part of the update
  // payload because they are not in RuleUpdateProps (research Pitfall 2).
  ruleWithUpdates.enabled = existingRule.enabled;

  validateFieldWritePermissions(
    {
      exceptions_list: ruleWithUpdates.exceptions_list,
      note: ruleWithUpdates.note,
      investigation_fields: ruleWithUpdates.investigation_fields,
      enabled: ruleWithUpdates.enabled,
    },
    rulesAuthz
  );

  const updatedRule = await rulesClient.update({
    id: existingRule.id,
    data: convertRuleResponseToAlertingRule(ruleWithUpdates, actionsClient),
    changeTracking: {
      action: SecurityRuleChangeTrackingAction.ruleRestore,
      metadata: { restoredFromChangeId: changeId },
    },
  });

  return convertAlertingRuleToRuleResponse(updatedRule);
};
