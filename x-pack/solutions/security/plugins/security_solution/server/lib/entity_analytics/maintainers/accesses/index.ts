/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RegisterEntityMaintainerConfig } from '@kbn/entity-store/server';

import { runRelationshipMaintainer } from '../engine/run_relationship_maintainer';
import { ACCESSES_INTEGRATION_RELATIONSHIP_CONFIGS } from './configs';

export const accessesFrequentlyMaintainer: RegisterEntityMaintainerConfig = {
  id: 'accesses_frequently_and_infrequently',
  description:
    'Computes accesses_frequently and accesses_infrequently relationships from authentication events',
  interval: '1d',
  initialState: {},
  run: async ({
    esClient,
    cpsEsClient,
    logger,
    status,
    crudClient,
    entityMetadataClient,
    abortController,
    telemetry,
  }) => {
    const namespace = status.metadata.namespace;
    logger.info('Starting accesses maintainer run');
    const result = await runRelationshipMaintainer({
      esClient,
      cpsEsClient,
      logger,
      namespace,
      crudClient,
      entityMetadataClient,
      integrations: ACCESSES_INTEGRATION_RELATIONSHIP_CONFIGS,
      abortController,
    });
    logger.info(
      `Completed run: ${result.totalBuckets} buckets, ${result.totalRecords} records, ${result.totalWritten} entities written, ${result.totalMetadataDocsApplied} metadata docs appended`
    );
    telemetry.report({
      funnel: {
        scanned: result.totalBuckets,
        qualified: result.totalRecords,
        applied: result.totalWritten,
        droppedNotInStore: result.totalNotFound,
        failed: result.totalWriteErrors,
        metadataDocsApplied: result.totalMetadataDocsApplied,
      },
    });
    return result;
  },
};
