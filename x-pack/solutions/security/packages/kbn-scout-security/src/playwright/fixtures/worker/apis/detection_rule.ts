/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KbnClient, measurePerformanceAsync, ScoutLogger } from '@kbn/scout';
import { CUSTOM_QUERY_RULE, CustomQueryRule } from '../../../constants/detection_rules';

const DETECTION_ENGINE_RULES_URL = '/api/detection_engine/rules';
const DETECTION_ENGINE_RULES_BULK_ACTION = '/api/detection_engine/rules/_bulk_action';

export interface DetectionRuleFixture {
  createCustomQueryRule: (body: CustomQueryRule) => Promise<void>;
  deleteAll: () => Promise<void>;
}

export const createDetectionRuleFixture = async ({
  kbnClient,
  log,
}: {
  kbnClient: KbnClient;
  log: ScoutLogger;
}) => {
  const detectionRuleHelper: DetectionRuleFixture = {
    createCustomQueryRule: async (body = CUSTOM_QUERY_RULE) => {
      await measurePerformanceAsync(
        log,
        'security.detectionRule.createCustomQueryRule',
        async () => {
          await kbnClient.request({
            method: 'POST',
            path: DETECTION_ENGINE_RULES_URL,
            body,
          });
        }
      );
    },

    deleteAll: async () => {
      await measurePerformanceAsync(log, 'security.detectionRule.deleteAll', async () => {
        await kbnClient.request({
          method: 'POST',
          path: DETECTION_ENGINE_RULES_BULK_ACTION,
          body: {
            query: '',
            action: 'delete',
          },
        });
      });
    },
  };

  return detectionRuleHelper;
};
