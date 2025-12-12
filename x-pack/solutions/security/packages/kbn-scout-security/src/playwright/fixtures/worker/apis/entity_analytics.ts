/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient, ScoutLogger, ScoutParallelWorkerFixtures } from '@kbn/scout';
import { measurePerformanceAsync } from '@kbn/scout';

const ENTITY_STORE_ENGINES_URL = '/api/entity_store/engines';
const SAVED_OBJECTS_FIND_URL = '/api/saved_objects/_find';
const RISK_ENGINE_CONFIGURATION_TYPE = 'risk-engine-configuration';

export interface EntityAnalyticsApiService {
  deleteEntityStoreEngines: () => Promise<void>;
  deleteRiskEngineConfiguration: () => Promise<void>;
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
            ignoreErrors: [404, 500],
          });

          const savedObjectId = findResponse?.data?.saved_objects?.[0]?.id;
          if (savedObjectId) {
            await kbnClient.request({
              method: 'DELETE',
              path: `${basePath}/api/saved_objects/${RISK_ENGINE_CONFIGURATION_TYPE}/${savedObjectId}`,
              ignoreErrors: [404, 500],
            });
          }
        }
      );
    },
  };
};
