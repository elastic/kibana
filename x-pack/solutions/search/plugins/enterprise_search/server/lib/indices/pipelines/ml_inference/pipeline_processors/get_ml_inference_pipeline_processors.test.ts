/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { ElasticsearchClient } from '@kbn/core/server';
import { MlTrainedModels } from '@kbn/ml-plugin/server';

import { InferencePipeline, TrainedModelState } from '../../../../../../common/types/pipelines';

import {
  fetchAndAddTrainedModelData,
  getMlModelConfigsForModelIds,
  getMlInferencePipelineProcessorNamesFromPipelines,
  fetchMlInferencePipelines,
  fetchMlInferencePipelineProcessors,
  fetchPipelineProcessorInferenceData,
  InferencePipelineData,
} from './get_ml_inference_pipeline_processors';

const mockGetPipeline = {
  'my-index@ml-inference': {
    id: 'my-index@ml-inference',
    processors: [
      {
        pipeline: {
          name: 'ml-inference-pipeline-1',
        },
      },
    ],
  },
};

const mockGetPipeline2 = {
  'ml-inference-pipeline-1': {
    id: 'ml-inference-pipeline-1',
    processors: [
      {
        set: {
          description: 'just a set processor for fun',
          field: 'bar-field',
          value: 'bar',
        },
      },
      {
        inference: {
          inference_config: { regression: {} },
          field_map: {
            title: 'text_field',
          },
          model_id: 'trained-model-id-1',
        },
      },
    ],
  },
  'ml-inference-pipeline-2': {
    id: 'ml-inference-pipeline-2',
    processors: [
      {
        inference: {
          inference_config: { regression: {} },
          field_map: {
            title: 'text_field',
          },
          model_id: 'trained-model-id-2',
        },
      },
      {
        inference: {
          inference_config: { regression: {} },
          field_map: {
            body: 'text_field',
          },
          model_id: 'trained-model-id-2',
        },
      },
    ],
  },
  'non-ml-inference-pipeline': {
    id: 'non-ml-inference-pipeline',
    processors: [
      {
        pipeline: {
          name: 'different-pipeline',
        },
      },
    ],
  },
};

const mockMultiPipeline = {
  'my-index@ml-inference': {
    id: 'my-index@ml-inference',
    processors: [
      {
        pipeline: {
          name: 'ml-inference-pipeline-1',
        },
      },
      {
        pipeline: {
          name: 'ml-inference-pipeline-3',
        },
      },
    ],
  },
};

const mockGetPipeline3 = {
  'ml-inference-pipeline-1': {
    id: 'ml-inference-pipeline-1',
    processors: [
      {
        set: {
          description: 'just a set processor for fun',
          field: 'bar-field',
          value: 'bar',
        },
      },
      {
        inference: {
          inference_config: { regression: {} },
          model_id: 'trained-model-id-1',
        },
      },
    ],
  },
  'ml-inference-pipeline-2': {
    id: 'ml-inference-pipeline-2',
    processors: [
      {
        inference: {
          inference_config: { regression: {} },
          model_id: 'trained-model-id-2',
        },
      },
    ],
  },
  'non-ml-inference-pipeline': {
    id: 'non-ml-inference-pipeline',
    processors: [
      {
        pipeline: {
          name: 'different-pipeline',
        },
      },
    ],
  },
  'ml-inference-pipeline-3': {
    id: 'ml-inference-pipeline-3',
    processors: [
      {
        set: {
          description: 'just a set processor for fun',
          field: 'foo-field',
          value: 'foo',
        },
      },
      {
        inference: {
          inference_config: { regression: {} },
          model_id: 'trained-model-id-1',
        },
      },
    ],
  },
};

