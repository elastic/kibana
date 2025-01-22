/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceTaskType } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { Config, Secrets } from '@kbn/inference-endpoint-ui-common';
import type { Logger } from '@kbn/logging';
import { unflattenObject } from '../utils/unflatten_object';

export const addInferenceEndpoint = async (
  esClient: ElasticsearchClient,
  type: string,
  id: string,
  config: Config,
  secrets: Secrets,
  logger: Logger
) => {
  try {
    /* task settings property is required in the API call 
    but no needed for inference or connector creation
    */
    const taskSettings = {};
    const serviceSettings = {
      ...unflattenObject(config?.providerConfig ?? {}),
      ...unflattenObject(secrets?.providerSecrets ?? {}),
    };

    return await esClient.inference.put({
      inference_id: config?.inferenceId ?? '',
      task_type: config?.taskType as InferenceTaskType,
      inference_config: {
        service: config?.provider,
        service_settings: serviceSettings,
        task_settings: taskSettings,
      },
    });
  } catch (e) {
    logger.warn(
      `Failed to create inference endpoint for task type "${config?.taskType}" and inference id ${config?.inferenceId}. Error: ${e.message}`
    );
    throw e;
  }
};
