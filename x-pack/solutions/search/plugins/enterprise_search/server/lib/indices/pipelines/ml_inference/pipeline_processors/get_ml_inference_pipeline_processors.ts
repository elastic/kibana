/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IngestGetPipelineResponse } from '@elastic/elasticsearch/lib/api/types';
import { ElasticsearchClient } from '@kbn/core/server';
import { MlTrainedModels } from '@kbn/ml-plugin/server';

import {
  getMlModelTypesForModelConfig,
  parseModelStateFromStats,
  parseModelStateReasonFromStats,
} from '../../../../../../common/ml_inference_pipeline';
import { InferencePipeline, TrainedModelState } from '../../../../../../common/types/pipelines';
import { getInferencePipelineNameFromIndexName } from '../../../../../utils/ml_inference_pipeline_utils';

export type InferencePipelineData = InferencePipeline & {
  trainedModelName: string;
  sourceFields: string[];
};

export const fetchMlInferencePipelines = async (client: ElasticsearchClient) => {
  try {
    return await client.ingest.getPipeline({
      id: getInferencePipelineNameFromIndexName('*'),
    });
  } catch (error) {
    // The GET /_ingest/pipeline API returns an empty object on 404 Not Found. If there are no `@ml-inference`
    // pipelines then return an empty record of pipelines
    return {};
  }
};

export const getMlInferencePipelineProcessorNamesFromPipelines = (
  indexName: string,
  pipelines: IngestGetPipelineResponse
): string[] => {
  const mlInferencePipelineName = getInferencePipelineNameFromIndexName(indexName);
  if (pipelines?.[mlInferencePipelineName]?.processors === undefined) {
    return [];
  }
  const {
    [mlInferencePipelineName]: { processors: mlInferencePipelineProcessors = [] },
  } = pipelines;

  return mlInferencePipelineProcessors
    .map((obj) => obj.pipeline?.name)
    .filter((name): name is string => name !== undefined);
};

export const getProcessorPipelineMap = (
  pipelines: IngestGetPipelineResponse
): Record<string, string[]> => {
  const result: Record<string, string[]> = {};
  const addPipelineToProcessorMap = (processorName: string, pipelineName: string) => {
    if (processorName in result) {
      result[processorName].push(pipelineName);
    } else {
      result[processorName] = [pipelineName];
    }
  };

  Object.entries(pipelines).forEach(([name, pipeline]) =>
    pipeline?.processors?.forEach((processor) => {
      if (processor.pipeline?.name !== undefined) {
        addPipelineToProcessorMap(processor.pipeline.name, name);
      }
    })
  );

  return result;
};

export const fetchPipelineProcessorInferenceData = async (
  client: ElasticsearchClient,
  mlInferencePipelineProcessorNames: string[],
  pipelineProcessorsMap: Record<string, string[]>
): Promise<InferencePipelineData[]> => {
  const mlInferencePipelineProcessorConfigs = await client.ingest.getPipeline({
    id: mlInferencePipelineProcessorNames.join(),
  });

  return Object.keys(mlInferencePipelineProcessorConfigs).reduce(
    (pipelineProcessorData, pipelineProcessorName) => {
      // Get the processors for the current pipeline processor of the ML Inference Processor
      const subProcessors =
        mlInferencePipelineProcessorConfigs[pipelineProcessorName].processors || [];

      // Get the inference processors; there is one per configured field, but they share the same model ID
      const inferenceProcessors = subProcessors.filter((processor) =>
        Object.hasOwn(processor, 'inference')
      );

      const trainedModelName = inferenceProcessors[0]?.inference?.model_id;
      if (trainedModelName) {
        // Extract source fields from field mappings
        const sourceFields = inferenceProcessors.flatMap((processor) =>
          Object.keys(processor.inference?.field_map ?? {})
        );

        pipelineProcessorData.push({
          modelId: trainedModelName,
          modelState: TrainedModelState.NotDeployed,
          pipelineName: pipelineProcessorName,
          pipelineReferences: pipelineProcessorsMap?.[pipelineProcessorName] ?? [],
          trainedModelName,
          types: [],
          sourceFields,
        });
      }

      return pipelineProcessorData;
    },
    [] as InferencePipelineData[]
  );
};