const mockGetTrainedModelsData = {
  count: 5,
  trained_model_configs: [
    {
      inference_config: { ner: {} },
      model_id: 'trained-model-id-1',
      model_type: 'pytorch',
      tags: [],
    },
    {
      inference_config: { ner: {} },
      model_id: 'trained-model-id-2',
      model_type: 'pytorch',
      tags: [],
    },
    {
      inference_config: { text_classification: {} },
      model_id: 'trained-model-id-3',
      model_type: 'pytorch',
      tags: [],
    },
    {
      inference_config: { ner: {} },
      model_id: 'trained-model-id-3-in-other-space', // Not in current Kibana space, will be filtered
      model_type: 'pytorch',
      tags: [],
    },
    {
      inference_config: { fill_mask: {} },
      model_id: 'trained-model-id-4',
      model_type: 'pytorch',
      tags: [],
    },
  ],
};

const mockGetTrainedModelStats = {
  count: 4,
  trained_model_stats: [
    {
      model_id: 'trained-model-id-1',
    },
    {
      deployment_stats: {
        allocation_status: {
          allocation_count: 1,
        },
        state: 'started',
      },
      model_id: 'trained-model-id-2',
    },
    {
      deployment_stats: {
        allocation_status: {
          allocation_count: 1,
        },
        state: 'failed',
        reason: 'something is wrong, boom',
      },
      model_id: 'trained-model-id-3',
    },
    {
      deployment_stats: {
        allocation_status: {
          allocation_count: 1,
        },
        state: 'started',
      },
      model_id: 'trained-model-id-3-in-other-space',
    },
    {
      deployment_stats: {
        allocation_status: {
          allocation_count: 1,
        },
        state: 'starting',
      },
      model_id: 'trained-model-id-4',
    },
  ],
};

const mockTrainedModelsInCurrentSpace = {
  ...mockGetTrainedModelsData,
  trained_model_configs: [
    ...mockGetTrainedModelsData.trained_model_configs.slice(0, 3), // Remove 4th element
    mockGetTrainedModelsData.trained_model_configs[4],
  ],
};

const trainedModelDataObject: Record<string, InferencePipeline> = {
  'trained-model-id-1': {
    modelId: 'trained-model-id-1',
    modelState: TrainedModelState.NotDeployed,
    pipelineName: 'ml-inference-pipeline-1',
    pipelineReferences: ['my-index@ml-inference'],
    types: ['pytorch', 'ner'],
    sourceFields: [],
  },
  'trained-model-id-2': {
    modelId: 'trained-model-id-2',
    modelState: TrainedModelState.Started,
    pipelineName: 'ml-inference-pipeline-2',
    pipelineReferences: ['my-index@ml-inference'],
    types: ['pytorch', 'ner'],
    sourceFields: [],
  },
  'ml-inference-pipeline-3': {
    modelId: 'trained-model-id-1',
    modelState: TrainedModelState.NotDeployed,
    pipelineName: 'ml-inference-pipeline-3',
    pipelineReferences: ['my-index@ml-inference'],
    types: ['pytorch', 'ner'],
    sourceFields: [],
  },
};

const notFoundResponse = { meta: { statusCode: 404 } };
const notFoundError = new errors.ResponseError({
  body: notFoundResponse,
  statusCode: 404,
  headers: {},
  meta: {} as any,
  warnings: [],
});

describe('fetchMlInferencePipelines lib function', () => {
  const mockClient = {
    ingest: {
      getPipeline: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return @ml-inference pipelines', async () => {
    mockClient.ingest.getPipeline.mockImplementation(() => Promise.resolve(mockGetPipeline));

    const response = await fetchMlInferencePipelines(mockClient as unknown as ElasticsearchClient);

    expect(mockClient.ingest.getPipeline).toHaveBeenCalledWith({ id: '*@ml-inference' });
    expect(response).toEqual(mockGetPipeline);
  });

  it('should return an empty object when no @ml-inference pipelines found', async () => {
    mockClient.ingest.getPipeline.mockImplementation(() => Promise.resolve({}));

    const response = await fetchMlInferencePipelines(mockClient as unknown as ElasticsearchClient);

    expect(response).toEqual({});
  });

  it('should return an empty object when getPipeline throws an error', async () => {
    mockClient.ingest.getPipeline.mockImplementation(() => Promise.reject(notFoundError));

    const response = await fetchMlInferencePipelines(mockClient as unknown as ElasticsearchClient);

    expect(response).toEqual({});
  });
});

