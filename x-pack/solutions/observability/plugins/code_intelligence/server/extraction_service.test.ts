/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { LockAcquisitionError, type LockManagerService } from '@kbn/lock-manager';

import type { CatalogWriter } from './domain/ports/catalog_writer';
import { extractRepository } from './extract_repository';
import { ExtractionAlreadyRunningError } from './extraction_already_running_error';
import { ExtractionService } from './extraction_service';

jest.mock('./extract_repository', () => ({ extractRepository: jest.fn() }));
jest.mock('./workflows/in_process_classification_client', () => ({
  InProcessClassificationWorkflowClient: jest.fn(),
}));

const extractRepositoryMock = extractRepository as jest.MockedFunction<typeof extractRepository>;

const completedRun = {
  status: 'success' as const,
  value: {
    diagnostics: [],
    generatedTemplates: [],
    validation: new Map(),
    write: { failures: [], writtenIds: [] },
  },
};

/** Holds each extraction open until the test resolves it. */
const pendingRuns = (): Array<() => void> => {
  const resolvers: Array<() => void> = [];
  extractRepositoryMock.mockImplementation(
    () =>
      new Promise((resolve) => {
        resolvers.push(() => resolve(completedRun));
      })
  );
  return resolvers;
};

const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

/** Stands in for the Elasticsearch-backed lock that all Kibana instances share. */
const sharedLocks = (): Pick<LockManagerService, 'withLock'> => {
  const held = new Set<string>();
  return {
    withLock: async (lockId, callback) => {
      if (held.has(lockId)) throw new LockAcquisitionError(`Lock "${lockId}" not acquired`);
      held.add(lockId);
      try {
        return await callback();
      } finally {
        held.delete(lockId);
      }
    },
  };
};

const service = (lockManager = sharedLocks()) =>
  new ExtractionService({
    lockManager,
    managedWorkflows: {} as never,
    management: {} as never,
    reader: {} as never,
    repositoryResolver: {} as never,
    validator: {} as never,
  });

const start = (extractionService: ExtractionService, repository: string) =>
  extractionService.start(
    repository,
    'HEAD',
    {} as KibanaRequest,
    'default',
    {} as unknown as CatalogWriter
  );

describe('ExtractionService same-repository guard', () => {
  beforeEach(() => extractRepositoryMock.mockReset());

  it('refuses a second run for a repository that is already running', async () => {
    pendingRuns();
    const extractionService = service();

    await start(extractionService, 'elastic/example');

    await expect(start(extractionService, 'elastic/example')).rejects.toBeInstanceOf(
      ExtractionAlreadyRunningError
    );
    expect(extractRepositoryMock).toHaveBeenCalledTimes(1);
  });

  it('refuses a second start issued before the first has acquired its lock', async () => {
    pendingRuns();
    const extractionService = service();

    const first = start(extractionService, 'elastic/example');
    const second = start(extractionService, 'elastic/example');

    await expect(first).resolves.toEqual(expect.any(String));
    await expect(second).rejects.toBeInstanceOf(ExtractionAlreadyRunningError);
    expect(extractRepositoryMock).toHaveBeenCalledTimes(1);
  });

  it('refuses a run held by another Kibana instance and does not track it', async () => {
    pendingRuns();
    const locks = sharedLocks();
    const instanceA = service(locks);
    const instanceB = service(locks);

    await start(instanceA, 'elastic/example');

    await expect(start(instanceB, 'elastic/example')).rejects.toBeInstanceOf(
      ExtractionAlreadyRunningError
    );
    expect(extractRepositoryMock).toHaveBeenCalledTimes(1);
    await expect(start(instanceB, 'elastic/other')).resolves.toEqual(expect.any(String));
  });

  it('allows a run for a different repository while another is running', async () => {
    pendingRuns();
    const extractionService = service();

    await start(extractionService, 'elastic/example');

    await expect(start(extractionService, 'elastic/other')).resolves.toEqual(expect.any(String));
    expect(extractRepositoryMock).toHaveBeenCalledTimes(2);
  });

  it('allows the repository to start again after its run finishes', async () => {
    const resolvers = pendingRuns();
    const extractionService = service();
    const first = await start(extractionService, 'elastic/example');

    resolvers[0]?.();
    await flush();

    expect(extractionService.get(first)?.status).toBe('completed');
    await expect(start(extractionService, 'elastic/example')).resolves.toEqual(expect.any(String));
  });
});
