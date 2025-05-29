/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClient, type ElasticsearchClient } from '@kbn/core/server';
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

const getEventIngestedPipeline = async (
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

export const createEventIngestedPipelineInAllNamespaces = async ({
  getStartServices,
  logger,
}: EntityAnalyticsMigrationsParams) => {
  const [coreStart] = await getStartServices();
  const esClient = coreStart.elasticsearch.client.asInternalUser;
  const savedObjectsRepo = coreStart.savedObjects.createInternalRepository();
  const internalSoClient = new SavedObjectsClient(savedObjectsRepo);

  const allRiskEngineConfigurations = await getAllConfigurations({
    savedObjectsClient: internalSoClient,
  });

  for (const { namespaces } of allRiskEngineConfigurations) {
    if (!namespaces || namespaces.length !== 1) {
      logger.warn(
        `Found risk engine configuration with multiple namespaces or no namespaces, skipping ingest pipeline creation for this configuration ${namespaces}`
      );
    } else {
      const pipelineExists = await getEventIngestedPipeline(esClient, namespaces[0]);
      if (!pipelineExists) {
        logger.info(`Creating event.ingested ingest pipeline for namespace: ${namespaces[0]}`);
        await createEventIngestedPipeline(esClient, namespaces[0]);
      }
    }
  }
};