describe('getMlInferencePipelineProcessorNamesFromPipelines', () => {
  it('should return pipeline processor names for the @ml-inference pipeline', () => {
    const expected = ['ml-inference-pipeline-1'];
    const processorNames = getMlInferencePipelineProcessorNamesFromPipelines(
      'my-index',
      mockGetPipeline
    );
    expect(processorNames).toEqual(expected);
  });
  it('should return an empty array for a missing @ml-inference pipeline', () => {
    const processorNames = getMlInferencePipelineProcessorNamesFromPipelines(
      'my-index-without-ml-inference-pipeline',
      mockGetPipeline
    );

    expect(processorNames).toEqual([]);
  });
  it('should return an empty array for a pipeline missing processors', () => {
    const processorNames = getMlInferencePipelineProcessorNamesFromPipelines(
      'my-index-without-ml-inference-pipeline',
      {
        'my-index-without-ml-inference-pipeline': {},
      }
    );

    expect(processorNames).toEqual([]);
  });
});

describe('fetchPipelineProcessorInferenceData lib function', () => {
  const mockClient = {
    ingest: {
      getPipeline: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return the inference processor data for the pipelines', async () => {
    mockClient.ingest.getPipeline.mockImplementation(() => Promise.resolve(mockGetPipeline2));

    const expected: InferencePipelineData[] = [
      {
        modelId: 'trained-model-id-1',
        modelState: TrainedModelState.NotDeployed,
        pipelineName: 'ml-inference-pipeline-1',
        pipelineReferences: ['my-index@ml-inference', 'other-index@ml-inference'],
        trainedModelName: 'trained-model-id-1',
        types: [],
        sourceFields: ['title'],
      },
      {
        modelId: 'trained-model-id-2',
        modelState: TrainedModelState.NotDeployed,
        pipelineName: 'ml-inference-pipeline-2',
        pipelineReferences: ['my-index@ml-inference'],
        trainedModelName: 'trained-model-id-2',
        types: [],
        sourceFields: ['title', 'body'],
      },
    ];

    const response = await fetchPipelineProcessorInferenceData(
      mockClient as unknown as ElasticsearchClient,
      ['ml-inference-pipeline-1', 'ml-inference-pipeline-2', 'non-ml-inference-pipeline'],
      {
        'ml-inference-pipeline-1': ['my-index@ml-inference', 'other-index@ml-inference'],
        'ml-inference-pipeline-2': ['my-index@ml-inference'],
      }
    );

    expect(mockClient.ingest.getPipeline).toHaveBeenCalledWith({
      id: 'ml-inference-pipeline-1,ml-inference-pipeline-2,non-ml-inference-pipeline',
    });
    expect(response).toEqual(expected);
  });

  it('should return an empty array for a pipeline without an inference processor', async () => {
    mockClient.ingest.getPipeline.mockImplementation(() =>
      Promise.resolve({
        'ml-inference-pipeline-1': {
          id: 'ml-inference-pipeline-1',
          processors: [
            {
              set: {
                field: 'foo-field',
                value: 'foo',
              },
            },
          ],
        },
      })
    );

    const response = await fetchPipelineProcessorInferenceData(
      mockClient as unknown as ElasticsearchClient,
      ['ml-inference-pipeline-1', 'ml-inference-pipeline-2', 'non-ml-inference-pipeline'],
      {
        'ml-inference-pipeline-1': ['my-index@ml-inference', 'other-index@ml-inference'],
        'ml-inference-pipeline-2': ['my-index@ml-inference'],
      }
    );

    expect(response).toEqual([]);
  });

  it('should handle inference processors with no field mapping', async () => {
    mockClient.ingest.getPipeline.mockImplementation(() =>
      Promise.resolve({
        'ml-inference-pipeline-1': {
          id: 'ml-inference-pipeline-1',
          processors: [
            {
              inference: {
                inference_config: { regression: {} },
                model_id: 'trained-model-id-1',
              },
            },
          ],
        },
      })
    );

    const response = await fetchPipelineProcessorInferenceData(
      mockClient as unknown as ElasticsearchClient,
      ['ml-inference-pipeline-1'],
      {
        'ml-inference-pipeline-1': ['my-index@ml-inference'],
      }
    );

    expect(response).toHaveLength(1);
    expect(response[0].sourceFields).toEqual([]);
  });
});

