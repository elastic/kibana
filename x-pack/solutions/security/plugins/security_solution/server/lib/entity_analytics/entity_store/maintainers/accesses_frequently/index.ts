/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RegisterEntityMaintainerConfig } from '@kbn/entity-store/server';

import { MAINTAINER_ID } from './constants';
import { runMaintainer } from './run_maintainer';

export const accessesFrequentlyMaintainer: RegisterEntityMaintainerConfig = {
  id: MAINTAINER_ID,
  description:
    'Computes Accesses_frequently and Accesses_infrequently relationships from authentication events',
  interval: '1m',
  initialState: {},
  run: async ({ esClient, logger, status }) => {
    const namespace = status.metadata.namespace;
    logger.info('Starting accesses_frequently maintainer run');
    const result = await runMaintainer({ esClient, logger, namespace });
    logger.info(
      `Completed run: ${result.totalBuckets} user buckets, ${result.totalAccessRecords} access records, ${result.totalUpserted} entities upserted, ${result.visitedCount} events marked visited`
    );
    return result;
  },
};
