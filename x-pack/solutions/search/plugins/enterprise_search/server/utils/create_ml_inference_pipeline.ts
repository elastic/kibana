/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IngestPipeline } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';

import type { AttachMlInferencePipelineResponse } from '../../common/types/pipelines';

import { getInferencePipelineNameFromIndexName } from './ml_inference_pipeline_utils';

/**
 * Adds the supplied a Machine Learning Inference pipeline reference to the "parent" ML Inference
 * pipeline that is associated with the index.
 * @param indexName name of the index this pipeline corresponds to.
 * @param pipelineName name of the ML Inference pipeline to add.
 * @param esClient the Elasticsearch Client to use when retrieving pipeline details.
 */
export const addSubPipelineToIndexSpecificMlPipeline = async (
  indexName: string,
  pipelineName: string,
  esClient: ElasticsearchClient
): Promise<AttachMlInferencePipelineResponse> => {
  const parentPipelineId = getInferencePipelineNameFromIndexName(indexName);

  // Fetch the parent pipeline
  let parentPipeline: IngestPipeline | undefined;
  try {
    const pipelineResponse = await esClient.ingest.getPipeline({
      id: parentPipelineId,
    });
    parentPipeline = pipelineResponse[parentPipelineId];
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    // Swallow error; in this case the next step will return
  }

  // Verify the parent pipeline exists with a processors array
  if (!parentPipeline?.processors) {
    return Promise.resolve({
      addedToParentPipeline: false,
      id: pipelineName,
    });
  }

  // Check if the sub-pipeline reference is already in the list of processors,
  // if so, don't modify it
  const existingSubPipeline = parentPipeline.processors.find(
    (p) => p.pipeline?.name === pipelineName
  );
  if (existingSubPipeline) {
    return Promise.resolve({
      addedToParentPipeline: false,
      id: pipelineName,
    });
  }

  // Add sub-processor to the ML inference parent pipeline
  parentPipeline.processors.push({
    pipeline: {
      name: pipelineName,
    },
  });

  // Remove system-managed properties (dates) that cannot be set during create/update of ingest pipelines
  const {
    created_date: _createdDate,
    created_date_millis: _createdDateMillis,
    modified_date: _modifiedDate,
    modified_date_millis: _modifiedDateMillis,
    ...pipelineWithoutManagedFields
  } = parentPipeline;

  await esClient.ingest.putPipeline({
    id: parentPipelineId,
    ...pipelineWithoutManagedFields,
  });

  return Promise.resolve({
    addedToParentPipeline: true,
    id: pipelineName,
  });
};
