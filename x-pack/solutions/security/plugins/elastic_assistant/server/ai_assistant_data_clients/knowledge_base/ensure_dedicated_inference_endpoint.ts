/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  MlTrainedModelDeploymentNodesStats,
  MlTrainedModelStats,
} from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { TrainedModelsProvider } from '@kbn/ml-plugin/server/shared_services/providers';
import type { IndexEntry } from '@kbn/elastic-assistant-common';
import pRetry from 'p-retry';
import { v4 as uuidv4 } from 'uuid';
import { defaultInferenceEndpoints } from '@kbn/inference-common';
import { findDocuments } from '../find';
import type { EsIndexEntry } from './types';
import { transformESSearchToKnowledgeBaseEntry } from './transforms';
import { ASSISTANT_ELSER_INFERENCE_ID } from './field_maps_configuration';

export const getInferenceEndpointId = async ({ esClient }: { esClient: ElasticsearchClient }) => {
  try {
    const elasticsearchInference = await esClient.inference.get({
      inference_id: ASSISTANT_ELSER_INFERENCE_ID,
      task_type: 'sparse_embedding',
    });

    if (elasticsearchInference) {
      return ASSISTANT_ELSER_INFERENCE_ID;
    }
  } catch (_) {
    /* empty */
  }

  // Fallback to the default inference endpoint
  return defaultInferenceEndpoints.ELSER;
};

/**
 * Checks if the inference endpoint is deployed and allocated in Elasticsearch
 *
 * @returns Promise<boolean> indicating whether the model is deployed
 */
export const isInferenceEndpointExists = async ({
  esClient,
  inferenceEndpointId,
  getTrainedModelsProvider,
  logger,
}: {
  esClient: ElasticsearchClient;
  getTrainedModelsProvider: () => ReturnType<TrainedModelsProvider['trainedModelsProvider']>;
  inferenceEndpointId?: string;
  logger: Logger;
}): Promise<boolean> => {
  const inferenceId = inferenceEndpointId || (await getInferenceEndpointId({ esClient }));

  try {
    const response = await esClient.inference.get({
      inference_id: inferenceId,
      task_type: 'sparse_embedding',
    });

    if (!response.endpoints?.[0]?.service_settings?.model_id) {
      return false;
    }

    let getResponse;
    try {
      getResponse = await getTrainedModelsProvider().getTrainedModelsStats({
        model_id: response.endpoints?.[0]?.service_settings?.model_id,
      });
    } catch (e) {
      return false;
    }

    // For standardized way of checking deployment status see: https://github.com/elastic/elasticsearch/issues/106986
    const isReadyESS = (stats: MlTrainedModelStats) =>
      stats.deployment_stats?.state === 'started' &&
      stats.deployment_stats?.allocation_status?.state === 'fully_allocated';

    const isReadyServerless = (stats: MlTrainedModelStats) =>
      (stats.deployment_stats?.nodes as unknown as MlTrainedModelDeploymentNodesStats[])?.some(
        (node) => node.routing_state.routing_state === 'started'
      );

    return !!getResponse.trained_model_stats
      .filter((stats) => stats.deployment_stats?.deployment_id === inferenceId)
      ?.some((stats) => isReadyESS(stats) || isReadyServerless(stats));
  } catch (error) {
    logger.debug(`Error checking if Inference endpoint ${inferenceId} exists: ${error}`);
    return false;
  }
};

export const hasDedicatedInferenceEndpointIndexEntries = async ({
  esClient,
  index,
  logger,
}: {
  esClient: ElasticsearchClient;
  index: string;
  logger: Logger;
}): Promise<boolean> => {
  try {
    // Track if we've already created an inference endpoint to ensure we only create it once
    let inferenceEndpointUsed = false;

    // Pull knowledge base entries of type "index"
    const results = await findDocuments<EsIndexEntry>({
      perPage: 100,
      page: 1,
      filter: 'type:index',
      esClient,
      logger,
      index,
    });

    if (!results || !results.data.hits.hits.length) {
      logger.debug('No index type knowledge base entries found');
      return false;
    }

    const indexEntries = transformESSearchToKnowledgeBaseEntry(results.data) as IndexEntry[];

    for (const entry of indexEntries) {
      // Skip if we've already created the inference endpoint
      if (inferenceEndpointUsed) {
        break;
      }

      try {
        // Get the specific field mapping directly from Elasticsearch
        const fieldMappingResponse = await esClient.indices.getFieldMapping({
          index: entry.index,
          fields: entry.field,
          include_defaults: true,
        });

        // Check each index for the field with inference_id
        for (const indexName of Object.keys(fieldMappingResponse)) {
          // Skip if we've already created the inference endpoint
          if (inferenceEndpointUsed) {
            break;
          }

          const mappings = fieldMappingResponse[indexName].mappings || {};

          // Check if the field exists and has mapping information
          if (mappings[entry.field] && mappings[entry.field].mapping) {
            // The field mapping structure is nested under the field name and then 'mapping'
            const fieldMapping = mappings[entry.field].mapping[entry.field];

            // Check if it's a semantic_text field with the specific inference_id
            if (
              fieldMapping &&
              fieldMapping.type === 'semantic_text' &&
              fieldMapping.inference_id === ASSISTANT_ELSER_INFERENCE_ID
            ) {
              inferenceEndpointUsed = true;

              // No need to check other fields or indices
              break;
            }
          }
        }
      } catch (error) {
        logger.error(`Error checking field mappings for index ${entry.index}: ${error.message}`);
      }
    }

    return inferenceEndpointUsed;
  } catch (error) {
    return false;
  }
};

