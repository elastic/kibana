/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IngestProcessorContainer } from '@elastic/elasticsearch/lib/api/types';
import { ElasticsearchClient } from '@kbn/core/server';
import { MlTrainedModels } from '@kbn/ml-plugin/server';

import { getMlInferencePipelines } from './get_ml_inference_pipelines';

describe('getMlInferencePipelines', () => {
  const mockClient = {
    ingest: {
      getPipeline: jest.fn(),
    },
  };
  const mockTrainedModelsProvider = {
    getTrainedModels: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should throw an error if Machine Learning is disabled in the current space', async () => {
    await expect(() =>
      getMlInferencePipelines(mockClient as unknown as ElasticsearchClient, undefined)
    ).rejects.toThrowError('Machine Learning is not enabled');
  });

  it('should fetch inference pipelines and redact inaccessible model IDs', async () => {
    function mockInferencePipeline(modelId: string) {
      return {
        processors: [
          {
            append: {},
          },
          {
            inference: {
              model_id: modelId,
            },
          },
          {
            remove: {},
          },
        ],
      };
    }

    const mockPipelines = {
      pipeline1: mockInferencePipeline('model1'),
      pipeline2: mockInferencePipeline('model2'),
      pipeline3: mockInferencePipeline('redactedModel3'),
      pipeline4: {
        // Pipeline with multiple inference processors referencing an inaccessible model
        processors: [
          {
            append: {},
          },
          {
            inference: {
              model_id: 'redactedModel3',
            },
          },
          {
            inference: {
              model_id: 'model2',
            },
          },
          {
            inference: {
              model_id: 'redactedModel4',
            },
          },
          {
            remove: {},
          },
        ],
      },
    };

    const mockTrainedModels = {
      trained_model_configs: [
        {
          model_id: 'model1',
        },
        {
          model_id: 'model2',
        },
      ],
    };

    mockClient.ingest.getPipeline.mockImplementation(() => Promise.resolve(mockPipelines));
    mockTrainedModelsProvider.getTrainedModels.mockImplementation(() =>
      Promise.resolve(mockTrainedModels)
    );

    const actualPipelines = await getMlInferencePipelines(
      mockClient as unknown as ElasticsearchClient,
      mockTrainedModelsProvider as unknown as MlTrainedModels
    );

    expect(
      (actualPipelines.pipeline1.processors as IngestProcessorContainer[])[1].inference?.model_id
    ).toEqual('model1');
    expect(
      (actualPipelines.pipeline2.processors as IngestProcessorContainer[])[1].inference?.model_id
    ).toEqual('model2');
    expect(
      (actualPipelines.pipeline3.processors as IngestProcessorContainer[])[1].inference?.model_id
    ).toEqual(''); // Redacted model ID
    expect(
      (actualPipelines.pipeline4.processors as IngestProcessorContainer[])[1].inference?.model_id
    ).toEqual('');
    expect(
      (actualPipelines.pipeline4.processors as IngestProcessorContainer[])[2].inference?.model_id
    ).toEqual('model2');
    expect(
      (actualPipelines.pipeline4.processors as IngestProcessorContainer[])[3].inference?.model_id
    ).toEqual('');
    expect(mockClient.ingest.getPipeline).toHaveBeenCalledWith({ id: 'ml-inference-*' });
    expect(mockTrainedModelsProvider.getTrainedModels).toHaveBeenCalledWith({});
  });
});
