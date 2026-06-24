/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { SanitizedRule } from '@kbn/alerting-types';
import { ruleTypeMappings } from '@kbn/securitysolution-rules';
import { SecurityRuleChangeTrackingAction } from '../../../../../../../common/detection_engine/rule_management/rule_change_tracking';
import type { DetectionRulesAuthz } from '../../../../../../../common/detection_engine/rule_management/authz';
import type {
  RuleResponse,
  RuleObjectId,
} from '../../../../../../../common/api/detection_engine/model/rule_schema';
import type { MlAuthz } from '../../../../../machine_learning/authz';
import type { IPrebuiltRuleAssetsClient } from '../../../../prebuilt_rules/logic/rule_assets/prebuilt_rule_assets_client';
import type { RuleParams } from '../../../../rule_schema';
import { SERVER_APP_ID } from '../../../../../../../common';
import { calculateRuleFieldsDiff } from '../../../../prebuilt_rules/logic/diff/calculation/calculate_rule_fields_diff';
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
}): Promise<{ rule: RuleResponse; no_change?: true }> => {
  const existingRule = await getRuleById({ rulesClient, id: ruleId });

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
    throw new Error(`Snapshot for changeId: "${changeId}" could not be hydrated`);
  }

  const snapshotRule = convertAlertingRuleToRuleResponse(item.rule as SanitizedRule<RuleParams>);

  if (existingRule == null) {
    await validateMlAuth(mlAuthz, snapshotRule.type);

    validateFieldWritePermissions(
      {
        exceptions_list: snapshotRule.exceptions_list,
        note: snapshotRule.note,
        investigation_fields: snapshotRule.investigation_fields,
        enabled: snapshotRule.enabled,
      },
      rulesAuthz
    );

    const createdRule = await rulesClient.create<RuleParams>({
      data: {
        ...convertRuleResponseToAlertingRule(snapshotRule, actionsClient),
        alertTypeId: ruleTypeMappings[snapshotRule.type],
        consumer: SERVER_APP_ID,
        enabled: snapshotRule.enabled ?? false,
      },
      options: { id: ruleId },
      changeTracking: {
        action: SecurityRuleChangeTrackingAction.ruleRestore,
        metadata: { restoredFromChangeId: changeId },
        refresh: 'wait_for',
      },
    });

    return { rule: convertAlertingRuleToRuleResponse(createdRule) };
  }

  await validateMlAuth(mlAuthz, existingRule.type);

  if (areRulesEqual(existingRule, snapshotRule)) {
    return { rule: existingRule, no_change: true };
  }

  const ruleWithUpdates = await applyRuleUpdate({
    prebuiltRuleAssetClient,
    existingRule,
    ruleUpdate: snapshotRule,
  });

  const ruleToSave = { ...ruleWithUpdates, enabled: existingRule.enabled };

  validateFieldWritePermissions(
    {
      exceptions_list: ruleToSave.exceptions_list,
      note: ruleToSave.note,
      investigation_fields: ruleToSave.investigation_fields,
      enabled: ruleToSave.enabled,
    },
    rulesAuthz
  );

  const updatedRule = await rulesClient.update({
    id: existingRule.id,
    data: convertRuleResponseToAlertingRule(ruleToSave, actionsClient),
    changeTracking: {
      action: SecurityRuleChangeTrackingAction.ruleRestore,
      metadata: { restoredFromChangeId: changeId },
      refresh: 'wait_for',
    },
  });

  return { rule: convertAlertingRuleToRuleResponse(updatedRule) };
};

function areRulesEqual(ruleA: RuleResponse, ruleB: RuleResponse): boolean {
  const fieldsDiff = calculateRuleFieldsDiff({ ruleA, ruleB });

  let equal = true;

  for (const fieldDiff of Object.values(fieldsDiff)) {
    equal &&= fieldDiff.is_equal;
  }

  return equal;
}
