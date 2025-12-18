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

  return {
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
  };
};
