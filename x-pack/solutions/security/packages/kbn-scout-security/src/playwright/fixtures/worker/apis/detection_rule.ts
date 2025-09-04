/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient, ScoutLogger, ScoutParallelWorkerFixtures, EsClient } from '@kbn/scout';
import { measurePerformanceAsync } from '@kbn/scout';
import type { CustomQueryRule } from '../../../constants/detection_rules';
import { CUSTOM_QUERY_RULE } from '../../../constants/detection_rules';

const DETECTION_ENGINE_RULES_URL = '/api/detection_engine/rules';
const DETECTION_ENGINE_RULES_FIND_URL = '/api/detection_engine/rules/_find';
const DETECTION_ENGINE_RULES_BULK_ACTION = '/api/detection_engine/rules/_bulk_action';

export interface DetectionRuleApiService {
  createCustomQueryRule: (body: CustomQueryRule) => Promise<void>;
  deleteAll: () => Promise<void>;
  waitForRuleExecution: (ruleId: string, afterDate?: Date) => Promise<void>;
  indexTestDocument: (index: string, document: Record<string, unknown>) => Promise<void>;
}

export const getDetectionRuleApiService = ({
  kbnClient,
  log,
  scoutSpace,
  esClient,
}: {
  kbnClient: KbnClient;
  log: ScoutLogger;
  scoutSpace?: ScoutParallelWorkerFixtures['scoutSpace'];
  esClient: EsClient;
}): DetectionRuleApiService => {
  const basePath = scoutSpace?.id ? `/s/${scoutSpace?.id}` : '';

  return {
    createCustomQueryRule: async (body = CUSTOM_QUERY_RULE) => {
      await measurePerformanceAsync(
        log,
        'security.detectionRule.createCustomQueryRule',
        async () => {
          await kbnClient.request({
            method: 'POST',
            path: `${basePath}${DETECTION_ENGINE_RULES_URL}`,
            body,
          });
        }
      );
    },

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

    waitForRuleExecution: async (ruleId: string, afterDate?: Date) => {
      await measurePerformanceAsync(
        log,
        'security.detectionRule.waitForRuleExecution',
        async () => {
          const maxAttempts = 24; // 24 * 500ms = 12 seconds
          let attempts = 0;

          while (attempts < maxAttempts) {
            const response = await kbnClient.request({
              method: 'GET',
              path: `${basePath}${DETECTION_ENGINE_RULES_FIND_URL}`,
            });

            // The response structure might be { data: [...] } or just an array
            const rules = response.data || response;
            if (Array.isArray(rules)) {
              const rule = rules.find((r: any) => r.rule_id === ruleId);
              if (rule?.execution_summary?.last_execution?.date) {
                const executionDate = new Date(rule.execution_summary.last_execution.date);
                if (!afterDate || executionDate > afterDate) {
                  return;
                }
              }
            }

            await new Promise((resolve) => setTimeout(resolve, 500));
            attempts++;
          }

          throw new Error(`Rule ${ruleId} did not execute within the expected time`);
        }
      );
    },

    indexTestDocument: async (index: string, document: Record<string, unknown>) => {
      await measurePerformanceAsync(log, 'security.detectionRule.indexTestDocument', async () => {
        // Index the document using the ES client
        await esClient.index({
          index,
          body: {
            '@timestamp': new Date().toISOString(),
            ...document,
          },
        });

        // Refresh the index to make the document searchable immediately
        await esClient.indices.refresh({ index });
      });
    },
  };
};
