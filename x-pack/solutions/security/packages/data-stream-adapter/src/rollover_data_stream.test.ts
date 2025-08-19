/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { rolloverDataStream, shouldRolloverDataStream } from './rollover_data_stream';

const logger = loggingSystemMock.createLogger();
const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

describe('rolloverDataStream', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should successfully rollover a data stream', async () => {
    const dataStreamName = 'test-data-stream';
    esClient.indices.rollover.mockResolvedValueOnce({ acknowledged: true });

    await rolloverDataStream({
      esClient,
      logger,
      dataStreamName,
    });

    expect(esClient.indices.rollover).toHaveBeenCalledWith({
      alias: dataStreamName,
      lazy: true,
    });
    expect(logger.info).toHaveBeenCalledWith(`Rolling over data stream: ${dataStreamName}`);
    expect(logger.info).toHaveBeenCalledWith(`Successfully rolled over data stream: ${dataStreamName}`);
  });

  it('should log warning when rollover is not acknowledged', async () => {
    const dataStreamName = 'test-data-stream';
    esClient.indices.rollover.mockResolvedValueOnce({ acknowledged: false });

    await rolloverDataStream({
      esClient,
      logger,
      dataStreamName,
    });

    expect(logger.warn).toHaveBeenCalledWith(`Rollover for data stream ${dataStreamName} was not acknowledged`);
  });

  it('should throw error when rollover fails', async () => {
    const dataStreamName = 'test-data-stream';
    const error = new Error('Rollover failed');
    esClient.indices.rollover.mockRejectedValueOnce(error);

    await expect(
      rolloverDataStream({
        esClient,
        logger,
        dataStreamName,
      })
    ).rejects.toThrow(error);

    expect(logger.error).toHaveBeenCalledWith(`Failed to rollover data stream ${dataStreamName}: ${error.message}`);
  });
});

describe('shouldRolloverDataStream', () => {
  it('should return true for illegal_argument_exception', () => {
    const error = {
      body: {
        error: {
          type: 'illegal_argument_exception',
        },
      },
    };

    expect(shouldRolloverDataStream(error)).toBe(true);
  });

  it('should return true for mapper_exception with rollover reasons', () => {
    const rolloverReasons = [
      'mapper',
      "can't merge",
      'different type',
      'cannot change',
      'conflicting type',
    ];

    rolloverReasons.forEach(reason => {
      const error = {
        body: {
          error: {
            type: 'mapper_exception',
            reason: `Error with ${reason} in mapping`,
          },
        },
      };

      expect(shouldRolloverDataStream(error)).toBe(true);
    });
  });

  it('should return false for mapper_exception without rollover reasons', () => {
    const error = {
      body: {
        error: {
          type: 'mapper_exception',
          reason: 'Some other error',
        },
      },
    };

    expect(shouldRolloverDataStream(error)).toBe(false);
  });

  it('should return false for other error types', () => {
    const error = {
      body: {
        error: {
          type: 'some_other_exception',
          reason: 'Some error',
        },
      },
    };

    expect(shouldRolloverDataStream(error)).toBe(false);
  });

  it('should return false for errors without body.error', () => {
    const errors = [
      {},
      { body: {} },
      { body: { error: null } },
      null,
      undefined,
    ];

    errors.forEach(error => {
      expect(shouldRolloverDataStream(error)).toBe(false);
    });
  });
});