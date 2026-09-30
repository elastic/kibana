/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CatalogWriter,
  ClassificationWorkflowClient,
  QueryValidator,
  RepositoryResolver,
  SourceReader,
} from './domain';
import { loggingIdiomPatterns } from './domain/logging/idiom_patterns';
import { extractRepository } from './extract_repository';

const repositoryResolver: RepositoryResolver = {
  resolve: async (request) => ({
    status: 'success',
    value: {
      commitSha: 'a'.repeat(40),
      repository: request.repository,
      requestedRevision: request.revision,
    },
  }),
};

const emptyReader: SourceReader = {
  grep: async () => ({ items: [], status: 'complete' }),
  listSourcePage: async () => ({ items: [], status: 'complete' }),
  readWindow: async () => {
    throw new Error('No source windows should be read.');
  },
};

/** Yields exactly one standard logging emission so the run produces one catalog document. */
const oneLogReader: SourceReader = {
  grep: async ({ pattern }) =>
    pattern === loggingIdiomPatterns[0]
      ? {
          items: [{ line: 1, path: 'src/app.ts', text: 'logger.info("started")' }],
          status: 'complete',
        }
      : { items: [], status: 'complete' },
  listSourcePage: async () => ({ items: [], status: 'complete' }),
  readWindow: async ({ path, startLine }) => ({
    status: 'success',
    value: { endLine: 1, lines: ['logger.info("started")'], path, startLine },
  }),
};

const workflows: ClassificationWorkflowClient = {
  classifyLogging: async ({ candidates }) => ({
    status: 'success',
    value: candidates.map(({ id }) => ({
      id,
      keep: true,
      level: 'info' as const,
      staticMessage: 'started',
    })),
  }),
  classifyOtel: async () => {
    throw new Error('No OTel workflow should run.');
  },
};

const validator: QueryValidator = {
  validate: async () => ({ diagnostics: [], status: 'skipped' }),
};

const successfulWriter = (): jest.Mocked<CatalogWriter> => ({
  prune: jest.fn(async (_request) => ({ status: 'success' as const, value: { deleted: 3 } })),
  write: jest.fn(async (requests) => ({
    status: 'success' as const,
    value: { failures: [], writtenIds: requests.map(({ document }) => document.id) },
  })),
});

/** Yields one standard logging emission in each of 3 files, so one batch holds 3 candidates. */
const threeLogReader: SourceReader = {
  grep: async ({ pattern }) =>
    pattern === loggingIdiomPatterns[0]
      ? {
          items: ['a', 'b', 'c'].map((name) => ({
            line: 1,
            path: `src/${name}.ts`,
            text: `logger.info("started ${name}")`,
          })),
          status: 'complete',
        }
      : { items: [], status: 'complete' },
  listSourcePage: async () => ({ items: [], status: 'complete' }),
  readWindow: async ({ path, startLine }) => ({
    status: 'success',
    value: {
      endLine: 1,
      lines: [`logger.info("started ${path.slice(4, 5)}")`],
      path,
      startLine,
    },
  }),
};

/** Keeps every candidate, but leaves out the first candidate on the listed calls. */
const skippingWorkflows = (
  skipOnCalls: readonly number[]
): jest.Mocked<ClassificationWorkflowClient> => {
  let call = 0;
  return {
    classifyLogging: jest.fn(async ({ candidates }) => {
      call += 1;
      const answered = skipOnCalls.includes(call) ? candidates.slice(1) : candidates;
      return {
        status: 'success' as const,
        value: answered.map(({ id }) => ({ id, keep: true })),
      };
    }),
    classifyOtel: jest.fn(workflows.classifyOtel),
  };
};

const run = (
  catalogWriter: CatalogWriter,
  reader: SourceReader = oneLogReader,
  classificationWorkflows: ClassificationWorkflowClient = workflows
) =>
  extractRepository({
    catalogWriter,
    extractorVersion: 'test',
    now: () => '2026-09-28T00:00:00.000Z',
    reader,
    repositoryRequest: { repository: 'elastic/example', revision: 'main' },
    repositoryResolver,
    validator,
    workflows: classificationWorkflows,
  });

