/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient, ScoutLogger, ScoutParallelWorkerFixtures } from '@kbn/scout';
import { measurePerformanceAsync } from '@kbn/scout';

const DEFAULT_ALERTS_INDEX_PATTERN = '.alerts-security.alerts-';

export interface DetectionAlertsApiService {
  deleteAll: () => Promise<void>;
}

export const getDetectionAlertsApiService = ({
  esClient,
  log,
  scoutSpace,
}: {
  esClient: EsClient;
  log: ScoutLogger;
  scoutSpace?: ScoutParallelWorkerFixtures['scoutSpace'];
}): DetectionAlertsApiService => {
  const space = scoutSpace?.id ? scoutSpace?.id : 'default';

  return {
    deleteAll: async () => {
      await measurePerformanceAsync(log, 'security.detectionAlerts.deleteAll', async () => {
        await esClient.indices.refresh({ index: `${DEFAULT_ALERTS_INDEX_PATTERN}${space}` });

        await esClient.deleteByQuery({
          index: `${DEFAULT_ALERTS_INDEX_PATTERN}${space}`,
          query: {
            match_all: {},
          },
          conflicts: 'proceed',
          scroll_size: 10000,
          refresh: true,
        });
      });
    },
  };
};
