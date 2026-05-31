/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { RuleResponse } from '../../../../../../../common/api/detection_engine';
import { MAX_RULES_TO_UPDATE_IN_PARALLEL } from '../../../../../../../common/constants';
import { initPromisePool } from '../../../../../../utils/promise_pool';
import type { MlAuthz } from '../../../../../machine_learning/authz';
import type { IPrebuiltRuleAssetsClient } from '../../../../prebuilt_rules/logic/rule_assets/prebuilt_rule_assets_client';
import type { RuleTriad } from '../../../../prebuilt_rules/model/rule_groups/get_rule_groups';
import { revertPrebuiltRule } from './revert_prebuilt_rule';
import type { RevertPrebuiltRulesResult } from '../detection_rules_client_interface';

interface RevertPrebuiltRulesDeps {
  actionsClient: ActionsClient;
  rulesClient: RulesClient;
  mlAuthz: MlAuthz;
  prebuiltRuleAssetClient: IPrebuiltRuleAssetsClient;
}

interface RevertPrebuiltRulesParams {
  rules: RuleTriad[];
  deps: RevertPrebuiltRulesDeps;
}

export async function revertPrebuiltRules({
  rules,
  deps: { actionsClient, rulesClient, mlAuthz, prebuiltRuleAssetClient },
}: RevertPrebuiltRulesParams): Promise<RevertPrebuiltRulesResult> {
  const changeTracking = { metadata: { bulkCount: rules.length } };

  return initPromisePool<RuleTriad, RuleResponse>({
    concurrency: MAX_RULES_TO_UPDATE_IN_PARALLEL,
    items: rules,
    executor: async ({ current, target }) => {
      return revertPrebuiltRule({
        ruleAsset: target,
        existingRule: current,
        deps: { actionsClient, rulesClient, mlAuthz, prebuiltRuleAssetClient },
        changeTracking,
      });
    },
  });
}
