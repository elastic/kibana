/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_RULES_TO_UPDATE_IN_PARALLEL } from '../../../../../../common/constants';
import { initPromisePool } from '../../../../../utils/promise_pool';
import { withSecuritySpan } from '../../../../../utils/with_security_span';
import type { IDetectionRulesClient } from '../../../rule_management/logic/detection_rules_client/detection_rules_client_interface';
import type { RuleTriad } from '../../model/rule_groups/get_rule_groups';

/**
 * Merges customization adjacent fields (actions, exception_list, etc.) and updates rule to provided rule asset.
 * This implements a chunked approach to not saturate network connections and
 * avoid being a "noisy neighbor".
 * @param detectionRulesClient IDetectionRulesClient
 * @param ruleVersions The rules versions to update
 */
export const revertPrebuiltRules = async (
  detectionRulesClient: IDetectionRulesClient,
  ruleVersions: RuleTriad[]
) =>
  withSecuritySpan('revertPrebuiltRule', async () => {
    const result = await initPromisePool({
      concurrency: MAX_RULES_TO_UPDATE_IN_PARALLEL,
      items: ruleVersions,
      executor: async ({ current, target }) => {
        return detectionRulesClient.revertPrebuiltRule({
          ruleAsset: target,
          existingRule: current,
        });
      },
    });

    return result;
  });
