/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient, ScoutLogger, ScoutParallelWorkerFixtures } from '@kbn/scout';
import { measurePerformanceAsync } from '@kbn/scout';
import type {
  RiskEngineStatusResponse,
  GetEntityStoreStatusResponse,
} from '../../../constants/entity_analytics';

const ENTITY_STORE_ENGINES_URL = '/api/entity_store/engines';
const ENTITY_STORE_STATUS_URL = '/api/entity_store/status';
const SAVED_OBJECTS_FIND_URL = '/api/saved_objects/_find';
const RISK_ENGINE_CONFIGURATION_TYPE = 'risk-engine-configuration';
const RISK_ENGINE_STATUS_URL = '/internal/risk_score/engine/status';

const API_VERSIONS = {
  public: {
    v1: '2023-10-31',
  },
  internal: {
    v1: '1',
  },
};

export interface EntityAnalyticsApiService {
  deleteEntityStoreEngines: () => Promise<void>;
  deleteRiskEngineConfiguration: () => Promise<void>;
  getRiskEngineStatus: () => Promise<RiskEngineStatusResponse>;
  getEntityStoreStatus: () => Promise<GetEntityStoreStatusResponse>;
  waitForEntityStoreStatus: (
    expectedStatus: 'running',
    timeoutMs?: number
  ) => Promise<GetEntityStoreStatusResponse>;
  waitForEntityStoreStatusToChange: (timeoutMs?: number) => Promise<GetEntityStoreStatusResponse>;
  waitForEntityStoreCleanup: (timeoutMs?: number) => Promise<GetEntityStoreStatusResponse>;
  waitForRiskEngineCleanup: (timeoutMs?: number) => Promise<RiskEngineStatusResponse>;
}

