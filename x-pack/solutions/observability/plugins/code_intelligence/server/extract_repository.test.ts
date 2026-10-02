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
import { extractRepository, type ExtractionLogger } from './extract_repository';

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

/** Yields one standard logging emission in each named file, so each file adds 1 candidate. */
const logReader = (names: readonly string[]): SourceReader => ({
  grep: async ({ pattern }) =>
    pattern === loggingIdiomPatterns[0]
      ? {
          items: names.map((name) => ({
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
      lines: [`logger.info("started ${path.slice(4, -3)}")`],
      path,
      startLine,
    },
  }),
});

/** Yields 3 candidates in 1 batch. */
const threeLogReader = logReader(['a', 'b', 'c']);

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
  classificationWorkflows: ClassificationWorkflowClient = workflows,
  logger: ExtractionLogger = { warn: jest.fn() }
) =>
  extractRepository({
    catalogWriter,
    extractorVersion: 'test',
    logger,
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
    const logger = { warn: jest.fn() };

    const result = await run(catalogWriter, threeLogReader, classification, logger);

    expect(result.status).toBe('success');
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn.mock.calls[0]?.[0]).toMatch(
      /^The logging classification workflow for elastic\/example skipped 1 of 3 candidates on the first try\. src\/a\.ts:1 omitted, at 1\/3, src\/a\.ts:1, previous none, next src\/b\.ts:1\. Retries recovered 1; 0 still unclassified\.$/
    );
    expect(classification.classifyLogging).toHaveBeenCalledTimes(2);
    const [first, retry] = classification.classifyLogging.mock.calls.map(
      ([request]) => request.candidates
    );
    expect(first?.map(({ id }) => id)).toEqual(['c1', 'c2', 'c3']);
    expect(retry).toEqual([first?.[0]]);
    expect(result.status === 'success' && result.value.diagnostics).toEqual([]);
    expect(result.status === 'success' && result.value.generatedTemplates).toHaveLength(3);
    expect(catalogWriter.prune).toHaveBeenCalledTimes(1);
  });

  it('logs a merge of 2 candidates that share an excerpt', async () => {
    const sameExcerptReader: SourceReader = {
      ...oneLogReader,
      grep: async ({ pattern }) =>
        pattern === loggingIdiomPatterns[0]
          ? {
              items: ['a', 'b'].map((name) => ({
                line: 1,
                path: `src/${name}.ts`,
                text: 'logger.info("started")',
              })),
              status: 'complete',
            }
          : { items: [], status: 'complete' },
    };
    let call = 0;
    const merging: ClassificationWorkflowClient = {
      ...workflows,
      classifyLogging: async ({ candidates }) => {
        call += 1;
        const [first] = candidates;
        const answered = call === 1 && first !== undefined ? [first, first] : candidates;
        return {
          status: 'success',
          value: answered.map(({ id }, index) => ({ id, keep: index === 0 })),
        };
      },
    };
    const logger = { warn: jest.fn() };

    const result = await run(successfulWriter(), sameExcerptReader, merging, logger);

    expect(result.status).toBe('success');
    expect(logger.warn.mock.calls[0]?.[0]).toMatch(
      /skipped 2 of 2 candidates on the first try\. \S+ answered 2 times, at 1\/2, src\/a\.ts:1, previous none, next \S+ \(same excerpt\); \S+ omitted, at 2\/2, src\/b\.ts:1, previous \S+ \(same excerpt\), next none\. Retries recovered 2; 0 still unclassified\.$/
    );
  });

  it('accepts duplicate answers that agree without a retry', async () => {
    const classification: jest.Mocked<ClassificationWorkflowClient> = {
      classifyLogging: jest.fn(async ({ candidates }) => ({
        status: 'success' as const,
        value: [...candidates, ...candidates].map(({ id }) => ({ id, keep: true })),
      })),
      classifyOtel: jest.fn(workflows.classifyOtel),
    };

    const result = await run(successfulWriter(), threeLogReader, classification);

    expect(classification.classifyLogging).toHaveBeenCalledTimes(1);
    expect(result.status === 'success' && result.value.generatedTemplates).toHaveLength(3);
  });

  it('ignores an answer whose ID was rewritten and retries its candidate', async () => {
    let call = 0;
    const classification: jest.Mocked<ClassificationWorkflowClient> = {
      classifyLogging: jest.fn(async ({ candidates }) => {
        call += 1;
        return {
          status: 'success' as const,
          value: candidates.map(({ id }, index) => ({
            id: call === 1 && index === 0 ? 'src/rewritten.ts:1' : id,
            keep: true,
          })),
        };
      }),
      classifyOtel: jest.fn(workflows.classifyOtel),
    };

    const result = await run(successfulWriter(), threeLogReader, classification);

    expect(classification.classifyLogging).toHaveBeenCalledTimes(2);
    expect(classification.classifyLogging.mock.calls[1]?.[0].candidates).toEqual([
      expect.objectContaining({ excerpt: 'logger.info("started a")', id: 'c1' }),
    ]);
    expect(result.status === 'success' && result.value.generatedTemplates).toHaveLength(3);
  });

  it('retries a batch after a retryable workflow failure', async () => {
    let call = 0;
    const classification: jest.Mocked<ClassificationWorkflowClient> = {
      classifyLogging: jest.fn(async (request) => {
        call += 1;
        return call === 1
          ? {
              error: { code: 'malformed_workflow_response', message: 'bad', retryable: true },
              status: 'failure' as const,
            }
          : workflows.classifyLogging(request);
      }),
      classifyOtel: jest.fn(workflows.classifyOtel),
    };
    const logger = { warn: jest.fn() };

    const result = await run(successfulWriter(), threeLogReader, classification, logger);

    expect(classification.classifyLogging).toHaveBeenCalledTimes(2);
    expect(logger.warn).toHaveBeenCalledWith(
      'The logging classification workflow for elastic/example failed for 3 candidates on the first try. bad Retries recovered 3; 0 still unclassified.'
    );
    expect(result.status === 'success' && result.value.diagnostics).toEqual([]);
  });

  it('stops without writing after a non-retryable workflow failure', async () => {
    const catalogWriter = successfulWriter();
    const classification: jest.Mocked<ClassificationWorkflowClient> = {
      classifyLogging: jest.fn(async (_request) => ({
        error: { code: 'invalid_workflow_request', message: 'bad request', retryable: false },
        status: 'failure' as const,
      })),
      classifyOtel: jest.fn(workflows.classifyOtel),
    };

    const result = await run(catalogWriter, threeLogReader, classification);

    expect(classification.classifyLogging).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ error: { code: 'invalid_workflow_request' } });
    expect(catalogWriter.write).not.toHaveBeenCalled();
  });

  it('writes the classified entries when a whole batch fails, then fails the run', async () => {
    const catalogWriter = successfulWriter();
    const names = Array.from({ length: 201 }, (_, index) => `f${index}`);
    const classification: jest.Mocked<ClassificationWorkflowClient> = {
      classifyLogging: jest.fn(async (request) =>
        request.candidates.length === 1
          ? workflows.classifyLogging(request)
          : {
              error: { code: 'workflow_execution_failed', message: 'down', retryable: true },
              status: 'failure' as const,
            }
      ),
      classifyOtel: jest.fn(workflows.classifyOtel),
    };

    const result = await run(catalogWriter, logReader(names), classification);

    expect(classification.classifyLogging).toHaveBeenCalledTimes(5);
    expect(result).toMatchObject({
      error: {
        code: 'incomplete_classification',
        message: expect.stringContaining('left 200 of 201 candidates unclassified'),
      },
      status: 'failure',
    });
    expect(catalogWriter.write.mock.calls[0]?.[0]).toHaveLength(1);
    expect(catalogWriter.prune).not.toHaveBeenCalled();
  });

  it('leaves out a candidate skipped on every attempt, warns, and keeps earlier documents', async () => {
    const catalogWriter = successfulWriter();

    const logger = { warn: jest.fn() };

    const result = await run(
      catalogWriter,
      threeLogReader,
      skippingWorkflows([1, 2, 3, 4]),
      logger
    );

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Retries recovered 0; 1 still unclassified.')
    );
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

  it('fails when the workflow leaves every candidate unclassified', async () => {
    const catalogWriter = successfulWriter();

    const result = await run(catalogWriter, oneLogReader, skippingWorkflows([1, 2, 3, 4]));

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
