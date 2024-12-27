/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { range } from 'lodash';
import { DEFAULT_NAMESPACE_STRING } from '@kbn/core-saved-objects-utils-server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import {
  createResourceInstallationHelper,
  errorResult,
  InitializationPromise,
  ResourceInstallationHelper,
  successResult,
  calculateDelay,
  getShouldRetry,
} from './create_resource_installation_helper';

const RETRY_UNTIL_DEFAULT_COUNT = 20;
const RETRY_UNTIL_DEFAULT_WAIT = 100; // milliseconds
type RetryableFunction = () => Promise<boolean>;

export const retryUntil = async (
  label: string,
  fn: RetryableFunction,
  count: number = RETRY_UNTIL_DEFAULT_COUNT,
  wait: number = RETRY_UNTIL_DEFAULT_WAIT
): Promise<boolean> => {
  await delay(wait);
  while (count > 0) {
    // eslint-disable-next-line no-param-reassign
    count--;

    if (await fn()) return true;

    // eslint-disable-next-line no-console
    console.log(`attempt failed waiting for "${label}", attempts left: ${count}`);

    if (count === 0) return false;
    await delay(wait);
  }

  return false;
};

const delay = async (millis: number) => new Promise((resolve) => setTimeout(resolve, millis));

const logger: ReturnType<(typeof loggingSystemMock)['createLogger']> =
  loggingSystemMock.createLogger();

const getCommonInitPromise = async (
  resolution: boolean,
  timeoutMs: number = 1,
  customLogString: string = ''
): Promise<InitializationPromise> => {
  if (timeoutMs < 0) {
    throw new Error('fail');
  }
  // delay resolution of promise by timeout value
  await new Promise((r) => setTimeout(r, timeoutMs));
  const customLog = customLogString && customLogString.length > 0 ? ` - ${customLogString}` : '';
  logger.info(`commonInitPromise resolved${customLog}`);
  return Promise.resolve(resolution ? successResult() : errorResult(`error initializing`));
};

const getContextInitialized = async (
  helper: ResourceInstallationHelper,
  context: string = 'test1',
  namespace: string = DEFAULT_NAMESPACE_STRING
) => {
  const { result } = await helper.getInitializedResources(namespace);
  return result;
};