export const getMlModelConfigsForModelIds = async (
  client: ElasticsearchClient,
  trainedModelsProvider: MlTrainedModels,
  trainedModelNames: string[]
): Promise<Record<string, InferencePipelineData>> => {
  const [trainedModels, trainedModelsStats, trainedModelsInCurrentSpace] = await Promise.all([
    client.ml.getTrainedModels({ model_id: trainedModelNames.join() }),
    client.ml.getTrainedModelsStats({ model_id: trainedModelNames.join() }),
    trainedModelsProvider.getTrainedModels({}), // Get all models from current space; note we can't
    // use exact model name matching, that returns an
    // error for models that cannot be found
  ]);
  const modelNamesInCurrentSpace = trainedModelsInCurrentSpace.trained_model_configs.map(
    (modelConfig) => modelConfig.model_id
  );

  const modelConfigs: Record<string, InferencePipelineData> = {};
  trainedModels.trained_model_configs.forEach((trainedModelData) => {
    const trainedModelName = trainedModelData.model_id;

    if (trainedModelNames.includes(trainedModelName)) {
      modelConfigs[trainedModelName] = {
        modelId: modelNamesInCurrentSpace.includes(trainedModelName) ? trainedModelName : undefined,
        modelState: TrainedModelState.NotDeployed,
        pipelineName: '',
        pipelineReferences: [],
        trainedModelName,
        types: getMlModelTypesForModelConfig(trainedModelData),
        sourceFields: [],
      };
    }
  });

  trainedModelsStats.trained_model_stats.forEach((trainedModelStats) => {
    const trainedModelName = trainedModelStats.model_id;
    if (Object.hasOwn(modelConfigs, trainedModelName)) {
      modelConfigs[trainedModelName].modelState = parseModelStateFromStats(
        trainedModelStats,
        modelConfigs[trainedModelName].types
      );
      modelConfigs[trainedModelName].modelStateReason =
        parseModelStateReasonFromStats(trainedModelStats);
    }
  });

  return modelConfigs;
};

export const fetchAndAddTrainedModelData = async (
  client: ElasticsearchClient,
  trainedModelsProvider: MlTrainedModels,
  pipelineProcessorData: InferencePipelineData[]
): Promise<InferencePipelineData[]> => {
  const trainedModelNames = Array.from(
    new Set(pipelineProcessorData.map((pipeline) => pipeline.trainedModelName))
  );
  const modelConfigs = await getMlModelConfigsForModelIds(
    client,
    trainedModelsProvider,
    trainedModelNames
  );

  return pipelineProcessorData.map((data) => {
    const model = modelConfigs[data.trainedModelName];
    if (!model) {
      return data;
    }
    const { modelId, types, modelState, modelStateReason } = model;
    return {
      ...data,
      modelId,
      modelState,
      modelStateReason,
      types,
    };
  });
};

export const fetchMlInferencePipelineProcessors = async (
  client: ElasticsearchClient,
  trainedModelsProvider: MlTrainedModels | undefined,
  indexName: string
): Promise<InferencePipeline[]> => {
  if (!trainedModelsProvider) {
    throw new Error('Machine Learning is not enabled');
  }

  const allMlPipelines = await fetchMlInferencePipelines(client);
  const pipelineProcessorsPipelineCountMap = getProcessorPipelineMap(allMlPipelines);
  const mlInferencePipelineProcessorNames = getMlInferencePipelineProcessorNamesFromPipelines(
    indexName,
    allMlPipelines
  );

  // Elasticsearch's GET pipelines API call will return all of the pipeline data if no ids are
  // provided. If we didn't find pipeline processors, return early to avoid fetching all of
  // the possible pipeline data.
  if (mlInferencePipelineProcessorNames.length === 0) return [] as InferencePipeline[];

  const pipelineProcessorInferenceData = await fetchPipelineProcessorInferenceData(
    client,
    mlInferencePipelineProcessorNames,
    pipelineProcessorsPipelineCountMap
  );

  // Elasticsearch's GET trained models and GET trained model stats API calls will return the
  // data/stats for all of the trained models if no ids are provided. If we didn't find any
  // inference processors, return early to avoid fetching all of the possible trained model data.
  if (pipelineProcessorInferenceData.length === 0) return [] as InferencePipeline[];

  const pipelines = await fetchAndAddTrainedModelData(
    client,
    trainedModelsProvider,
    pipelineProcessorInferenceData
  );

  // Due to restrictions with Kibana spaces we do not want to return the trained model name
  // to the UI. So we remove it from the data structure here.
  return pipelines.map(({ trainedModelName, ...pipeline }) => pipeline);
};
