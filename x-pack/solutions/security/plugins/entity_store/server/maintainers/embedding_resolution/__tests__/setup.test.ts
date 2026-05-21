/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { ElasticsearchClient } from '@kbn/core/server';
import { verifyInferenceEndpoint } from '../setup';

const INFERENCE_ID = '.jina-embeddings-v5-text-small';
const EXPECTED_DIMS = 1024;

const make404 = (): Error & { statusCode: number } => {
  const err = new Error('inference endpoint not found') as Error & { statusCode: number };
  err.statusCode = 404;
  return err;
};

describe('verifyInferenceEndpoint', () => {
  let esClient: jest.Mocked<ElasticsearchClient>;
  let logger: ReturnType<typeof loggerMock.create>;

  beforeEach(() => {
    jest.clearAllMocks();
    logger = loggerMock.create();
    esClient = {
      inference: { get: jest.fn() },
    } as unknown as jest.Mocked<ElasticsearchClient>;
  });

  it('returns ready=true with the endpoint dims when the endpoint exists with matching dimensions', async () => {
    (esClient.inference.get as jest.Mock).mockResolvedValueOnce({
      endpoints: [
        {
          inference_id: INFERENCE_ID,
          task_type: 'text_embedding',
          service: 'elastic',
          service_settings: { model_id: 'jina-embeddings-v5-text-small', dimensions: 1024 },
        },
      ],
    });

    const result = await verifyInferenceEndpoint({
      esClient,
      inferenceId: INFERENCE_ID,
      expectedDims: EXPECTED_DIMS,
      logger,
    });

    expect(result).toEqual({ ready: true, dims: 1024 });
    expect(esClient.inference.get).toHaveBeenCalledWith({ inference_id: INFERENCE_ID });
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('returns ready=true but warns when the endpoint dims differ from the expected dims', async () => {
    (esClient.inference.get as jest.Mock).mockResolvedValueOnce({
      endpoints: [
        {
          inference_id: INFERENCE_ID,
          task_type: 'text_embedding',
          service: 'elastic',
          service_settings: { dimensions: 384 },
        },
      ],
    });

    const result = await verifyInferenceEndpoint({
      esClient,
      inferenceId: INFERENCE_ID,
      expectedDims: EXPECTED_DIMS,
      logger,
    });

    expect(result).toEqual({ ready: true, dims: 384 });
    expect(logger.warn).toHaveBeenCalledTimes(1);
    const warnMsg = (logger.warn as jest.Mock).mock.calls[0][0] as string;
    expect(warnMsg).toContain('384');
    expect(warnMsg).toContain('1024');
  });

  it('returns ready=false and logs a customer-facing warn when the endpoint is missing (404)', async () => {
    (esClient.inference.get as jest.Mock).mockRejectedValueOnce(make404());

    const result = await verifyInferenceEndpoint({
      esClient,
      inferenceId: INFERENCE_ID,
      expectedDims: EXPECTED_DIMS,
      logger,
    });

    expect(result).toEqual({ ready: false });
    expect(logger.warn).toHaveBeenCalledTimes(1);
    const warnMsg = (logger.warn as jest.Mock).mock.calls[0][0] as string;
    expect(warnMsg).toContain(INFERENCE_ID);
    expect(warnMsg).toContain('/app/cloud_connect');
    expect(warnMsg).toContain('xpack.securitySolution.entityResolution.embedding.inferenceId');
  });

  it('propagates non-404 errors so auth/network failures are not silently swallowed', async () => {
    const err = new Error('auth failure') as Error & { statusCode: number };
    err.statusCode = 401;
    (esClient.inference.get as jest.Mock).mockRejectedValueOnce(err);

    await expect(
      verifyInferenceEndpoint({
        esClient,
        inferenceId: INFERENCE_ID,
        expectedDims: EXPECTED_DIMS,
        logger,
      })
    ).rejects.toThrow('auth failure');
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('handles a response with no endpoints array by treating it as ready=true with unknown dims', async () => {
    // Older / future ES API shapes may not return the `endpoints` array; we should not crash.
    (esClient.inference.get as jest.Mock).mockResolvedValueOnce({});

    const result = await verifyInferenceEndpoint({
      esClient,
      inferenceId: INFERENCE_ID,
      expectedDims: EXPECTED_DIMS,
      logger,
    });

    expect(result.ready).toBe(true);
    expect(result.dims).toBeUndefined();
    expect(logger.warn).not.toHaveBeenCalled();
  });
});