export const getEntityAnalyticsApiService = ({
  kbnClient,
  log,
  scoutSpace,
}: {
  kbnClient: KbnClient;
  log: ScoutLogger;
  scoutSpace?: ScoutParallelWorkerFixtures['scoutSpace'];
}): EntityAnalyticsApiService => {
  const basePath = scoutSpace?.id ? `/s/${scoutSpace?.id}` : '';

  const service: EntityAnalyticsApiService = {
    deleteEntityStoreEngines: async () => {
      await measurePerformanceAsync(
        log,
        'security.entityAnalytics.deleteEntityStoreEngines',
        async () => {
          await kbnClient.request({
            method: 'DELETE',
            path: `${basePath}${ENTITY_STORE_ENGINES_URL}`,
            query: {
              delete_data: 'true',
            },
            ignoreErrors: [404, 500],
          });
          // Wait for cleanup to complete - ensure server state is fully cleaned up
          await service.waitForEntityStoreCleanup();
        }
      );
    },

    deleteRiskEngineConfiguration: async () => {
      await measurePerformanceAsync(
        log,
        'security.entityAnalytics.deleteRiskEngineConfiguration',
        async () => {
          const findResponse = await kbnClient.request<{
            saved_objects?: Array<{ id: string }>;
          }>({
            method: 'GET',
            path: `${basePath}${SAVED_OBJECTS_FIND_URL}`,
            query: {
              type: RISK_ENGINE_CONFIGURATION_TYPE,
            },
            ignoreErrors: [404],
          });

          const savedObjectId = findResponse?.data?.saved_objects?.[0]?.id;
          if (savedObjectId) {
            await kbnClient.request({
              method: 'DELETE',
              path: `${basePath}/api/saved_objects/${RISK_ENGINE_CONFIGURATION_TYPE}/${savedObjectId}`,
              ignoreErrors: [404],
            });
            // Wait for cleanup to complete - ensure server state is fully cleaned up
            await service.waitForRiskEngineCleanup();
          } else {
            // No saved object to delete, check if already cleaned up
            const status = await service.getRiskEngineStatus();
            if (status.risk_engine_status !== 'NOT_INSTALLED') {
              // Status is not clean, wait for it to become clean (might be in transition)
              await service.waitForRiskEngineCleanup();
            }
          }
        }
      );
    },

    getRiskEngineStatus: async () => {
      return measurePerformanceAsync(
        log,
        'security.entityAnalytics.getRiskEngineStatus',
        async () => {
          const response = await kbnClient.request<RiskEngineStatusResponse>({
            method: 'GET',
            path: `${basePath}${RISK_ENGINE_STATUS_URL}`,
            headers: {
              'elastic-api-version': API_VERSIONS.internal.v1,
            },
          });
          return response.data;
        }
      );
    },

    getEntityStoreStatus: async () => {
      return measurePerformanceAsync(
        log,
        'security.entityAnalytics.getEntityStoreStatus',
        async () => {
          const response = await kbnClient.request<GetEntityStoreStatusResponse>({
            method: 'GET',
            path: `${basePath}${ENTITY_STORE_STATUS_URL}`,
            headers: {
              'elastic-api-version': API_VERSIONS.public.v1,
            },
          });
          return response.data;
        }
      );
    },

    waitForEntityStoreStatus: async (expectedStatus: 'running', timeoutMs: number = 60000) => {
      return measurePerformanceAsync(
        log,
        `security.entityAnalytics.waitForEntityStoreStatus [${expectedStatus}]`,
        async () => {
          const startTime = Date.now();
          let lastStatus: GetEntityStoreStatusResponse | undefined;

          while (Date.now() - startTime < timeoutMs) {
            try {
              const status = await service.getEntityStoreStatus();
              lastStatus = status;

              if (status.status === expectedStatus) {
                return status;
              }
            } catch (error) {
              log.debug(`Error checking entity store status: ${error}`);
            }

            await new Promise((resolve) => setTimeout(resolve, 1000));
          }

          throw new Error(
            `Timeout waiting for entity store status '${expectedStatus}' after ${timeoutMs}ms. Last status: ${JSON.stringify(
              lastStatus
            )}`
          );
        }
      );
    },

    waitForEntityStoreStatusToChange: async (timeoutMs: number = 60000) => {
      return measurePerformanceAsync(
        log,
        'security.entityAnalytics.waitForEntityStoreStatusToChange',
        async () => {
          const startTime = Date.now();
          let lastStatus: GetEntityStoreStatusResponse | undefined;

          while (Date.now() - startTime < timeoutMs) {
            try {
              const status = await service.getEntityStoreStatus();
              lastStatus = status;

              // Wait for status to change from 'not_installed' to any other state
              // This confirms the backend has processed the enable request
              if (status.status !== 'not_installed') {
                return status;
              }
            } catch (error) {
              log.debug(`Error checking entity store status: ${error}`);
            }

            await new Promise((resolve) => setTimeout(resolve, 1000));
          }

          throw new Error(
            `Timeout waiting for entity store status to change from 'not_installed' after ${timeoutMs}ms. Last status: ${JSON.stringify(
              lastStatus
            )}`
          );
        }
      );
    },

    waitForEntityStoreCleanup: async (timeoutMs: number = 60000) => {
      return measurePerformanceAsync(
        log,
        'security.entityAnalytics.waitForEntityStoreCleanup',
        async () => {
          // Check status first - if already clean, return immediately
          try {
            const currentStatus = await service.getEntityStoreStatus();
            if (currentStatus.status === 'not_installed') {
              return currentStatus;
            }
          } catch (error) {
            log.debug(`Error checking initial entity store status: ${error}`);
          }

          // Status is not clean, wait for cleanup to complete
          const startTime = Date.now();
          let lastStatus: GetEntityStoreStatusResponse | undefined;

          while (Date.now() - startTime < timeoutMs) {
            try {
              const status = await service.getEntityStoreStatus();
              lastStatus = status;

              // Wait for status to be 'not_installed' - confirms cleanup is complete
              if (status.status === 'not_installed') {
                return status;
              }
            } catch (error) {
              log.debug(`Error checking entity store status during cleanup: ${error}`);
            }

            await new Promise((resolve) => setTimeout(resolve, 1000));
          }

          throw new Error(
            `Timeout waiting for entity store cleanup (status 'not_installed') after ${timeoutMs}ms. Last status: ${JSON.stringify(
              lastStatus
            )}`
          );
        }
      );
    },

    waitForRiskEngineCleanup: async (timeoutMs: number = 60000) => {
      return measurePerformanceAsync(
        log,
        'security.entityAnalytics.waitForRiskEngineCleanup',
        async () => {
          const startTime = Date.now();
          let lastStatus: RiskEngineStatusResponse | undefined;

          while (Date.now() - startTime < timeoutMs) {
            try {
              const status = await service.getRiskEngineStatus();
              lastStatus = status;

              // Wait for status to be 'NOT_INSTALLED' - confirms cleanup is complete
              if (status.risk_engine_status === 'NOT_INSTALLED') {
                return status;
              }
            } catch (error) {
              log.debug(`Error checking risk engine status during cleanup: ${error}`);
            }

            await new Promise((resolve) => setTimeout(resolve, 1000));
          }

          throw new Error(
            `Timeout waiting for risk engine cleanup (status 'NOT_INSTALLED') after ${timeoutMs}ms. Last status: ${JSON.stringify(
              lastStatus
            )}`
          );
        }
      );
    },
  };

  return service;
};
