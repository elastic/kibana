/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { DetectionRulesAuthz } from '../../../../../../../../common/detection_engine/rule_management/authz';
import type {
  RuleResponse,
  RuleObjectId,
} from '../../../../../../../../common/api/detection_engine/model/rule_schema';
import type { MlAuthz } from '../../../../../../machine_learning/authz';
import type { IPrebuiltRuleAssetsClient } from '../../../../../prebuilt_rules/logic/rule_assets/prebuilt_rule_assets_client';

export interface RestoreRuleFromHistoryParams {
  actionsClient: ActionsClient;
  rulesClient: RulesClient;
  prebuiltRuleAssetClient: IPrebuiltRuleAssetsClient;
  mlAuthz: MlAuthz;
  rulesAuthz: DetectionRulesAuthz;
  ruleId: RuleObjectId;
  changeId: string;
  currentRuleRevision?: number;
}

export interface RestoreRuleFromHistoryResult {
  rule: RuleResponse;
  no_change?: true;
  restoredRevisionTimestamp: string;
}
