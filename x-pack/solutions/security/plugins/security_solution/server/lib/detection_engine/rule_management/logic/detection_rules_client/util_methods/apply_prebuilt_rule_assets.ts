/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pick } from 'lodash';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { SecurityRuleChangeTracking } from '../../../../../../../common/detection_engine/rule_management/rule_change_tracking';
import { MAX_RULES_TO_UPDATE_IN_PARALLEL } from '../../../../../../../common/constants';
import { initPromisePool } from '../../../../../../utils/promise_pool';
import type { PromisePoolError } from '../../../../../../utils/promise_pool';
import type { UpgradedRuleBasicInfo } from '../../../../../../../common/api/detection_engine/prebuilt_rules';
import type { IPrebuiltRuleAssetsClient } from '../../../../prebuilt_rules/logic/rule_assets/prebuilt_rule_assets_client';
import type { MlAuthz } from '../../../../../machine_learning/authz';
import { applyPrebuiltRuleAsset } from './apply_prebuilt_rule_asset';
import type { PrebuiltRuleAsset } from '../../../../prebuilt_rules';

interface ApplyAllPrebuiltRuleAssetsParams {
  assets: PrebuiltRuleAsset[];
  deps: ApplyAllPrebuiltRuleAssetsDeps;
  changeTracking?: SecurityRuleChangeTracking<never>;
}

interface ApplyAllPrebuiltRuleAssetsDeps {
  actionsClient: ActionsClient;
  rulesClient: RulesClient;
  mlAuthz: MlAuthz;
  ruleAssetsClient: IPrebuiltRuleAssetsClient;
}

interface ApplyPrebuiltRuleAssetsResult {
  updatedRulesBasicInfo: UpgradedRuleBasicInfo[];
  errors: Array<PromisePoolError<{ rule_id: string }>>;
}

export async function applyPrebuiltRuleAssets({
  assets,
  deps: { actionsClient, rulesClient, mlAuthz, ruleAssetsClient },
  changeTracking,
}: ApplyAllPrebuiltRuleAssetsParams): Promise<ApplyPrebuiltRuleAssetsResult> {
  const { results, errors } = await initPromisePool({
    concurrency: MAX_RULES_TO_UPDATE_IN_PARALLEL,
    items: assets,
    executor: async (asset) =>
      applyPrebuiltRuleAsset({
        asset,
        deps: { actionsClient, rulesClient, mlAuthz, prebuiltRuleAssetClient: ruleAssetsClient },
        changeTracking,
      }),
  });

  return {
    updatedRulesBasicInfo: results.map(({ result: rule }) =>
      pick(rule, ['id', 'rule_id', 'version'])
    ),
    errors,
  };
}
