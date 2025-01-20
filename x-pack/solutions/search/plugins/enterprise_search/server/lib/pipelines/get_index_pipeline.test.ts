/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { IScopedClusterClient } from '@kbn/core/server';

import { DEFAULT_PIPELINE_VALUES } from '../../../common/constants';

import { getIndexPipelineParameters } from './get_index_pipeline';

describe('getIndexPipelineParameters', () => {
  const defaultMockClient = () => ({
    asCurrentUser: {
      indices: {
        getMapping: jest.fn().mockResolvedValue({}),
      },
      ingest: {
        getPipeline: jest.fn().mockRejectedValue('Pipeline not found'),
      },
      transport: {
        request: jest.fn().mockResolvedValue({}),
      },
    },
  });
  let mockClient = defaultMockClient();
  let client: IScopedClusterClient;
  beforeEach(() => {
    jest.resetAllMocks();

    mockClient = defaultMockClient();
    client = mockClient as unknown as IScopedClusterClient;
  });
  it('returns default pipeline if custom not found', async () => {
    await expect(getIndexPipelineParameters('my-index', client)).resolves.toEqual(
      DEFAULT_PIPELINE_VALUES
    );
  });
  it('returns connector pipeline params if found', async () => {
    mockClient.asCurrentUser.transport.request = jest.fn().mockResolvedValue({
      count: 1,
      results: [
        {
          id: 'unit-test',
          pipeline: {
            extract_binary_content: false,
            name: 'unit-test-pipeline',
            reduce_whitespace: true,
            run_ml_inference: true,
          },
        },
      ],
    });
    await expect(getIndexPipelineParameters('my-index', client)).resolves.toEqual({
      extract_binary_content: false,
      name: 'unit-test-pipeline',
      reduce_whitespace: true,
      run_ml_inference: true,
    });
  });
  it('returns default pipeline if fetch custom throws', async () => {
    mockClient.asCurrentUser.ingest.getPipeline = jest.fn().mockRejectedValue('Boom');

    await expect(getIndexPipelineParameters('my-index', client)).resolves.toEqual(
      DEFAULT_PIPELINE_VALUES
    );
  });
  it('returns custom pipeline if found', async () => {
    mockClient.asCurrentUser.ingest.getPipeline = jest.fn().mockResolvedValueOnce({
      'my-index': {
        fake: 'ingest-pipeline',
      },
    });

    await expect(getIndexPipelineParameters('my-index', client)).resolves.toEqual({
      extract_binary_content: true,
      name: 'my-index',
      reduce_whitespace: true,
      run_ml_inference: true,
    });
  });
  it('returns default connector index pipeline if found in mapping', async () => {
    mockClient.asCurrentUser.indices.getMapping = jest.fn().mockResolvedValueOnce({
      '.elastic-connectors-v1': {
        mappings: {
          _meta: {
            pipeline: {
              default_extract_binary_content: false,
              default_name: 'my-unit-test-index',
              default_reduce_whitespace: false,
              default_run_ml_inference: true,
            },
          },
        },
      },
    });

    await expect(getIndexPipelineParameters('my-index', client)).resolves.toEqual({
      extract_binary_content: false,
      name: 'my-unit-test-index',
      reduce_whitespace: false,
      run_ml_inference: true,
    });
  });
  it('returns connector params with custom pipeline name', async () => {
    mockClient.asCurrentUser.indices.getMapping = jest.fn().mockResolvedValueOnce({
      '.elastic-connectors-v1': {
        mappings: {
          _meta: {
            pipeline: {
              default_extract_binary_content: false,
              default_name: 'my-unit-test-index',
              default_reduce_whitespace: false,
              default_run_ml_inference: true,
            },
          },
        },
      },
    });
    mockClient.asCurrentUser.ingest.getPipeline = jest.fn().mockResolvedValueOnce({
      'my-index': {
        fake: 'ingest-pipeline',
      },
    });

    await expect(getIndexPipelineParameters('my-index', client)).resolves.toEqual({
      extract_binary_content: false,
      name: 'my-index',
      reduce_whitespace: false,
      run_ml_inference: true,
    });
  });
  it('returns defaults if get mapping fails with IndexNotFoundException', async () => {
    mockClient.asCurrentUser.indices.getMapping = jest.fn().mockRejectedValue({
      meta: {
        body: {
          error: {
            type: 'index_not_found_exception',
          },
        },
      },
    });

    await expect(getIndexPipelineParameters('my-index', client)).resolves.toEqual(
      DEFAULT_PIPELINE_VALUES
    );
  });
  it('throws if get mapping fails with non-IndexNotFoundException', async () => {
    mockClient.asCurrentUser.indices.getMapping = jest.fn().mockRejectedValue('Boom');

    await expect(getIndexPipelineParameters('my-index', client)).rejects.toEqual('Boom');
  });
});
