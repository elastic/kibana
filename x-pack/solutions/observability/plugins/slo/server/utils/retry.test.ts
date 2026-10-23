/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('timers/promises');
import { setTimeout } from 'timers/promises';
import { loggerMock } from '@kbn/logging-mocks';
import { errors as EsErrors } from '@elastic/elasticsearch';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';

import { ignoreAlreadyExistsAfterAmbiguousFailure, retryTransientEsErrors } from './retry';

const setTimeoutMock = setTimeout as jest.Mock<
  ReturnType<typeof setTimeout>,
  Parameters<typeof setTimeout>
>;

describe('retryTransientErrors', () => {
  beforeEach(() => {
    setTimeoutMock.mockClear();
  });

  it("doesn't retry if operation is successful", async () => {
    const esCallMock = jest.fn().mockResolvedValue('success');
    expect(await retryTransientEsErrors(esCallMock)).toEqual('success');
    expect(esCallMock).toHaveBeenCalledTimes(1);
  });

  it('logs an warning message on retry', async () => {
    const logger = loggerMock.create();
    const esCallMock = jest
      .fn()
      .mockRejectedValueOnce(new EsErrors.ConnectionError('foo'))
      .mockResolvedValue('success');

    await retryTransientEsErrors(esCallMock, { logger });
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn.mock.calls[0][0]).toMatch(
      `Retrying Elasticsearch operation after [2s] due to error: ConnectionError: foo ConnectionError: foo`
    );
  });

  it('retries with an exponential backoff', async () => {
    let attempt = 0;
    const esCallMock = jest.fn(async () => {
      attempt++;
      if (attempt < 5) {
        throw new EsErrors.ConnectionError('foo');
      } else {
        return 'success';
      }
    });

    expect(await retryTransientEsErrors(esCallMock)).toEqual('success');
    expect(setTimeoutMock.mock.calls).toEqual([[2000], [4000], [8000], [16000]]);
    expect(esCallMock).toHaveBeenCalledTimes(5);
  });

  it('retries each supported error type', async () => {
    const errors = [
      new EsErrors.NoLivingConnectionsError('no living connection', {
        warnings: [],
        meta: {} as any,
      }),
      new EsErrors.ConnectionError('no connection'),
      new EsErrors.TimeoutError('timeout'),
      new EsErrors.ResponseError({ statusCode: 503, meta: {} as any, warnings: [] }),
      new EsErrors.ResponseError({ statusCode: 408, meta: {} as any, warnings: [] }),
      new EsErrors.ResponseError({ statusCode: 410, meta: {} as any, warnings: [] }),
    ];

    for (const error of errors) {
      const esCallMock = jest.fn().mockRejectedValueOnce(error).mockResolvedValue('success');
      expect(await retryTransientEsErrors(esCallMock)).toEqual('success');
      expect(esCallMock).toHaveBeenCalledTimes(2);
    }
  });

  it('does not retry unsupported errors', async () => {
    const error = new Error('foo!');
    const esCallMock = jest.fn().mockRejectedValueOnce(error).mockResolvedValue('success');
    await expect(retryTransientEsErrors(esCallMock)).rejects.toThrow(error);
    expect(esCallMock).toHaveBeenCalledTimes(1);
  });
});

describe('ignoreAlreadyExistsAfterAmbiguousFailure', () => {
  const alreadyExistsError = new EsErrors.ResponseError(
    elasticsearchClientMock.createApiResponse({
      statusCode: 400,
      body: {
        error: {
          type: 'resource_already_exists_exception',
          reason: 'Transform with id [slo-id-1] already exists',
        },
      },
    })
  );
  const upgradingError = new EsErrors.ResponseError(
    elasticsearchClientMock.createApiResponse({
      statusCode: 409,
      body: {
        error: {
          type: 'status_exception',
          reason: 'Cannot create new Transform while the Transform feature is upgrading.',
        },
      },
    })
  );

  it.each([
    ['TimeoutError', new EsErrors.TimeoutError('timeout')],
    ['ConnectionError', new EsErrors.ConnectionError('connection reset')],
    [
      '504 response',
      new EsErrors.ResponseError({ statusCode: 504, meta: {} as any, warnings: [] }),
    ],
  ])('resolves when the resource already exists after a %s', async (_, ambiguousError) => {
    const esCall = ignoreAlreadyExistsAfterAmbiguousFailure(
      jest.fn().mockRejectedValueOnce(ambiguousError).mockRejectedValueOnce(alreadyExistsError)
    );

    await expect(esCall()).rejects.toBe(ambiguousError);
    await expect(esCall()).resolves.toBeUndefined();
  });

  it.each([
    [
      'NoLivingConnectionsError',
      new EsErrors.NoLivingConnectionsError('no living connection', {
        warnings: [],
        meta: {} as any,
      }),
    ],
    [
      '429 response',
      new EsErrors.ResponseError({ statusCode: 429, meta: {} as any, warnings: [] }),
    ],
  ])(
    'rejects when the resource already exists after a %s, since it was never applied',
    async (_, unappliedError) => {
      const esCall = ignoreAlreadyExistsAfterAmbiguousFailure(
        jest.fn().mockRejectedValueOnce(unappliedError).mockRejectedValueOnce(alreadyExistsError)
      );

      await expect(esCall()).rejects.toBe(unappliedError);
      await expect(esCall()).rejects.toBe(alreadyExistsError);
    }
  );

  it('rejects when the resource already exists on the first attempt', async () => {
    const esCall = ignoreAlreadyExistsAfterAmbiguousFailure(
      jest.fn().mockRejectedValue(alreadyExistsError)
    );
    await expect(esCall()).rejects.toBe(alreadyExistsError);
  });

  it('rejects other errors after an ambiguous failure', async () => {
    const esCall = ignoreAlreadyExistsAfterAmbiguousFailure(
      jest
        .fn()
        .mockRejectedValueOnce(new EsErrors.TimeoutError('timeout'))
        .mockRejectedValueOnce(upgradingError)
    );

    await expect(esCall()).rejects.toThrow('timeout');
    await expect(esCall()).rejects.toBe(upgradingError);
  });

  it('resolves with the operation result on success', async () => {
    const esCall = ignoreAlreadyExistsAfterAmbiguousFailure(jest.fn().mockResolvedValue('success'));
    await expect(esCall()).resolves.toEqual('success');
  });
});
