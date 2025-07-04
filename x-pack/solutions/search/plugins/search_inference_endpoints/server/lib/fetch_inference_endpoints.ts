/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { InferenceAPIConfigResponse } from '@kbn/ml-trained-models-utils';

export const fetchInferenceEndpoints = async (
  client: ElasticsearchClient
): Promise<{
  inferenceEndpoints: InferenceAPIConfigResponse[];
}> => {
  const { endpoints } = await client.inference.get({
    inference_id: '_all',
  });

  return {
    inferenceEndpoints: endpoints as InferenceAPIConfigResponse[],
  };
};
