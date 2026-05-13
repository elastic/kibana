/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RegisterEntityMaintainerConfig } from '@kbn/entity-store/server';

import { runGenericMaintainer } from '../engine/run_relationship_maintainer';
import { COMMUNICATES_WITH_ENGINE_CONFIGS } from './configs';

export const communicatesWithMaintainer: RegisterEntityMaintainerConfig = {
  id: 'communicates_with',
  description: 'Computes communicates_with relationships from cloud API and MDM activity events',
  interval: '1d',
  initialState: {},
  run: async ({ esClient, logger, status, crudClient, abortController }) => {
    const namespace = status.metadata.namespace;
    logger.info('Starting communicates_with maintainer run');
    const result = await runGenericMaintainer({
      esClient,
      logger,
      namespace,
      crudClient,
      integrations: COMMUNICATES_WITH_ENGINE_CONFIGS,
      abortController,
    });
    logger.info(
      `Completed run: ${result.totalBuckets} buckets, ${result.totalRecords} records, ${result.totalWritten} entities written`
    );
    return result;
  },
};
