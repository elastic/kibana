/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SavedObjectsClientContract,
  SavedObjectsClient,
  type ElasticsearchClient,
} from '@kbn/core/server';
import type { EntityAnalyticsMigrationsParams } from '../migrations';
import { getAllSpaceConfigurations } from '../risk_engine/utils/saved_object_configuration';
import { AssetCriticalityMigrationClient } from '../asset_criticality/asset_criticality_migration_client';

export const getIngestPipelineName = (namespace: string): string => {
  return `entity_analytics_create_eventIngest_from_timestamp-pipeline-${namespace}`;
};

export const createEventIngestedPipeline = async (
  esClient: ElasticsearchClient,
  namespace: string
) => {
  const ingestTimestampPipeline = getIngestPipelineName(namespace);

  try {
    const pipeline = {
      id: ingestTimestampPipeline,
      _meta: {
        managed_by: 'entity_analytics',
        managed: true,
      },
      description: 'Pipeline for adding timestamp value to event.ingested',
      processors: [
        {
          set: {
            field: 'event.ingested',
            value: '{{_ingest.timestamp}}',
          },
        },
      ],
    };

    await esClient.ingest.putPipeline(pipeline);
  } catch (e) {
    throw new Error(`Error creating ingest pipeline: ${e}`);
  }
};

const hasEventIngestedPipeline = async (
  esClient: ElasticsearchClient,
  namespace: string
): Promise<boolean> => {
  const ingestTimestampPipeline = getIngestPipelineName(namespace);

  try {
    const response = await esClient.ingest.getPipeline({
      id: ingestTimestampPipeline,
    });

    return Boolean(response[ingestTimestampPipeline]);
  } catch (e) {
    if (e.meta?.statusCode === 404) {
      return false;
    }
    throw new Error(`Error checking ingest pipeline: ${e}`);
  }
};

const getAllRiskEngineSpaces = async (
  internalSoClient: SavedObjectsClientContract
): Promise<string[]> => {
  const allRiskEngineConfigurations = await getAllSpaceConfigurations({
    savedObjectsClient: internalSoClient,
  });
  return allRiskEngineConfigurations.flatMap((config) => config.namespaces || []);
};

/**
 * Creates the `event.ingested` ingest pipeline in all namespaces where either asset criticality or risk engine configurations exist.
 * In 9.0 and 8.18, this pipeline creation was missing, stopping risk scoring from working.
 * This function fixes that.
 **/
export const createEventIngestedPipelineInAllNamespaces = async ({
  getStartServices,
  logger,
  auditLogger,
}: EntityAnalyticsMigrationsParams) => {
  const [coreStart] = await getStartServices();
  const esClient = coreStart.elasticsearch.client.asInternalUser;
  const savedObjectsRepo = coreStart.savedObjects.createInternalRepository();
  const internalSoClient = new SavedObjectsClient(savedObjectsRepo);
  const assetCriticalityMigrationClient = new AssetCriticalityMigrationClient({
    esClient,
    logger,
    auditLogger,
  });
  const assetCriticalitySpaces =
    await assetCriticalityMigrationClient.getAllSpacesWithAssetCriticalityInstalled();
  const riskEngineSpaces = await getAllRiskEngineSpaces(internalSoClient);
  const uniqueNamespaces = new Set([...assetCriticalitySpaces, ...riskEngineSpaces]);

  for (const namespace of uniqueNamespaces) {
    const pipelineExists = await hasEventIngestedPipeline(esClient, namespace);
    if (!pipelineExists) {
      logger.info(`Creating event.ingested ingest pipeline for namespace: ${namespace}`);
      await createEventIngestedPipeline(esClient, namespace);
    }
  }
};
