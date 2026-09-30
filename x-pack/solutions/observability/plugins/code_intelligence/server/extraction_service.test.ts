/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { LockAcquisitionError, type LockManagerService } from '@kbn/lock-manager';

import { EXTRACTION_BATCH_LOCK_ID } from '../common/extraction_lock_id';
import type { CatalogWriter } from './domain/ports/catalog_writer';
import { extractRepository } from './extract_repository';
import { ExtractionAlreadyRunningError } from './extraction_already_running_error';
import { ExtractionService, type BatchRepository } from './extraction_service';
import { SourceUnavailableError, type SourceSession } from './source_session';

jest.mock('./extract_repository', () => ({ extractRepository: jest.fn() }));
jest.mock('./workflows/in_process_classification_client', () => ({
  InProcessClassificationWorkflowClient: jest.fn(),
}));

const extractRepositoryMock = extractRepository as jest.MockedFunction<typeof extractRepository>;
type ExtractResult = Awaited<ReturnType<typeof extractRepository>>;

const completedRun: ExtractResult = {
  status: 'success',
  value: {
    diagnostics: [],
    generatedTemplates: [],
    validation: new Map(),
    write: { failures: [], writtenIds: [] },
  },
};

const failedRun: ExtractResult = {
  status: 'failure',
  error: {
    code: 'repository_unavailable',
    message: 'Repository could not be read.',
    retryable: false,
  },
};

/** Holds each repository extraction open until the test resolves it. */
const pendingRuns = (): Array<(result?: ExtractResult) => void> => {
  const resolvers: Array<(result?: ExtractResult) => void> = [];
  extractRepositoryMock.mockImplementation(
    () =>
      new Promise((resolve) => {
        resolvers.push((result = completedRun) => resolve(result));
      })
  );
  return resolvers;
};

const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

