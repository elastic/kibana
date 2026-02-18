/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IngestProcessorContainer } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { MlTrainedModels } from '@kbn/ml-plugin/server';

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

    const p1Processors = actualPipelines.pipeline1.processors as IngestProcessorContainer[];
    const p2Processors = actualPipelines.pipeline2.processors as IngestProcessorContainer[];
    const p3Processors = actualPipelines.pipeline3.processors as IngestProcessorContainer[];
    const p4Processors = actualPipelines.pipeline4.processors as IngestProcessorContainer[];
    expect(
      p1Processors[1] && 'inference' in p1Processors[1]
        ? p1Processors[1].inference?.model_id
        : undefined
    ).toEqual('model1');
    expect(
      p2Processors[1] && 'inference' in p2Processors[1]
        ? p2Processors[1].inference?.model_id
        : undefined
    ).toEqual('model2');
    expect(
      p3Processors[1] && 'inference' in p3Processors[1]
        ? p3Processors[1].inference?.model_id
        : undefined
    ).toEqual(''); // Redacted model ID
    expect(
      p4Processors[1] && 'inference' in p4Processors[1]
        ? p4Processors[1].inference?.model_id
        : undefined
    ).toEqual('');
    expect(
      p4Processors[2] && 'inference' in p4Processors[2]
        ? p4Processors[2].inference?.model_id
        : undefined
    ).toEqual('model2');
    expect(
      p4Processors[3] && 'inference' in p4Processors[3]
        ? p4Processors[3].inference?.model_id
        : undefined
    ).toEqual('');
    expect(mockClient.ingest.getPipeline).toHaveBeenCalledWith({ id: 'ml-inference-*' });
    expect(mockTrainedModelsProvider.getTrainedModels).toHaveBeenCalledWith({});
  });
});
