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
import { retryApiCall, pollUntilAvailable, pollUntilDocumentIndexed } from './utils';

const DETECTION_ENGINE_RULES_URL = '/api/detection_engine/rules';
const DETECTION_ENGINE_RULES_FIND_URL = '/api/detection_engine/rules/_find';
const DETECTION_ENGINE_RULES_BULK_ACTION = '/api/detection_engine/rules/_bulk_action';

export interface DetectionRuleApiService {
  createCustomQueryRule: (body: CustomQueryRule) => Promise<{ id: string; rule_id: string }>;
  deleteAll: () => Promise<void>;
  deleteAllAlerts: () => Promise<void>;
  cleanupTestData: (indexPattern: string) => Promise<void>;
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
      return measurePerformanceAsync(
        log,
        'security.detectionRule.createCustomQueryRule',
        async () => {
          log.debug(`[DETECTION RULE API] Creating custom query rule`);

          // Step 1: Create the rule via API with retry logic
          const createdRule = await retryApiCall(
            async () => {
              const response = await kbnClient.request<{ id: string; rule_id: string }>({
                method: 'POST',
                path: `${basePath}${DETECTION_ENGINE_RULES_URL}`,
                body,
              });
              log.debug(`[DETECTION RULE API] Rule created: ${response.data.id}`);
              return response.data;
            },
            { maxAttempts: 3, delayMs: 2000 },
            log
          );

          // Step 2: Poll until the rule is indexed and retrievable
          log.debug(`[DETECTION RULE API] Polling to verify rule ${createdRule.id} is indexed`);
          const pollResult = await pollUntilDocumentIndexed(
            async () => {
              const response = await kbnClient.request<{ id: string; rule_id: string }>({
                method: 'GET',
                path: `${basePath}${DETECTION_ENGINE_RULES_URL}`,
                query: { id: createdRule.id },
              });
              return response.data;
            },
            {},
            log
          );

          log.debug(
            `[DETECTION RULE API] Rule verified as indexed after ${pollResult.attempts} attempts (${pollResult.totalWaitMs}ms)`
          );

          return pollResult.data;
        }
      );
    },

    deleteAll: async () => {
      await measurePerformanceAsync(log, 'security.detectionRule.deleteAll', async () => {
        try {
          log.debug(`[DETECTION RULE API] Deleting all rules`);

          // Step 1: Delete all rules via bulk action
          await kbnClient.request({
            method: 'POST',
            path: `${basePath}${DETECTION_ENGINE_RULES_BULK_ACTION}`,
            body: {
              query: '',
              action: 'delete',
            },
          });

          log.debug(`[DETECTION RULE API] Rules deleted, polling to verify...`);

          // Step 2: Poll to verify rules are deleted
          await pollUntilAvailable(
            async () => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const response = await kbnClient.request<{ data?: any[] }>({
                method: 'GET',
                path: `${basePath}${DETECTION_ENGINE_RULES_FIND_URL}`,
              });

              const rules = response.data?.data || response.data || [];
              const count = Array.isArray(rules) ? rules.length : 0;

              log.debug(`[DETECTION RULE API] Found ${count} rules after deletion`);

              // If there are still rules, deletion hasn't completed
              if (count > 0) {
                throw new Error(`Still found ${count} rules after deletion`);
              }

              return { deleted: true };
            },
            {},
            log
          );

          log.debug(`[DETECTION RULE API] All rules verified as deleted`);
        } catch (error: unknown) {
          // Ignore 404 errors - it means the detection engine API is not available or not initialized yet
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if ((error as any)?.response?.status !== 404) {
            throw error;
          }
          log.debug(`[DETECTION RULE API] No rules to delete (404)`);
        }
      });
    },

    deleteAllAlerts: async () => {
      await measurePerformanceAsync(log, 'security.detectionRule.deleteAllAlerts', async () => {
        try {
          const namespace = scoutSpace?.id || 'default';
          const alertsIndexPattern = `.alerts-security.alerts-${namespace}`;

          log.debug(`[DETECTION RULE API] Deleting all alerts from ${alertsIndexPattern}`);

          // Delete all alerts using ES deleteByQuery
          await esClient.deleteByQuery({
            index: alertsIndexPattern,
            ignore_unavailable: true,
            query: {
              match_all: {},
            },
            refresh: true,
            conflicts: 'proceed',
          });

          log.debug(`[DETECTION RULE API] All alerts deleted and index refreshed`);
        } catch (error: unknown) {
          // Ignore index_not_found errors - it means no alerts exist yet
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if ((error as any)?.meta?.body?.error?.type !== 'index_not_found_exception') {
            log.error(`[DETECTION RULE API] Failed to delete alerts: ${error}`);
            throw error;
          }
          log.debug(`[DETECTION RULE API] No alerts index found (expected for first test run)`);
        }
      });
    },

    cleanupTestData: async (indexPattern: string) => {
      await measurePerformanceAsync(log, 'security.detectionRule.cleanupTestData', async () => {
        try {
          log.debug(`[DETECTION RULE API] Cleaning up test data from ${indexPattern}`);

          // Delete all test documents using ES deleteByQuery
          await esClient.deleteByQuery({
            index: indexPattern,
            ignore_unavailable: true,
            query: {
              match_all: {},
            },
            refresh: true,
            conflicts: 'proceed',
          });

          log.debug(`[DETECTION RULE API] Test data cleaned up from ${indexPattern}`);
        } catch (error: unknown) {
          // Ignore index_not_found errors - it means the index doesn't exist yet
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if ((error as any)?.meta?.body?.error?.type !== 'index_not_found_exception') {
            log.error(`[DETECTION RULE API] Failed to cleanup test data: ${error}`);
            throw error;
          }
          log.debug(`[DETECTION RULE API] No test data index found (${indexPattern})`);
        }
      });
    },

    waitForRuleExecution: async (ruleId: string, afterDate?: Date) => {
      await measurePerformanceAsync(
        log,
        'security.detectionRule.waitForRuleExecution',
        async () => {
          log.debug(`[DETECTION RULE API] Waiting for rule ${ruleId} execution`);

          // Use standardized polling (12 seconds = 24 * 500ms)
          await pollUntilAvailable(
            async () => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const response = await kbnClient.request<{ data?: any[] }>({
                method: 'GET',
                path: `${basePath}${DETECTION_ENGINE_RULES_FIND_URL}`,
              });

              // The response structure might be { data: [...] } or just an array
              const rules = response.data?.data || response.data || response;

              if (Array.isArray(rules)) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const rule = rules.find((r: any) => r.rule_id === ruleId);

                if (rule?.execution_summary?.last_execution?.date) {
                  const executionDate = new Date(rule.execution_summary.last_execution.date);

                  if (!afterDate || executionDate > afterDate) {
                    log.debug(
                      `[DETECTION RULE API] Rule ${ruleId} executed at ${executionDate.toISOString()}`
                    );
                    return { executed: true, date: executionDate };
                  }

                  throw new Error(
                    `Rule executed at ${executionDate.toISOString()} but waiting for execution after ${afterDate?.toISOString()}`
                  );
                }

                throw new Error(`Rule ${ruleId} has not executed yet`);
              }

              throw new Error('Invalid response structure from rules API');
            },
            { intervalMs: 500, timeoutMs: 12000 }, // Match original timing
            log
          );
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
