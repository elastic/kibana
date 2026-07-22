/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import { SecurityRuleChangeTrackingAction } from '../../../../../../../../common/detection_engine/rule_management/rule_change_tracking';
import type { RuleResponse } from '../../../../../../../../common/api/detection_engine/model/rule_schema';
import { convertAlertingRuleToRuleResponse } from '../../converters/convert_alerting_rule_to_rule_response';
import { convertRuleResponseToAlertingRule } from '../../converters/convert_rule_response_to_alerting_rule';
import { applyRuleUpdate } from '../../mergers/apply_rule_update';
import { validateFieldWritePermissions, validateMlAuth } from '../../utils';
import type { RestoreRuleFromHistoryParams, RestoreRuleFromHistoryResult } from './types';

interface RestoreRuleStateParams extends RestoreRuleFromHistoryParams {
  existingRule: RuleResponse;
  snapshotRule: RuleResponse;
  restoredRevisionTimestamp: string;
}

export async function restoreRuleState({
  actionsClient,
  rulesClient,
  prebuiltRuleAssetClient,
  mlAuthz,
  rulesAuthz,
  changeId,
  existingRule,
  snapshotRule,
  restoredRevisionTimestamp,
}: RestoreRuleStateParams): Promise<RestoreRuleFromHistoryResult> {
  await validateMlAuth(mlAuthz, existingRule.type);

  const ruleWithUpdates = await applyRuleUpdate({
    prebuiltRuleAssetClient,
    existingRule,
    ruleUpdate: snapshotRule,
  });

  const ruleToSave = { ...ruleWithUpdates, enabled: existingRule.enabled };

  const existingAlertingRule = convertRuleResponseToAlertingRule(existingRule, actionsClient);
  const newAlertingRule = convertRuleResponseToAlertingRule(ruleToSave, actionsClient);

  if (isEqual(existingAlertingRule, newAlertingRule)) {
    return { rule: existingRule, no_change: true, restoredRevisionTimestamp };
  }

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
    data: newAlertingRule,
    changeTracking: {
      action: SecurityRuleChangeTrackingAction.ruleRestore,
      metadata: { restoredFromChangeId: changeId, restoredFromRevision: snapshotRule.revision },
      refresh: 'wait_for',
    },
  });

  return { rule: convertAlertingRuleToRuleResponse(updatedRule), restoredRevisionTimestamp };
}