describe('getMlModelConfigsForModelIds lib function', () => {
  const mockClient = {
    ml: {
      getTrainedModels: jest.fn(),
      getTrainedModelsStats: jest.fn(),
    },
  };
  const mockTrainedModelsProvider = {
    getTrainedModels: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  mockClient.ml.getTrainedModels.mockImplementation(() =>
    Promise.resolve(mockGetTrainedModelsData)
  );
  mockClient.ml.getTrainedModelsStats.mockImplementation(() =>
    Promise.resolve(mockGetTrainedModelStats)
  );
  mockTrainedModelsProvider.getTrainedModels.mockImplementation(() =>
    Promise.resolve(mockTrainedModelsInCurrentSpace)
  );

  it('should fetch the models that we ask for', async () => {
    const input: Record<string, InferencePipelineData> = {
      'trained-model-id-1': {
        modelId: 'trained-model-id-1',
        modelState: TrainedModelState.Started,
        pipelineName: '',
        pipelineReferences: [],
        trainedModelName: 'trained-model-id-1',
        types: ['pytorch', 'ner'],
        sourceFields: [],
      },
      'trained-model-id-2': {
        modelId: 'trained-model-id-2',
        modelState: TrainedModelState.Started,
        pipelineName: '',
        pipelineReferences: [],
        trainedModelName: 'trained-model-id-2',
        types: ['pytorch', 'ner'],
        sourceFields: [],
      },
    };

    const expected = {
      'trained-model-id-2': input['trained-model-id-2'],
    };
    const response = await getMlModelConfigsForModelIds(
      mockClient as unknown as ElasticsearchClient,
      mockTrainedModelsProvider as unknown as MlTrainedModels,
      ['trained-model-id-2']
    );
    expect(mockClient.ml.getTrainedModels).toHaveBeenCalledWith({
      model_id: 'trained-model-id-2',
    });
    expect(mockClient.ml.getTrainedModelsStats).toHaveBeenCalledWith({
      model_id: 'trained-model-id-2',
    });
    expect(mockTrainedModelsProvider.getTrainedModels).toHaveBeenCalled();
    expect(response).toEqual(expected);
  });

  it('should redact model IDs not in the current space', async () => {
    const input: Record<string, InferencePipelineData> = {
      'trained-model-id-1': {
        modelId: 'trained-model-id-1',
        modelState: TrainedModelState.Started,
        pipelineName: '',
        pipelineReferences: [],
        trainedModelName: 'trained-model-id-1',
        types: ['pytorch', 'ner'],
        sourceFields: [],
      },
      'trained-model-id-2': {
        modelId: 'trained-model-id-2',
        modelState: TrainedModelState.Started,
        pipelineName: '',
        pipelineReferences: [],
        trainedModelName: 'trained-model-id-2',
        types: ['pytorch', 'ner'],
        sourceFields: [],
      },
      'trained-model-id-3-in-other-space': {
        modelId: undefined, // Redacted
        modelState: TrainedModelState.Started,
        pipelineName: '',
        pipelineReferences: [],
        trainedModelName: 'trained-model-id-3-in-other-space',
        types: ['pytorch', 'ner'],
        sourceFields: [],
      },
    };

    const expected = {
      'trained-model-id-2': input['trained-model-id-2'],
      'trained-model-id-3-in-other-space': input['trained-model-id-3-in-other-space'],
    };
    const response = await getMlModelConfigsForModelIds(
      mockClient as unknown as ElasticsearchClient,
      mockTrainedModelsProvider as unknown as MlTrainedModels,
      ['trained-model-id-2', 'trained-model-id-3-in-other-space']
    );
    expect(mockClient.ml.getTrainedModels).toHaveBeenCalledWith({
      model_id: 'trained-model-id-2,trained-model-id-3-in-other-space',
    });
    expect(mockClient.ml.getTrainedModelsStats).toHaveBeenCalledWith({
      model_id: 'trained-model-id-2,trained-model-id-3-in-other-space',
    });
    expect(mockTrainedModelsProvider.getTrainedModels).toHaveBeenCalled();
    expect(response).toEqual(expected);
  });
});

describe('fetchAndAddTrainedModelData lib function', () => {
  const mockClient = {
    ml: {
      getTrainedModels: jest.fn(),
      getTrainedModelsStats: jest.fn(),
    },
  };
  const mockTrainedModelsProvider = {
    getTrainedModels: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should update the pipeline processor data with model type of deployment status info', async () => {
    mockClient.ml.getTrainedModels.mockImplementation(() =>
      Promise.resolve(mockGetTrainedModelsData)
    );
    mockClient.ml.getTrainedModelsStats.mockImplementation(() =>
      Promise.resolve(mockGetTrainedModelStats)
    );
    mockTrainedModelsProvider.getTrainedModels.mockImplementation(() =>
      Promise.resolve(mockTrainedModelsInCurrentSpace)
    );

    const pipelines: InferencePipelineData[] = [
      {
        modelId: 'trained-model-id-1',
        modelState: TrainedModelState.NotDeployed,
        pipelineName: 'ml-inference-pipeline-1',
        pipelineReferences: [],
        trainedModelName: 'trained-model-id-1',
        types: [],
        sourceFields: [],
      },
      {
        modelId: 'trained-model-id-2',
        modelState: TrainedModelState.NotDeployed,
        pipelineName: 'ml-inference-pipeline-2',
        pipelineReferences: [],
        trainedModelName: 'trained-model-id-2',
        types: [],
        sourceFields: [],
      },
      {
        modelId: 'trained-model-id-3',
        modelState: TrainedModelState.NotDeployed,
        pipelineName: 'ml-inference-pipeline-3',
        pipelineReferences: [],
        trainedModelName: 'trained-model-id-3',
        types: [],
        sourceFields: [],
      },
      {
        modelId: 'trained-model-id-4',
        modelState: TrainedModelState.NotDeployed,
        pipelineName: 'ml-inference-pipeline-4',
        pipelineReferences: [],
        trainedModelName: 'trained-model-id-4',
        types: [],
        sourceFields: [],
      },
    ];

    const expected: InferencePipelineData[] = [
      {
        modelId: 'trained-model-id-1',
        modelState: TrainedModelState.NotDeployed,
        pipelineName: 'ml-inference-pipeline-1',
        pipelineReferences: [],
        trainedModelName: 'trained-model-id-1',
        types: ['pytorch', 'ner'],
        sourceFields: [],
      },
      {
        modelId: 'trained-model-id-2',
        modelState: TrainedModelState.Started,
        pipelineName: 'ml-inference-pipeline-2',
        pipelineReferences: [],
        trainedModelName: 'trained-model-id-2',
        types: ['pytorch', 'ner'],
        sourceFields: [],
      },
      {
        modelId: 'trained-model-id-3',
        modelState: TrainedModelState.Failed,
        modelStateReason: 'something is wrong, boom',
        pipelineName: 'ml-inference-pipeline-3',
        pipelineReferences: [],
        trainedModelName: 'trained-model-id-3',
        types: ['pytorch', 'text_classification'],
        sourceFields: [],
      },
      {
        modelId: 'trained-model-id-4',
        modelState: TrainedModelState.Starting,
        pipelineName: 'ml-inference-pipeline-4',
        pipelineReferences: [],
        trainedModelName: 'trained-model-id-4',
        types: ['pytorch', 'fill_mask'],
        sourceFields: [],
      },
    ];

    const response = await fetchAndAddTrainedModelData(
      mockClient as unknown as ElasticsearchClient,
      mockTrainedModelsProvider as unknown as MlTrainedModels,
      pipelines
    );

    expect(mockClient.ml.getTrainedModels).toHaveBeenCalledWith({
      model_id: 'trained-model-id-1,trained-model-id-2,trained-model-id-3,trained-model-id-4',
    });
    expect(mockClient.ml.getTrainedModelsStats).toHaveBeenCalledWith({
      model_id: 'trained-model-id-1,trained-model-id-2,trained-model-id-3,trained-model-id-4',
    });
    expect(mockTrainedModelsProvider.getTrainedModels).toHaveBeenCalled();
    expect(response).toEqual(expected);
  });
});

