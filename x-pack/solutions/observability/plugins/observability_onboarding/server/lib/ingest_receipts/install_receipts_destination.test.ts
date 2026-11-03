/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { TransportResult } from '@elastic/elasticsearch';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { INGEST_RECEIPTS_DATA_STREAM } from '../../../common/ingest_receipts';
import { installReceiptsDestination } from './install_receipts_destination';
import { getReceiptsIndexTemplate } from './receipts_index_template';

const createResponseError = (type: string, statusCode: number): errors.ResponseError => {
  const result: TransportResult<Record<string, unknown>, unknown> = {
    body: { error: { type } },
    statusCode,
    headers: {},
    warnings: null,
    meta: {} as TransportResult['meta'],
  };
  return new errors.ResponseError(result);
};

// p-retry attempts the operation once plus its default of 10 retries.
const DEFAULT_ATTEMPTS = 11;

describe('installReceiptsDestination', () => {
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  const install = async () => {
    const promise = installReceiptsDestination({ esClient, logger });
    await jest.runAllTimersAsync();
    return promise;
  };

  beforeEach(() => {
    jest.useFakeTimers();
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    logger = loggingSystemMock.createLogger();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('puts the index template and then creates the data stream', async () => {
    await install();

    expect(esClient.indices.putIndexTemplate).toHaveBeenCalledTimes(1);
    expect(esClient.indices.putIndexTemplate).toHaveBeenCalledWith(getReceiptsIndexTemplate());
    expect(esClient.indices.createDataStream).toHaveBeenCalledTimes(1);
    expect(esClient.indices.createDataStream).toHaveBeenCalledWith({
      name: INGEST_RECEIPTS_DATA_STREAM,
    });
    expect(esClient.indices.putIndexTemplate.mock.invocationCallOrder[0]).toBeLessThan(
      esClient.indices.createDataStream.mock.invocationCallOrder[0]
    );
    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('treats an existing data stream as success', async () => {
    esClient.indices.createDataStream.mockRejectedValueOnce(
      createResponseError('resource_already_exists_exception', 400)
    );

    await expect(install()).resolves.toBeUndefined();

    expect(esClient.indices.createDataStream).toHaveBeenCalledTimes(1);
    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('retries the whole sequence with a warning per failed attempt', async () => {
    esClient.indices.putIndexTemplate
      .mockRejectedValueOnce(new errors.ConnectionError('es not ready'))
      .mockRejectedValueOnce(new errors.ConnectionError('es not ready'));

    await expect(install()).resolves.toBeUndefined();

    expect(esClient.indices.putIndexTemplate).toHaveBeenCalledTimes(3);
    expect(esClient.indices.createDataStream).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledTimes(2);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('retries a failing data stream creation', async () => {
    esClient.indices.createDataStream.mockRejectedValueOnce(
      createResponseError('cluster_block_exception', 503)
    );

    await expect(install()).resolves.toBeUndefined();

    expect(esClient.indices.createDataStream).toHaveBeenCalledTimes(2);
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('logs one error and resolves after retries are exhausted', async () => {
    esClient.indices.putIndexTemplate.mockRejectedValue(new errors.ConnectionError('es down'));

    await expect(install()).resolves.toBeUndefined();

    expect(esClient.indices.putIndexTemplate).toHaveBeenCalledTimes(DEFAULT_ATTEMPTS);
    expect(esClient.indices.createDataStream).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledTimes(DEFAULT_ATTEMPTS - 1);
    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error.mock.calls[0][0]).toContain(INGEST_RECEIPTS_DATA_STREAM);
  });
});
