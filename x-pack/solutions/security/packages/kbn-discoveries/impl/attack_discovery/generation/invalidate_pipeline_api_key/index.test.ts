/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, Logger } from '@kbn/core/server';

import { invalidatePipelineApiKey } from '.';

const invalidateAsInternalUser = jest.fn();

const createCoreStart = (): CoreStart =>
  ({
    security: {
      authc: {
        apiKeys: {
          invalidateAsInternalUser,
        },
      },
    },
  } as unknown as CoreStart);

const createLogger = (): Logger =>
  ({
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  } as unknown as Logger);

describe('invalidatePipelineApiKey', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    invalidateAsInternalUser.mockResolvedValue({ invalidated_api_keys: ['granted-id'] });
  });

  it('invalidates the granted API key by id', async () => {
    await invalidatePipelineApiKey({
      apiKeyId: 'granted-id',
      coreStart: createCoreStart(),
      logger: createLogger(),
    });

    expect(invalidateAsInternalUser).toHaveBeenCalledWith({ ids: ['granted-id'] });
  });

  it('does not invalidate when no API key was granted', async () => {
    await invalidatePipelineApiKey({
      apiKeyId: undefined,
      coreStart: createCoreStart(),
      logger: createLogger(),
    });

    expect(invalidateAsInternalUser).not.toHaveBeenCalled();
  });

  it('does not invalidate when the security service is unavailable', async () => {
    await expect(
      invalidatePipelineApiKey({
        apiKeyId: 'granted-id',
        coreStart: {} as unknown as CoreStart,
        logger: createLogger(),
      })
    ).resolves.toBeUndefined();
  });

  it('does not invalidate when core start services are unavailable', async () => {
    await invalidatePipelineApiKey({
      apiKeyId: 'granted-id',
      coreStart: undefined,
      logger: createLogger(),
    });

    expect(invalidateAsInternalUser).not.toHaveBeenCalled();
  });

  it('does not propagate an invalidation failure', async () => {
    invalidateAsInternalUser.mockRejectedValue(new Error('boom'));

    await expect(
      invalidatePipelineApiKey({
        apiKeyId: 'granted-id',
        coreStart: createCoreStart(),
        logger: createLogger(),
      })
    ).resolves.toBeUndefined();
  });

  it('logs a warning when invalidation fails', async () => {
    invalidateAsInternalUser.mockRejectedValue(new Error('boom'));
    const logger = createLogger();

    await invalidatePipelineApiKey({
      apiKeyId: 'granted-id',
      coreStart: createCoreStart(),
      logger,
    });

    expect(logger.warn).toHaveBeenCalled();
  });
});
