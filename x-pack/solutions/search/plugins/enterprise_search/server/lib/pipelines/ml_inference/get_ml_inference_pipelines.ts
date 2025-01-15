/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IngestPipeline, IngestProcessorContainer } from '@elastic/elasticsearch/lib/api/types';
import { ElasticsearchClient } from '@kbn/core/server';
import { MlTrainedModels } from '@kbn/ml-plugin/server';

/**
 * Gets all ML inference pipelines. Redacts trained model IDs in those pipelines which reference
 * a model inaccessible in the current Kibana space.
 * @param esClient the Elasticsearch Client to use to fetch the errors.
 * @param trainedModelsProvider ML trained models provider.
 */
export const getMlInferencePipelines = async (
  esClient: ElasticsearchClient,
  trainedModelsProvider: MlTrainedModels | undefined
): Promise<Record<string, IngestPipeline>> => {
  if (!trainedModelsProvider) {
    throw new Error('Machine Learning is not enabled');
  }

  // Fetch all ML inference pipelines and trained models that are accessible in the current
  // Kibana space
  const [fetchedInferencePipelines, trainedModels] = await Promise.all([
    esClient.ingest
      .getPipeline({
        id: 'ml-inference-*',
      })
      .catch((e) => {
        // handle no pipelines 404 error and return empty record
        if (e?.meta?.statusCode === 404) return {};
        throw e;
      }),
    trainedModelsProvider.getTrainedModels({}),
  ]);
  const accessibleModelIds = Object.values(trainedModels.trained_model_configs).map(
    (modelConfig) => modelConfig.model_id
  );

  // Process pipelines: check if the model_id is one of the redacted ones, if so, redact it in the
  // result as well
  const inferencePipelinesResult = Object.entries(fetchedInferencePipelines).reduce<
    Record<string, IngestPipeline>
  >((currentPipelines, [name, inferencePipeline]) => {
    currentPipelines[name] = {
      ...inferencePipeline,
      processors: inferencePipeline.processors?.map((processor) =>
        redactModelIdIfInaccessible(processor, accessibleModelIds)
      ),
    };
    return currentPipelines;
  }, {});

  return inferencePipelinesResult;
};

/**
 * Convenience function to redact the trained model ID in an ML inference processor if the model is
 * not accessible in the current Kibana space. In this case `model_id` gets replaced with `''`.
 * @param processor the processor to process.
 * @param accessibleModelIds array of known accessible model IDs.
 * @returns the input processor if unchanged, or a copy of the processor with the model ID redacted.
 */
function redactModelIdIfInaccessible(
  processor: IngestProcessorContainer,
  accessibleModelIds: string[]
): IngestProcessorContainer {
  if (!processor.inference || accessibleModelIds.includes(processor.inference.model_id)) {
    return processor;
  }

  return {
    ...processor,
    inference: {
      ...processor.inference,
      model_id: '',
    },
  };
}
