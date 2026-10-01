/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient, ScoutLogger, ScoutParallelWorkerFixtures } from '@kbn/scout';
import { measurePerformanceAsync } from '@kbn/scout';
import type { CustomQueryRule, EqlRule } from '../../../constants/detection_rules';
import { CUSTOM_QUERY_RULE, EQL_RULE } from '../../../constants/detection_rules';

const DETECTION_ENGINE_RULES_URL = '/api/detection_engine/rules';
const DETECTION_ENGINE_RULES_BULK_ACTION = '/api/detection_engine/rules/_bulk_action';

export interface DetectionRuleApiService {
  createCustomQueryRule: (body: CustomQueryRule) => Promise<{ id: string }>;
  createEqlRule: (body: EqlRule) => Promise<{ id: string }>;
  deleteAll: () => Promise<void>;
}

export const getDetectionRuleApiService = ({
  kbnClient,
  log,
  scoutSpace,
}: {
  kbnClient: KbnClient;
  log: ScoutLogger;
  scoutSpace?: ScoutParallelWorkerFixtures['scoutSpace'];
}): DetectionRuleApiService => {
  const basePath = scoutSpace?.id ? `/s/${scoutSpace?.id}` : '';

  const createRule = (operation: string, body: CustomQueryRule | EqlRule) =>
    measurePerformanceAsync(log, `security.detectionRule.${operation}`, async () => {
      const { data } = await kbnClient.request<{ id: string }>({
        method: 'POST',
        path: `${basePath}${DETECTION_ENGINE_RULES_URL}`,
        body,
        // Avoid duplicate rule creation if the request is retried
        retries: 0,
      });
      return { id: data.id };
    });

  return {
    createCustomQueryRule: async (body = CUSTOM_QUERY_RULE) =>
      createRule('createCustomQueryRule', body),

    createEqlRule: async (body = EQL_RULE) => createRule('createEqlRule', body),

    deleteAll: async () => {
      await measurePerformanceAsync(log, 'security.detectionRule.deleteAll', async () => {
        await kbnClient.request({
          method: 'POST',
          path: `${basePath}${DETECTION_ENGINE_RULES_BULK_ACTION}`,
          body: {
            query: '',
            action: 'delete',
          },
        });
      });
    },
  };
};