describe('createResourceInstallationHelper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test(`should wait for commonInitFunction to resolve before calling initFns for registered contexts`, async () => {
    const helper = createResourceInstallationHelper(
      logger,
      getCommonInitPromise(true, 100),
      (namespace: string) => {
        return Promise.resolve();
      }
    );

    // Add two namespaces that need to be initialized
    helper.add('test1');
    helper.add('test2');

    await retryUntil('init fns run', async () => logger.info.mock.calls.length === 3);

    expect(logger.info).toHaveBeenNthCalledWith(1, `commonInitPromise resolved`);
    expect(await helper.getInitializedResources('test1')).toEqual({
      result: true,
    });
    expect(await helper.getInitializedResources('test2')).toEqual({
      result: true,
    });
  });

  test(`should log and return false if common init function returns false`, async () => {
    const helper = createResourceInstallationHelper(
      logger,
      getCommonInitPromise(false, 100),
      (namespace: string) => {
        return Promise.resolve();
      }
    );

    helper.add('test1');

    await retryUntil('common init fns run', async () => logger.info.mock.calls.length === 1);

    expect(logger.warn).toHaveBeenCalledWith(
      `Common resources were not initialized, cannot initialize resources for test1`
    );
    expect(await helper.getInitializedResources('test1')).toEqual({
      result: false,
      error: `error initializing`,
    });
  });

  test(`should log and return false if common init function throws error`, async () => {
    const helper = createResourceInstallationHelper(
      logger,
      getCommonInitPromise(true, -1),
      (namespace: string) => {
        return Promise.resolve();
      }
    );

    helper.add('test1');

    await retryUntil(
      'common init fns run',
      async () => (await getContextInitialized(helper)) === false
    );

    expect(logger.warn).toHaveBeenCalledWith(`Error initializing resources test1 - fail`);
    expect(await helper.getInitializedResources('test1')).toEqual({
      result: false,
      error: `fail`,
    });
  });

  test(`should retry using new common init function if specified`, async () => {
    const helper = createResourceInstallationHelper(
      logger,
      getCommonInitPromise(false, 100),
      (namespace: string) => {
        return Promise.resolve();
      }
    );

    helper.add();

    await retryUntil('common init fns run', async () => logger.info.mock.calls.length === 1);

    expect(logger.warn).toHaveBeenCalledWith(
      `Common resources were not initialized, cannot initialize resources for default`
    );
    expect(await helper.getInitializedResources(DEFAULT_NAMESPACE_STRING)).toEqual({
      result: false,
      error: `error initializing`,
    });

    helper.retry(undefined, getCommonInitPromise(true, 100, 'after retry'));

    await retryUntil('common init fns run', async () => logger.info.mock.calls.length === 2);
    expect(logger.info).toHaveBeenCalledWith(`commonInitPromise resolved - after retry`);
    expect(await helper.getInitializedResources(DEFAULT_NAMESPACE_STRING)).toEqual({
      result: true,
    });
  });

  test(`should throttle retry`, async () => {
    const initFnErrorOnce = jest
      .fn()
      .mockImplementationOnce(() => {
        throw new Error('first error');
      })
      .mockImplementationOnce(() => {
        throw new Error('second error');
      })
      .mockImplementation((namespace: string, timeoutMs?: number) => {
        logger.info(`${namespace} successfully retried`);
      });

    const helper = createResourceInstallationHelper(
      logger,
      getCommonInitPromise(true, 100),
      initFnErrorOnce
    );

    helper.add();

    await retryUntil(
      'context init fns run',
      async () => (await getContextInitialized(helper)) === false
    );

    expect(logger.warn).toHaveBeenCalledWith(`Error initializing resources default - first error`);
    expect(await helper.getInitializedResources(DEFAULT_NAMESPACE_STRING)).toEqual({
      result: false,
      error: `first error`,
    });

    logger.info.mockClear();
    logger.error.mockClear();

    helper.retry(undefined);
    await new Promise((r) => setTimeout(r, 10));
    helper.retry(undefined);

    await retryUntil('init fns retried', async () => {
      return logger.error.mock.calls.length === 1;
    });

    expect(logger.warn).toHaveBeenCalledWith(`Error initializing resources default - second error`);

    // the second retry is throttled so this is never called
    expect(logger.info).not.toHaveBeenCalledWith('test1_default successfully retried');
    expect(await helper.getInitializedResources(DEFAULT_NAMESPACE_STRING)).toEqual({
      result: false,
      error: 'second error',
    });
  });
});

describe('calculateDelay', () => {
  test('should return 30 seconds if attempts = 1', () => {
    expect(calculateDelay(1)).toEqual(30000);
  });

  test('should return multiple of 5 minutes if attempts > 1', () => {
    range(2, 20).forEach((attempt: number) => {
      expect(calculateDelay(attempt)).toEqual(Math.pow(2, attempt - 2) * 120000);
    });
  });
});

describe('getShouldRetry', () => {
  test('should return true if current time is past the previous retry time + the retry delay', () => {
    const now = new Date();
    const retry = {
      time: new Date(now.setMinutes(now.getMinutes() - 1)).toISOString(),
      attempts: 1,
    };
    expect(getShouldRetry(retry)).toEqual(true);
  });

  test('should return false if current time is not past the previous retry time + the retry delay', () => {
    const now = new Date();
    const retry = {
      time: new Date(now.setMinutes(now.getMinutes() - 1)).toISOString(),
      attempts: 2,
    };
    expect(getShouldRetry(retry)).toEqual(false);
  });
});
