/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';

import { addSubPipelineToIndexSpecificMlPipeline } from '../../../../../utils/create_ml_inference_pipeline';

export const attachMlInferencePipeline = async (
  indexName: string,
  pipelineName: string,
  esClient: ElasticsearchClient
) => {
  const response = await addSubPipelineToIndexSpecificMlPipeline(indexName, pipelineName, esClient);

  return response;
};
