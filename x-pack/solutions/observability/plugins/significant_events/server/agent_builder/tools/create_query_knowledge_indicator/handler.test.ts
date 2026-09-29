/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { createQueryKnowledgeIndicatorToolHandler } from './handler';

vi.mock('uuid', () => {
      const mocked = {
      v4: vi.fn(() => 'generated-query-id'),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../lib/significant_events/validate_esql_query', async () => {
      const mocked = {
      ...(await vi.importActual('../../../lib/significant_events/validate_esql_query')),
      validateEsqlQueryForStreamOrThrow: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

describe('createQueryKnowledgeIndicatorToolHandler', () => {
  const logger = loggingSystemMock.createLogger();
  const definition = {
    name: 'logs.test',
    ingest: {
      classic: { field_overrides: {} },
      processing: [],
      lifecycle: { inherit: {} },
      failure_store: { inherit: {} },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates query KI with provided id and upserts it', async () => {
    const kiClient = {
      upsertQuery: vi.fn().mockResolvedValue(undefined),
    };

    const result = await createQueryKnowledgeIndicatorToolHandler({
      kiClient: kiClient as never,
      definition: definition as never,
      queryInput: {
        id: 'provided-id',
        title: 'Suspicious query',
        description: 'Find suspicious events',
        esql: { query: 'FROM logs.test, logs.test.* | stats c = count()' },
        severity_score: 70,
      },
      logger,
    });

    expect(result).toEqual({ id: 'provided-id' });
    expect(kiClient.upsertQuery).toHaveBeenCalledWith(
      definition,
      expect.objectContaining({
        id: 'provided-id',
        type: 'stats',
        title: 'Suspicious query',
        description: 'Find suspicious events',
        esql: { query: 'FROM logs.test, logs.test.* | stats c = count()' },
        severity_score: 70,
      })
    );
  });

  it('generates id when missing', async () => {
    const kiClient = {
      upsertQuery: vi.fn().mockResolvedValue(undefined),
    };

    const result = await createQueryKnowledgeIndicatorToolHandler({
      kiClient: kiClient as never,
      definition: definition as never,
      queryInput: {
        title: 'Suspicious query',
        description: 'Find suspicious events',
        esql: { query: 'FROM logs.test, logs.test.*' },
      },
      logger,
    });

    expect(result).toEqual({ id: 'generated-query-id' });
    expect(kiClient.upsertQuery).toHaveBeenCalledWith(
      definition,
      expect.objectContaining({
        id: 'generated-query-id',
      })
    );
  });

  it('rejects an over-broad multi-word full-text predicate', async () => {
    const kiClient = {
      upsertQuery: vi.fn().mockResolvedValue(undefined),
    };

    await expect(
      createQueryKnowledgeIndicatorToolHandler({
        kiClient: kiClient as never,
        definition: definition as never,
        queryInput: {
          title: 'Over-broad',
          description: 'ORed terms',
          esql: { query: 'FROM logs.test, logs.test.* | WHERE message : "request failed"' },
        },
        logger,
      })
    ).rejects.toThrow('MATCH_PHRASE');

    expect(kiClient.upsertQuery).not.toHaveBeenCalled();
  });

  it('throws when query upsert fails', async () => {
    const kiClient = {
      upsertQuery: vi.fn().mockRejectedValue(new Error('upsert failed')),
    };

    await expect(
      createQueryKnowledgeIndicatorToolHandler({
        kiClient: kiClient as never,
        definition: definition as never,
        queryInput: {
          title: 'Suspicious query',
          description: 'Find suspicious events',
          esql: { query: 'FROM logs.test, logs.test.*' },
        },
        logger,
      })
    ).rejects.toThrow('upsert failed');

    expect(logger.debug).toHaveBeenCalled();
    expect(logger.info).not.toHaveBeenCalled();
  });
});
