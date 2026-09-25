/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { ensureMemoryIndex } from './ensure_memory_index';
import { createMemoryService } from './internal_client';

jest.mock('./ensure_memory_index', () => ({
  ensureMemoryIndex: jest.fn(),
}));

const ensureMemoryIndexMock = jest.mocked(ensureMemoryIndex);

describe('createMemoryService', () => {
  const internalClient = { search: jest.fn() };
  const logger = loggerMock.create();
  const createService = () =>
    createMemoryService({
      getElasticsearch: jest.fn().mockReturnValue({
        client: { asInternalUser: internalClient },
      }),
    });

  beforeEach(() => {
    jest.clearAllMocks();
    ensureMemoryIndexMock.mockResolvedValue();
  });

  it('fails clearly before plugin start initializes memory', async () => {
    const service = createService();

    await expect(service.getClientWhenReady()).rejects.toThrow(
      'Semantic Memory is not initialized'
    );
  });

  it('shares one initialization attempt among simultaneous callers', async () => {
    let resolveInitialization: () => void = () => {};
    ensureMemoryIndexMock.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveInitialization = resolve;
        })
    );
    const service = createService();

    const initialization = service.initialize(logger);
    const firstClient = service.getClientWhenReady();
    const secondClient = service.getClientWhenReady();
    const repeatedInitialization = service.initialize(logger);

    expect(ensureMemoryIndex).toHaveBeenCalledTimes(1);
    expect(repeatedInitialization).toBe(initialization);

    resolveInitialization();

    await expect(firstClient).resolves.toBe(internalClient);
    await expect(secondClient).resolves.toBe(internalClient);
  });

  it('preserves an initialization rejection for every caller without retrying', async () => {
    const initializationError = new Error('mapping rejected');
    ensureMemoryIndexMock.mockRejectedValueOnce(initializationError);
    const service = createService();

    const initialization = service.initialize(logger);

    await expect(initialization).rejects.toBe(initializationError);
    await expect(service.getClientWhenReady()).rejects.toBe(initializationError);
    await expect(service.getClientWhenReady()).rejects.toBe(initializationError);
    expect(service.initialize(logger)).toBe(initialization);
    expect(ensureMemoryIndex).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to ensure Semantic Memory index: mapping rejected'
    );
  });
});