describe('fetchMlInferencePipelineProcessors lib function', () => {
  const mockClient = {
    ingest: {
      getPipeline: jest.fn(),
    },
    ml: {
      getTrainedModels: jest.fn(),
      getTrainedModelsStats: jest.fn(),
    },
  };
  const mockTrainedModelsProvider = {
    getTrainedModels: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when Machine Learning is disabled in the current space', () => {
    it('should throw an error', async () => {
      await expect(() =>
        fetchMlInferencePipelineProcessors(
          mockClient as unknown as ElasticsearchClient,
          undefined,
          'some-index'
        )
      ).rejects.toThrowError('Machine Learning is not enabled');
    });
  });

  describe('when using an index that does not have an ml-inference pipeline', () => {
    it('should return an empty array', async () => {
      mockClient.ingest.getPipeline.mockImplementation(() => Promise.reject({}));

      const response = await fetchMlInferencePipelineProcessors(
        mockClient as unknown as ElasticsearchClient,
        mockTrainedModelsProvider as unknown as MlTrainedModels,
        'index-with-no-ml-inference-pipeline'
      );

      expect(mockClient.ingest.getPipeline).toHaveBeenCalledWith({
        id: '*@ml-inference',
      });
      expect(mockClient.ingest.getPipeline).toHaveBeenCalledTimes(1);
      expect(mockClient.ml.getTrainedModels).toHaveBeenCalledTimes(0);
      expect(mockClient.ml.getTrainedModelsStats).toHaveBeenCalledTimes(0);
      expect(mockTrainedModelsProvider.getTrainedModels).toHaveBeenCalledTimes(0);

      expect(response).toEqual([]);
    });
  });

  describe('when using an index that has an ml-inference pipeline but not inference processors', () => {
    it('should return an empty array', async () => {
      mockClient.ingest.getPipeline.mockImplementationOnce(() => Promise.resolve(mockGetPipeline));
      mockClient.ingest.getPipeline.mockImplementationOnce(() =>
        Promise.resolve({
          'non-ml-inference-pipeline': mockGetPipeline2['non-ml-inference-pipeline'],
        })
      );

      const response = await fetchMlInferencePipelineProcessors(
        mockClient as unknown as ElasticsearchClient,
        mockTrainedModelsProvider as unknown as MlTrainedModels,
        'my-index'
      );

      expect(mockClient.ingest.getPipeline).toHaveBeenCalledWith({
        id: '*@ml-inference',
      });
      expect(mockClient.ingest.getPipeline).toHaveBeenCalledWith({
        id: 'ml-inference-pipeline-1',
      });
      expect(mockClient.ml.getTrainedModels).toHaveBeenCalledTimes(0);
      expect(mockClient.ml.getTrainedModelsStats).toHaveBeenCalledTimes(0);

      expect(response).toEqual([]);
    });
  });

  describe('when using an index that has an ml-inference pipeline', () => {
    it('should return pipeline processor data for that pipeline', async () => {
      mockClient.ingest.getPipeline.mockImplementationOnce(() => Promise.resolve(mockGetPipeline));
      mockClient.ingest.getPipeline.mockImplementationOnce(() =>
        Promise.resolve({ 'ml-inference-pipeline-1': mockGetPipeline2['ml-inference-pipeline-1'] })
      );
      mockClient.ml.getTrainedModels.mockImplementation(() =>
        Promise.resolve(mockGetTrainedModelsData)
      );
      mockClient.ml.getTrainedModelsStats.mockImplementation(() =>
        Promise.resolve(mockGetTrainedModelStats)
      );
      mockTrainedModelsProvider.getTrainedModels.mockImplementation(() =>
        Promise.resolve(mockTrainedModelsInCurrentSpace)
      );

      const expected = [
        {
          ...trainedModelDataObject['trained-model-id-1'],
          sourceFields: ['title'],
        },
      ] as InferencePipeline[];

      const response = await fetchMlInferencePipelineProcessors(
        mockClient as unknown as ElasticsearchClient,
        mockTrainedModelsProvider as unknown as MlTrainedModels,
        'my-index'
      );

      expect(mockClient.ingest.getPipeline).toHaveBeenCalledWith({
        id: '*@ml-inference',
      });
      expect(mockClient.ingest.getPipeline).toHaveBeenCalledWith({
        id: 'ml-inference-pipeline-1',
      });
      expect(mockClient.ml.getTrainedModels).toHaveBeenCalledWith({
        model_id: 'trained-model-id-1',
      });
      expect(mockClient.ml.getTrainedModelsStats).toHaveBeenCalledWith({
        model_id: 'trained-model-id-1',
      });
      expect(mockTrainedModelsProvider.getTrainedModels).toHaveBeenCalled();

      expect(response).toEqual(expected);
    });
    it('should return pipeline processors that use same model data for that pipeline', async () => {
      mockClient.ingest.getPipeline.mockImplementationOnce(() =>
        Promise.resolve(mockMultiPipeline)
      );
      mockClient.ingest.getPipeline.mockImplementationOnce(() =>
        Promise.resolve({
          'ml-inference-pipeline-1': mockGetPipeline3['ml-inference-pipeline-1'],
          'ml-inference-pipeline-3': mockGetPipeline3['ml-inference-pipeline-3'],
        })
      );
      mockClient.ml.getTrainedModels.mockImplementation(() =>
        Promise.resolve(mockGetTrainedModelsData)
      );
      mockClient.ml.getTrainedModelsStats.mockImplementation(() =>
        Promise.resolve(mockGetTrainedModelStats)
      );

      const expected: InferencePipeline[] = [
        trainedModelDataObject['trained-model-id-1'],
        trainedModelDataObject['ml-inference-pipeline-3'],
      ];

      const response = await fetchMlInferencePipelineProcessors(
        mockClient as unknown as ElasticsearchClient,
        mockTrainedModelsProvider as unknown as MlTrainedModels,
        'my-index'
      );

      expect(mockClient.ingest.getPipeline).toHaveBeenCalledWith({
        id: '*@ml-inference',
      });
      expect(mockClient.ingest.getPipeline).toHaveBeenCalledWith({
        id: 'ml-inference-pipeline-1,ml-inference-pipeline-3',
      });
      expect(mockClient.ml.getTrainedModels).toHaveBeenCalledWith({
        model_id: 'trained-model-id-1',
      });
      expect(mockClient.ml.getTrainedModelsStats).toHaveBeenCalledWith({
        model_id: 'trained-model-id-1',
      });
      expect(mockTrainedModelsProvider.getTrainedModels).toHaveBeenCalled();

      expect(response).toEqual(expected);
    });
  });
});