describe('extractRepository', () => {
  it('completes without writes or a prune when standard discovery finds nothing', async () => {
    const catalogWriter = successfulWriter();

    const result = await run(catalogWriter, emptyReader);

    expect(result).toMatchObject({
      status: 'success',
      value: {
        diagnostics: [expect.objectContaining({ code: 'prune_skipped_no_documents' })],
        generatedTemplates: [],
        write: { failures: [], writtenIds: [] },
      },
    });
    expect(catalogWriter.write).not.toHaveBeenCalled();
    expect(catalogWriter.prune).not.toHaveBeenCalled();
  });

  it('prunes the repository with exactly the written IDs after a clean write', async () => {
    const catalogWriter = successfulWriter();

    const result = await run(catalogWriter);

    expect(result.status).toBe('success');
    const writtenIds = (await catalogWriter.write.mock.results[0]?.value)?.value?.writtenIds;
    expect(writtenIds).toHaveLength(1);
    expect(catalogWriter.prune).toHaveBeenCalledTimes(1);
    expect(catalogWriter.prune).toHaveBeenCalledWith({
      keepIds: writtenIds,
      repository: 'elastic/example',
    });
    expect(catalogWriter.write.mock.invocationCallOrder[0]).toBeLessThan(
      catalogWriter.prune.mock.invocationCallOrder[0] ?? 0
    );
  });

  it('does not prune when the write fails', async () => {
    const catalogWriter = successfulWriter();
    catalogWriter.write.mockResolvedValue({
      error: { code: 'catalog_transport_failure', message: 'down', retryable: true },
      status: 'failure',
    });

    const result = await run(catalogWriter);

    expect(result).toMatchObject({
      error: { code: 'catalog_transport_failure' },
      status: 'failure',
    });
    expect(catalogWriter.prune).not.toHaveBeenCalled();
  });

  it('does not prune when any bulk item fails', async () => {
    const catalogWriter = successfulWriter();
    catalogWriter.write.mockImplementation(async (requests) => ({
      status: 'success',
      value: {
        failures: requests.map(({ document }) => ({
          documentId: document.id,
          error: { code: 'catalog_bulk_item_failure', message: 'rejected', retryable: false },
        })),
        writtenIds: [],
      },
    }));

    const result = await run(catalogWriter);

    expect(result.status).toBe('success');
    expect(catalogWriter.prune).not.toHaveBeenCalled();
  });

  it('retries only the skipped candidate and prunes when the retry classifies it', async () => {
    const catalogWriter = successfulWriter();
    const classification = skippingWorkflows([1]);

    const result = await run(catalogWriter, threeLogReader, classification);

    expect(result.status).toBe('success');
    expect(classification.classifyLogging).toHaveBeenCalledTimes(2);
    const [first, retry] = classification.classifyLogging.mock.calls.map(
      ([request]) => request.candidates
    );
    expect(first).toHaveLength(3);
    expect(retry).toEqual([first?.[0]]);
    expect(result.status === 'success' && result.value.diagnostics).toEqual([]);
    expect(result.status === 'success' && result.value.generatedTemplates).toHaveLength(3);
    expect(catalogWriter.prune).toHaveBeenCalledTimes(1);
  });

  it('leaves out a candidate skipped twice, warns, and keeps earlier documents', async () => {
    const catalogWriter = successfulWriter();

    const result = await run(catalogWriter, threeLogReader, skippingWorkflows([1, 2]));

    expect(result).toMatchObject({
      status: 'success',
      value: {
        diagnostics: [
          expect.objectContaining({
            code: 'unclassified_candidates',
            message: expect.stringContaining('skipped 1 logging and 0 OTel candidates'),
          }),
          expect.objectContaining({ code: 'prune_skipped_unclassified_candidates' }),
        ],
      },
    });
    expect(result.status === 'success' && result.value.generatedTemplates).toHaveLength(2);
    expect(catalogWriter.write).toHaveBeenCalledTimes(1);
    expect(catalogWriter.prune).not.toHaveBeenCalled();
  });

  it('fails when the workflow leaves every candidate in a batch unclassified', async () => {
    const catalogWriter = successfulWriter();

    const result = await run(catalogWriter, oneLogReader, skippingWorkflows([1, 2]));

    expect(result).toMatchObject({
      error: { code: 'incomplete_classification' },
      status: 'failure',
    });
    expect(catalogWriter.write).not.toHaveBeenCalled();
  });

  it('returns a prune failure as the run failure', async () => {
    const catalogWriter = successfulWriter();
    catalogWriter.prune.mockResolvedValue({
      error: {
        code: 'catalog_prune_transport_failure',
        message: 'Elasticsearch catalog prune failed.',
        retryable: true,
      },
      status: 'failure',
    });

    const result = await run(catalogWriter);

    expect(result).toMatchObject({
      error: {
        code: 'catalog_prune_failure',
        message: expect.stringContaining('Elasticsearch catalog prune failed.'),
        retryable: true,
      },
      status: 'failure',
    });
  });
});