export const dryRunTrainedModelDeployment = async ({
  esClient,
  elserId,
  logger,
  getTrainedModelsProvider,
}: {
  esClient: ElasticsearchClient;
  elserId: string;
  logger: Logger;
  getTrainedModelsProvider: () => ReturnType<TrainedModelsProvider['trainedModelsProvider']>;
}) => {
  try {
    const deploymentId = uuidv4();
    // As there is no better way to check if the model is deployed, we try to start the model
    // deployment and throw an error if it fails
    const dryRunId = await esClient.ml.startTrainedModelDeployment({
      model_id: elserId,
      deployment_id: deploymentId,
      wait_for: 'fully_allocated',
    });
    logger.debug(`Dry run for ELSER model '${elserId}' successfully deployed!`);

    await getTrainedModelsProvider().stopTrainedModelDeployment({
      model_id: elserId,
      deployment_id: dryRunId.assignment.task_parameters.deployment_id,
    });
    logger.debug(`Dry run for ELSER model '${elserId}' successfully stopped!`);
  } catch (e) {
    logger.error(`Dry run error starting trained model deployment: ${e.message}`);
    throw new Error(`${e.message}`);
  }
};

export const deleteInferenceEndpoint = async ({
  esClient,
  logger,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
}) => {
  try {
    await esClient.inference.delete({
      inference_id: ASSISTANT_ELSER_INFERENCE_ID,
      // it's being used in the mapping so we need to force delete
      force: true,
    });
    logger.debug(
      `Deleted existing inference endpoint ${ASSISTANT_ELSER_INFERENCE_ID} for ELSER model`
    );
  } catch (error) {
    logger.debug(
      `Error deleting inference endpoint ${ASSISTANT_ELSER_INFERENCE_ID} for ELSER model:\n${error}`
    );
  }
};

export const createInferenceEndpoint = async ({
  elserId,
  logger,
  esClient,
  inferenceId,
  getTrainedModelsProvider,
}: {
  elserId: string;
  logger: Logger;
  esClient: ElasticsearchClient;
  inferenceId: string;
  getTrainedModelsProvider: () => ReturnType<TrainedModelsProvider['trainedModelsProvider']>;
}) => {
  if (inferenceId === ASSISTANT_ELSER_INFERENCE_ID) {
    await deleteInferenceEndpoint({ esClient, logger });

    await pRetry(
      async () =>
        dryRunTrainedModelDeployment({ elserId, esClient, logger, getTrainedModelsProvider }),
      {
        minTimeout: 10000,
        maxTimeout: 10000,
        retries: 1,
      }
    );

    try {
      await esClient.inference.put({
        task_type: 'sparse_embedding',
        inference_id: ASSISTANT_ELSER_INFERENCE_ID,
        inference_config: {
          service: 'elasticsearch',
          service_settings: {
            adaptive_allocations: {
              enabled: true,
              min_number_of_allocations: 0,
              max_number_of_allocations: 8,
            },
            num_threads: 1,
            model_id: elserId,
          },
          task_settings: {},
        },
      });

      // await for the model to be deployed
      const inferenceEndpointExists = await isInferenceEndpointExists({
        esClient,
        inferenceEndpointId: ASSISTANT_ELSER_INFERENCE_ID,
        getTrainedModelsProvider,
        logger,
      });
      if (!inferenceEndpointExists) {
        throw new Error(
          `Inference endpoint for ELSER model '${elserId}' was not deployed successfully`
        );
      }
    } catch (error) {
      logger.error(`Error creating inference endpoint for ELSER model '${elserId}':\n${error}`);
      throw new Error(`Error creating inference endpoint for ELSER model '${elserId}':\n${error}`);
    }
  } else {
    await dryRunTrainedModelDeployment({ elserId, esClient, logger, getTrainedModelsProvider });
  }
};

export const ensureDedicatedInferenceEndpoint = async ({
  elserId,
  esClient,
  logger,
  index,
  getTrainedModelsProvider,
}: {
  elserId: string;
  logger: Logger;
  esClient: ElasticsearchClient;
  index: string;
  getTrainedModelsProvider: () => ReturnType<TrainedModelsProvider['trainedModelsProvider']>;
}): Promise<void> => {
  try {
    const isEndpointUsed = await hasDedicatedInferenceEndpointIndexEntries({
      esClient,
      index,
      logger,
    });

    const inferenceEndpointExists = await isInferenceEndpointExists({
      esClient,
      inferenceEndpointId: ASSISTANT_ELSER_INFERENCE_ID,
      getTrainedModelsProvider,
      logger,
    });

    if (!isEndpointUsed) {
      if (inferenceEndpointExists) {
        await deleteInferenceEndpoint({
          esClient,
          logger,
        });
      }
      return;
    }

    if (inferenceEndpointExists) {
      logger.debug(`Inference endpoint ${ASSISTANT_ELSER_INFERENCE_ID} already exists.`);
      return;
    }

    await createInferenceEndpoint({
      elserId,
      esClient,
      logger,
      inferenceId: ASSISTANT_ELSER_INFERENCE_ID,
      getTrainedModelsProvider,
    });
  } catch (error) {
    logger.error(`Error in ensureDedicatedInferenceEndpoint: ${error.message}`);
  }
};
