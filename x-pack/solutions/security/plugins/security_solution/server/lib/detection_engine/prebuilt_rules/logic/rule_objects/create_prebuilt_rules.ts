/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { SecurityRuleChangeTracking } from '../../../../../../common/detection_engine/rule_management/rule_change_tracking';
import { MAX_RULES_TO_UPDATE_IN_PARALLEL } from '../../../../../../common/constants';
import { initPromisePool } from '../../../../../utils/promise_pool';
import { withSecuritySpan } from '../../../../../utils/with_security_span';
import type { PrebuiltRuleAsset } from '../../model/rule_assets/prebuilt_rule_asset';
import type { IDetectionRulesClient } from '../../../rule_management/logic/detection_rules_client/detection_rules_client_interface';

export const createPrebuiltRules = (
  detectionRulesClient: IDetectionRulesClient,
  rules: PrebuiltRuleAsset[],
  changeTracking?: SecurityRuleChangeTracking<never>,
  logger?: Logger
) => {
  return withSecuritySpan('createPrebuiltRules', async () => {
    logger?.debug(
      `createPrebuiltRules: Creating prebuilt rules - started. Rules to create: ${rules.length}`
    );
    const result = await initPromisePool({
      concurrency: MAX_RULES_TO_UPDATE_IN_PARALLEL,
      items: rules,
      executor: async (rule) => {
        return detectionRulesClient.createPrebuiltRule({
          params: rule,
          changeTracking: {
            ...changeTracking,
            metadata: {
              bulkCount: rules.length,
              ...changeTracking?.metadata,
            },
          },
        });
      },
    });

    logger?.debug(
      `createPrebuiltRules: Creating prebuilt rules - done. Rules created: ${
        result.results.length
      }. Rules failed to create: ${result.errors.length}. Errors: ${JSON.stringify(
        result.errors.map((e) => ({
          rule_id: e.item.rule_id,
          ruleName: e.item.name,
          error:
            typeof e.error === 'object' && e.error !== null && 'message' in e.error
              ? e.error.message
              : e.error,
        }))
      )}`
    );

    return result;
  });
};
