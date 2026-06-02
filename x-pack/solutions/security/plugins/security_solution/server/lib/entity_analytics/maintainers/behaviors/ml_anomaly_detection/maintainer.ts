/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { RegisterEntityMaintainerConfig } from '@kbn/entity-store/server';
import type { EntityType } from '@kbn/entity-store/common';
import type { Entity } from '@kbn/entity-store/common/domain/definitions/entity.gen';
import type { MlPluginSetup } from '@kbn/ml-plugin/server';
import {
  ENTITY_PAGE_SIZE,
  MAX_ALLOWED_ITERS,
  ML_AD_JOB_ENTITY_TYPES,
  ML_AD_MAINTAINER_ID,
} from './constants';
import { ensureMlAdDetailsDataStream } from './details_index';
import { fetchAnomaliesForEntityBatch } from './fetch_anomalies';
import type { EntityAnalyticsRoutesDeps } from '../../../types';
import { updateEntityStore } from './update_entity_store';
import { enrichAndPersistAnomalies } from './enrich_and_persist';

interface MlAnomalyDetectionBehaviorMaintainerDeps {
  getStartServices: EntityAnalyticsRoutesDeps['getStartServices'];
  ml: MlPluginSetup;
  logger: Logger;
}

type MaintainerConfig = Pick<RegisterEntityMaintainerConfig, 'setup' | 'run'>;
type RunContext = Parameters<NonNullable<MaintainerConfig['run']>>[0];
type CrudClient = RunContext['crudClient'];

export const createMlAnomalyDetectionBehaviorMaintainer = ({
  getStartServices,
  ml,
  logger: loggerInput,
}: MlAnomalyDetectionBehaviorMaintainerDeps): MaintainerConfig => {
  let logger = loggerInput;
  return {
    setup: async ({ esClient, status }) => {
      const namespace = status.metadata.namespace;
      logger = loggerInput.get(`${ML_AD_MAINTAINER_ID}-${namespace}`);
      await ensureMlAdDetailsDataStream({ esClient, logger, namespace });
      return status.state;
    },
    run: async ({ abortController, crudClient, esClient, fakeRequest, status }) => {
      const namespace = status.metadata.namespace;
      logger = loggerInput.get(`${ML_AD_MAINTAINER_ID}-${namespace}`);
      const [coreStart] = await getStartServices();

      const maintainerRunStartedAtMs = Date.now();
      const soClient = coreStart.savedObjects.getScopedClient(fakeRequest);

      for (const entityType of ML_AD_JOB_ENTITY_TYPES) {
        if (abortController.signal.aborted) {
          logger.info(`Maintainer run aborted before processing entity type "${entityType}"`);
          break;
        }
        await processEntityType({
          abortSignal: abortController.signal,
          crudClient,
          entityType,
          esClient,
          logger,
          ml,
          namespace,
          soClient,
        });
      }

      const maintainerRunDurationMs = Date.now() - maintainerRunStartedAtMs;
      logger.info(`Maintainer run completed in ${maintainerRunDurationMs}ms`);

      return status.state;
    },
  };
};

interface ProcessEntityTypeOpts {
  abortSignal: AbortSignal;
  crudClient: CrudClient;
  entityType: EntityType;
  esClient: ElasticsearchClient;
  logger: Logger;
  ml: MlPluginSetup;
  namespace: string;
  soClient: SavedObjectsClientContract;
}

const processEntityType = async ({
  abortSignal,
  crudClient,
  entityType,
  esClient,
  logger,
  ml,
  namespace,
  soClient,
}: ProcessEntityTypeOpts): Promise<void> => {
  let searchAfter: Array<string | number> | undefined;
  let entitiesProcessed = 0;
  let iters = 0;

  logger.debug(`Processing entity type "${entityType}"`);
  do {
    if (abortSignal.aborted) {
      logger.info(`Maintainer run aborted during processing of entity type "${entityType}"`);
      break;
    }

    if (iters++ > MAX_ALLOWED_ITERS) {
      logger.debug(
        `Maintainer run short-circuited during processing of entity type "${entityType}" - max iterations reached`
      );
      break;
    }

    const { entities, nextSearchAfter } = await crudClient.listEntities({
      filter: [{ term: { 'entity.EngineMetadata.Type': entityType } }],
      size: ENTITY_PAGE_SIZE,
      searchAfter,
      source: ['entity.id'],
    });

    if (entities.length === 0) {
      break;
    }

    await processBatchOfEntities({
      abortSignal,
      crudClient,
      entityType,
      entities,
      esClient,
      logger,
      ml,
      namespace,
      soClient,
    });

    entitiesProcessed += entities.length;
    if (!nextSearchAfter || entities.length < ENTITY_PAGE_SIZE) {
      break;
    }
    searchAfter = nextSearchAfter;
  } while (searchAfter != null);

  logger.debug(`Processed ${entitiesProcessed} entities for entity type "${entityType}"`);
};

interface ProcessBatchOfEntitiesOpts {
  abortSignal: AbortSignal;
  crudClient: CrudClient;
  entities: Entity[];
  entityType: EntityType;
  esClient: ElasticsearchClient;
  logger: Logger;
  ml: MlPluginSetup;
  namespace: string;
  soClient: SavedObjectsClientContract;
}

const processBatchOfEntities = async ({
  abortSignal,
  crudClient,
  entityType,
  entities,
  esClient,
  logger,
  ml,
  namespace,
  soClient,
}: ProcessBatchOfEntitiesOpts): Promise<void> => {
  const entityIds = entities
    .map((entity) => entity.entity?.id)
    .filter((id): id is string => Boolean(id));

  if (entityIds.length === 0) return;

  // Query for anomaly records for the batch of entities
  const anomaliesByEntity = await fetchAnomaliesForEntityBatch({
    entityType,
    entityIds,
    logger,
    ml,
    soClient,
  });

  // Update the entity store with anomaly job IDs associated to each entity before enriching anomaly records, so that the baseline behavior fetch can leverage the updated entity documents
  await updateEntityStore({ anomaliesByEntity, entityType, logger, updateClient: crudClient });

  // Fetch baseline behavior for each anomaly type and persist all data into details index
  await enrichAndPersistAnomalies({
    abortSignal,
    anomaliesByEntity,
    entityType,
    esClient,
    logger,
    ml,
    namespace,
    soClient,
  });
};

export type RegisterMlAnomalyDetectionMaintainerDeps = Omit<
  MlAnomalyDetectionBehaviorMaintainerDeps,
  'ml'
> & {
  ml?: MlPluginSetup;
};
