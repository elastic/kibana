/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IngestPipeline,
  IngestPutPipelineRequest,
} from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';

import type { DeleteMlInferencePipelineResponse } from '../../../../../../common/types/pipelines';

import { getInferencePipelineNameFromIndexName } from '../../../../../utils/ml_inference_pipeline_utils';

export const detachMlInferencePipeline = async (
  indexName: string,
  pipelineName: string,
  client: ElasticsearchClient
) => {
  const response: DeleteMlInferencePipelineResponse = {};
  const parentPipelineId = getInferencePipelineNameFromIndexName(indexName);

  // find parent pipeline
  const pipelineResponse = await client.ingest.getPipeline({
    id: parentPipelineId,
  });

  const parentPipeline: IngestPipeline | undefined = pipelineResponse[parentPipelineId];

  if (parentPipeline !== undefined) {
    // remove sub-pipeline from parent pipeline
    if (parentPipeline.processors !== undefined) {
      const updatedProcessors = parentPipeline.processors.filter(
        (p) => !(p.pipeline !== undefined && p.pipeline.name === pipelineName)
      );
      // only update if we changed something
      if (updatedProcessors.length !== parentPipeline.processors.length) {
        // Remove system-managed properties (dates) that cannot be set during create/update of ingest pipelines
        const {
          created_date: _createdDate,
          created_date_millis: _createdDateMillis,
          modified_date: _modifiedDate,
          modified_date_millis: _modifiedDateMillis,
          ...pipelineWithoutManagedFields
        } = parentPipeline;

        const updatedPipeline: IngestPutPipelineRequest = {
          ...pipelineWithoutManagedFields,
          id: parentPipelineId,
          processors: updatedProcessors,
        };

        const updateResponse = await client.ingest.putPipeline(updatedPipeline);
        if (updateResponse.acknowledged === true) {
          response.updated = parentPipelineId;
        }
      }
    }
  }

  return response;
};
