/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { defaultInferenceEndpoints } from '@kbn/inference-common';

export const resolveElserInferenceId = async (
  esClient: ElasticsearchClient,
  configuredInferenceId?: string
): Promise<string> => {
  if (configuredInferenceId !== undefined) {
    return configuredInferenceId;
  }

  try {
    const { endpoints } = await esClient.inference.get({});
    if (
      endpoints?.some(
        ({ inference_id: inferenceId }) =>
          inferenceId === defaultInferenceEndpoints.ELSER_IN_EIS_INFERENCE_ID
      )
    ) {
      return defaultInferenceEndpoints.ELSER_IN_EIS_INFERENCE_ID;
    }
  } catch {
    return defaultInferenceEndpoints.ELSER;
  }

  return defaultInferenceEndpoints.ELSER;
};