/** Stands in for the Elasticsearch-backed lock that all Kibana instances share. */
const sharedLocks = (): Pick<LockManagerService, 'withLock'> & { readonly ids: string[] } => {
  const held = new Set<string>();
  const ids: string[] = [];
  return {
    ids,
    withLock: async (lockId, callback) => {
      ids.push(lockId);
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

const sourceSession = () => {
  const events: string[] = [];
  const session: SourceSession = {
    reader: {} as never,
    repositoryResolver: {
      resolve: async ({ repository, revision }) => ({
        status: 'success',
        value: { repository, requestedRevision: revision, commitSha: 'a'.repeat(40) },
      }),
    },
    finishRepository: jest.fn(async (repository: string) => {
      events.push(`finish:${repository}`);
    }),
    close: jest.fn(async () => {
      events.push('close');
    }),
  };
  return { session, events };
};

const service = ({
  lockManager = sharedLocks(),
  createSourceSession = () => sourceSession().session,
}: {
  lockManager?: Pick<LockManagerService, 'withLock'>;
  createSourceSession?: ConstructorParameters<typeof ExtractionService>[0]['createSourceSession'];
} = {}) =>
  new ExtractionService({
    lockManager,
    logger: { warn: jest.fn() },
    managedWorkflows: {} as never,
    management: {} as never,
    createSourceSession,
    validator: {} as never,
  });

const repo = (repository: string): BatchRepository => ({
  repository,
  revision: 'HEAD',
  remoteUrl: `https://github.com/${repository}.git`,
});

const start = (extractionService: ExtractionService, ...repositories: string[]) =>
  extractionService.start(
    repositories.map(repo),
    {} as KibanaRequest,
    'default',
    {} as unknown as CatalogWriter
  );

describe('ExtractionService batches', () => {
  beforeEach(() => extractRepositoryMock.mockReset());

  it('holds the single batch lock and refuses a second batch while one runs', async () => {
    pendingRuns();
    const locks = sharedLocks();
    const extractionService = service({ lockManager: locks });

    const running = await start(extractionService, 'elastic/example');

    const refusal = start(extractionService, 'elastic/other');
    await expect(refusal).rejects.toBeInstanceOf(ExtractionAlreadyRunningError);
    await expect(refusal).rejects.toMatchObject({ extractionId: running });
    expect(locks.ids).toEqual([EXTRACTION_BATCH_LOCK_ID]);
    expect(extractRepositoryMock).toHaveBeenCalledTimes(1);
  });

  it('refuses a second start issued before the first has acquired its lock', async () => {
    pendingRuns();
    const extractionService = service();

    const first = start(extractionService, 'elastic/example');
    const second = start(extractionService, 'elastic/other');

    await expect(first).resolves.toEqual(expect.any(String));
    await expect(second).rejects.toBeInstanceOf(ExtractionAlreadyRunningError);
  });

  it('refuses a batch held by another Kibana instance and does not track it', async () => {
    pendingRuns();
    const locks = sharedLocks();
    const opened: Array<ReturnType<typeof sourceSession>> = [];
    const instanceB = service({
      lockManager: locks,
      createSourceSession: () => {
        const created = sourceSession();
        opened.push(created);
        return created.session;
      },
    });

    await start(service({ lockManager: locks }), 'elastic/example');

    const refusal = start(instanceB, 'elastic/other');
    await expect(refusal).rejects.toBeInstanceOf(ExtractionAlreadyRunningError);
    await expect(refusal).rejects.toMatchObject({ extractionId: undefined });
    expect(opened[0]?.session.close).toHaveBeenCalledTimes(1);
  });

  it('runs repositories one after another over one source session and then closes it', async () => {
    const resolvers = pendingRuns();
    const { session, events } = sourceSession();
    const extractionService = service({ createSourceSession: () => session });

    const id = await start(extractionService, 'elastic/one', 'elastic/two');
    await flush();

    expect(extractRepositoryMock).toHaveBeenCalledTimes(1);
    expect(extractionService.get(id)?.repositories.map(({ status }) => status)).toEqual([
      'running',
      'pending',
    ]);
    resolvers[0]?.();
    await flush();
    expect(extractRepositoryMock).toHaveBeenCalledTimes(2);
    resolvers[1]?.();
    await flush();

    expect(events).toEqual(['finish:elastic/one', 'finish:elastic/two', 'close']);
    expect(extractionService.get(id)).toMatchObject({
      status: 'completed',
      completedAt: expect.any(String),
      repositories: [
        { repository: 'elastic/one', status: 'completed' },
        { repository: 'elastic/two', status: 'completed' },
      ],
    });
  });

  it('records the commit each repository resolved to', async () => {
    extractRepositoryMock.mockImplementation(async ({ repositoryRequest, repositoryResolver }) => {
      await repositoryResolver.resolve(repositoryRequest);
      return completedRun;
    });
    const extractionService = service();

    const id = await start(extractionService, 'elastic/example');
    await flush();

    expect(extractionService.get(id)?.repositories[0]).toMatchObject({
      revision: 'HEAD',
      commitSha: 'a'.repeat(40),
    });
  });

  it('continues after a failed repository and reports the batch as partial', async () => {
    const resolvers = pendingRuns();
    const { session, events } = sourceSession();
    const extractionService = service({ createSourceSession: () => session });

    const id = await start(extractionService, 'elastic/broken', 'elastic/fine');
    await flush();
    resolvers[0]?.(failedRun);
    await flush();
    resolvers[1]?.();
    await flush();

    expect(extractionService.get(id)).toMatchObject({
      status: 'partial',
      repositories: [
        { status: 'failed', errors: ['Repository could not be read.'] },
        { status: 'completed', errors: [] },
      ],
    });
    expect(events).toEqual(['finish:elastic/broken', 'finish:elastic/fine', 'close']);
  });

  it('reports the batch as failed when every repository failed, including unexpected errors', async () => {
    extractRepositoryMock.mockResolvedValueOnce(failedRun).mockRejectedValueOnce(new Error('boom'));
    const extractionService = service();

    const id = await start(extractionService, 'elastic/one', 'elastic/two');
    await flush();

    expect(extractionService.get(id)).toMatchObject({
      status: 'failed',
      repositories: [
        { status: 'failed' },
        { status: 'failed', errors: ['Extraction failed unexpectedly.'] },
      ],
    });
  });

  it('refuses to start without tracking anything when the source is unavailable', async () => {
    const extractionService = service({
      createSourceSession: () => {
        throw new SourceUnavailableError('Sandbox is not configured in this deployment.');
      },
    });

    await expect(start(extractionService, 'elastic/example')).rejects.toBeInstanceOf(
      SourceUnavailableError
    );
    expect(extractRepositoryMock).not.toHaveBeenCalled();
  });

  it('allows a new batch after the previous one finishes, dropping the oldest of 100 tracked batches', async () => {
    extractRepositoryMock.mockResolvedValue(completedRun);
    const extractionService = service();
    const first = await start(extractionService, 'elastic/example');
    await flush();
    for (let index = 1; index < 100; index++) {
      await start(extractionService, 'elastic/example');
      await flush();
    }

    await expect(start(extractionService, 'elastic/example')).resolves.toEqual(expect.any(String));
    expect(extractionService.get(first)).toBeUndefined();
  });
});
