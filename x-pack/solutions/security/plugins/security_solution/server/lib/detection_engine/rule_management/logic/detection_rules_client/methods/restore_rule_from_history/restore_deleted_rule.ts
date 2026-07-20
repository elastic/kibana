/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ruleTypeMappings } from '@kbn/securitysolution-rules';
import { SecurityRuleChangeTrackingAction } from '../../../../../../../../common/detection_engine/rule_management/rule_change_tracking';
import type { RuleResponse } from '../../../../../../../../common/api/detection_engine/model/rule_schema';
import type { RuleParams } from '../../../../../rule_schema';
import { SERVER_APP_ID } from '../../../../../../../../common';
import { convertAlertingRuleToRuleResponse } from '../../converters/convert_alerting_rule_to_rule_response';
import { convertRuleResponseToAlertingRule } from '../../converters/convert_rule_response_to_alerting_rule';
import { ClientError, validateFieldWritePermissions, validateMlAuth } from '../../utils';
import { getRuleByRuleId } from '../get_rule_by_rule_id';
import type { RestoreRuleFromHistoryParams, RestoreRuleFromHistoryResult } from './types';

interface RestoreDeletedRuleParams extends RestoreRuleFromHistoryParams {
  snapshotRule: RuleResponse;
  restoredRevisionTimestamp: string;
}

export async function restoreDeletedRule({
  actionsClient,
  rulesClient,
  mlAuthz,
  rulesAuthz,
  ruleId,
  changeId,
  snapshotRule,
  restoredRevisionTimestamp,
}: RestoreDeletedRuleParams): Promise<RestoreRuleFromHistoryResult> {
  const conflictingRule = await getRuleByRuleId({ rulesClient, ruleId: snapshotRule.rule_id });

  if (conflictingRule != null) {
    throw new ClientError(
      `Cannot restore rule: a rule with rule_id "${snapshotRule.rule_id}" already exists (id: "${conflictingRule.id}"). The rule may have been reinstalled after deletion. Delete the existing rule first, or restore from its own history instead.`,
      409
    );
  }

  await validateMlAuth(mlAuthz, snapshotRule.type);

  validateFieldWritePermissions(
    {
      exceptions_list: snapshotRule.exceptions_list,
      note: snapshotRule.note,
      investigation_fields: snapshotRule.investigation_fields,
      enabled: false,
    },
    rulesAuthz
  );

  const createdRule = await rulesClient.create<RuleParams>({
    data: {
      ...convertRuleResponseToAlertingRule(snapshotRule, actionsClient),
      alertTypeId: ruleTypeMappings[snapshotRule.type],
      consumer: SERVER_APP_ID,
      enabled: false,
    },
    options: { id: ruleId, initialRevision: snapshotRule.revision + 1 },
    changeTracking: {
      action: SecurityRuleChangeTrackingAction.ruleRestore,
      metadata: { restoredFromChangeId: changeId, restoredFromRevision: snapshotRule.revision },
      refresh: 'wait_for',
    },
  });

  return { rule: convertAlertingRuleToRuleResponse(createdRule), restoredRevisionTimestamp };
}
