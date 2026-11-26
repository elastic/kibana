/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RegisterEntityMaintainerConfig } from '@kbn/entity-store/server';

import { runRelationshipMaintainer } from '../engine/run_relationship_maintainer';
import type { RelationshipMaintainerTelemetryCollector } from '../types';
import { ACTS_ON_BEHALF_OF_INTEGRATION_RELATIONSHIP_CONFIGS } from './configs';

export const actsOnBehalfOfMaintainer: RegisterEntityMaintainerConfig = {
  id: 'acts_on_behalf_of',
  description:
    'Resolves the account emails on AI agents to the user entities that carry them, following entity resolution',
  interval: '1h',
  timeout: '1h',
  initialState: {},
  run: async ({
    esClient,
    cpsEsClient,
    logger,
    status,
    crudClient,
    entityMetadataClient,
    relationshipsClient,
    signal,
    telemetry,
  }) => {
    const namespace = status.metadata.namespace;
    logger.info('[acts_on_behalf_of] Starting run');

    const collector: RelationshipMaintainerTelemetryCollector = {
      sources: [],
      relationshipTypeApplied: {},
    };

    const result = await runRelationshipMaintainer({
      esClient,
      cpsEsClient,
      logger,
      namespace,
      crudClient,
      entityMetadataClient,
      relationshipsClient,
      integrations: ACTS_ON_BEHALF_OF_INTEGRATION_RELATIONSHIP_CONFIGS,
      maintainerName: 'acts_on_behalf_of',
      signal,
      telemetryCollector: collector,
    });

    telemetry.report({
      iterations: result.totalIterations,
      truncated: result.truncated,
      funnel: {
        scanned: result.totalBuckets,
        qualified: result.totalRecords,
        proposed: result.totalRecords,
        applied: result.totalWritten,
        droppedNotInStore: result.totalNotFound,
        targetIdsNotInStore: result.totalTargetIdsNotInStore,
        failed: result.totalWriteErrors,
        metadataDocsApplied: result.totalMetadataDocsApplied,
        metadataDocsFailed: result.totalMetadataDocsFailed,
      },
      sources: collector.sources,
    });

    logger.info(
      `[acts_on_behalf_of] Completed run: ${result.totalBuckets} buckets, ${result.totalRecords} records, ${result.totalWritten} entities written, ${result.totalNotFound} actors not in store, ${result.totalTargetIdsNotInStore} targetIdsNotInStore`
    );
    return result;
  },
};
