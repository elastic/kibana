/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract, Logger } from '@kbn/core/server';
import { SavedObjectsClient, type ElasticsearchClient } from '@kbn/core/server';
import { ASSET_CRITICALITY_INDEX_BASE } from '../../../../common/entity_analytics/asset_criticality';
import type { EntityAnalyticsMigrationsParams } from '../migrations';
import { getAllConfigurations } from '../risk_engine/utils/saved_object_configuration';

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

const getAllAssetCriticalitySpaces = async (
  esClient: ElasticsearchClient,
  logger: Logger
): Promise<string[]> => {
  try {
    const response = await esClient.indices.get({
      index: `${ASSET_CRITICALITY_INDEX_BASE}-*`,
      allow_no_indices: true,
    });

    const namespaces: string[] = [];

    for (const index of Object.keys(response)) {
      const maybeNamespace = index.split(`${ASSET_CRITICALITY_INDEX_BASE}-`).at(-1);
      if (maybeNamespace) {
        namespaces.push(maybeNamespace);
      } else {
        logger.warn(
          `Index ${index} does not follow the expected naming convention for asset criticality indices.`
        );
      }
    }
    return namespaces;
  } catch (e) {
    if (e.meta?.statusCode === 404) {
      return [];
    }
    throw new Error(`Error fetching asset criticality spaces: ${e}`);
  }
};

const getAllRiskEngineSpaces = async (
  internalSoClient: SavedObjectsClientContract
): Promise<string[]> => {
  const allRiskEngineConfigurations = await getAllConfigurations({
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
}: EntityAnalyticsMigrationsParams) => {
  const [coreStart] = await getStartServices();
  const esClient = coreStart.elasticsearch.client.asInternalUser;
  const savedObjectsRepo = coreStart.savedObjects.createInternalRepository();
  const internalSoClient = new SavedObjectsClient(savedObjectsRepo);

  const assetCriticalitySpaces = await getAllAssetCriticalitySpaces(esClient, logger);
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
