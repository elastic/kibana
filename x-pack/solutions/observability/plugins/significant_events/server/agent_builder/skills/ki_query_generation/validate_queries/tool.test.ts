/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { Streams } from '@kbn/streams-schema';
import {
  createQueryValidationContext,
  validateKIQueries,
  type ValidatedKIQuery,
} from '@kbn/nightshift-ai';
import type { GetScopedClients, RouteHandlerScopedClients } from '../../../../routes/types';
import { createMockToolContext, invokeHandler } from '../../../utils/test_helpers';
import { createValidateQueriesTool } from './tool';

jest.mock('@kbn/nightshift-ai', () => ({
  ...jest.requireActual('@kbn/nightshift-ai'),
  createQueryValidationContext: jest.fn(),
  validateKIQueries: jest.fn(),
}));

const createQueryValidationContextMock = createQueryValidationContext as jest.MockedFunction<
  typeof createQueryValidationContext
>;
const validateKIQueriesMock = validateKIQueries as jest.MockedFunction<typeof validateKIQueries>;

describe('ki_queries_validate tool', () => {
  const logger = loggingSystemMock.createLogger();
  const stream: Streams.QueryStream.Definition = {
    name: 'logs.test',
    description: 'Test logs',
    type: 'query',
    updated_at: new Date().toISOString(),
    query: {
      view: '$.logs.test',
      esql: 'FROM $.logs.test',
    },
  };
  const streamDataEsClient = { esql: { query: jest.fn() } };
  const getStream = jest.fn().mockResolvedValue(stream);
  const getFeatures = jest.fn();
  const getStreamToQueryLinksMap = jest.fn();
  const getScopedClients = jest.fn(async () => {
    return {
      streamsClient: { getStream },
      getKnowledgeIndicatorClient: jest.fn().mockResolvedValue({
        getFeatures,
        getStreamToQueryLinksMap,
      }),
      streamDataEsClient,
      tuningConfig: { query_validation_timeout_ms: 12_000 },
    } as unknown as RouteHandlerScopedClients;
  }) as unknown as jest.MockedFunction<GetScopedClients>;

  const candidate = {
    esql: 'FROM logs | WHERE message:"failure"',
    title: 'Failures',
    description: 'Detects failures',
    category: 'error' as const,
    severity_score: 60,
    feature_ids: ['feature-1'],
  };

  const acceptedQuery: ValidatedKIQuery = {
    type: 'match',
    esql: 'FROM logs.test | WHERE message:"failure"',
    title: 'Failures',
    description: 'Detects failures',
    category: 'error',
    severity_score: 60,
    features: [{ id: 'feature-1', run_id: 'run-1' }],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    getFeatures.mockResolvedValue({
      hits: [{ id: 'feature-1', run_id: 'run-1', type: 'entity' }],
    });
    getStreamToQueryLinksMap.mockResolvedValue({
      'logs.test': [
        {
          query: {
            id: 'existing-1',
            type: 'match',
            title: 'Existing',
            description: 'Existing query',
            severity_score: 40,
            esql: { query: 'FROM logs.test | WHERE message:"existing"' },
          },
        },
      ],
    });
    createQueryValidationContextMock.mockResolvedValue({
      targetSources: ['logs.test'],
      validationLookback: 'now-10m',
      conflictingFields: new Set(),
      normalizedStoredEsqls: new Set(),
    });
    validateKIQueriesMock.mockResolvedValue({
      results: [{ query: candidate, valid: true, status: 'Added' }],
      acceptedQueries: [acceptedQuery],
      hasIntentFailures: false,
      hasNonIntentFailures: false,
    });
  });

  const createTool = () =>
    createValidateQueriesTool({
      getScopedClients,
      logger,
    });

  it('bounds its input', () => {
    const tool = createTool();
    if (!('schema' in tool)) {
      throw new Error('Expected a schema-backed tool registration');
    }

    expect(tool.schema.safeParse({ target_id: 'logs.test', queries: [candidate] }).success).toBe(
      true
    );
    expect(tool.schema.safeParse({ target_id: 'logs.test', queries: [] }).success).toBe(false);
  });

  it('resolves an analysis target, queries KI state, and returns validated results', async () => {
    const result = await invokeHandler(
      createTool(),
      { target_id: 'logs.test', queries: [candidate] },
      createMockToolContext()
    );
    if (!('results' in result)) {
      throw new Error('Expected a standard tool result');
    }

    expect(getStream).toHaveBeenCalledWith('logs.test');
    expect(getFeatures).toHaveBeenCalledWith('logs.test', {
      id: ['feature-1'],
      excludedType: ['log_samples'],
    });
    expect(createQueryValidationContextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        sources: ['$.logs.test'],
        esClient: streamDataEsClient,
        existingQueries: [
          expect.objectContaining({
            id: 'existing-1',
            esql: 'FROM logs.test | WHERE message:"existing"',
          }),
        ],
      })
    );
    expect(validateKIQueriesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        queries: [candidate],
        features: [{ id: 'feature-1', run_id: 'run-1', type: 'entity' }],
        esClient: streamDataEsClient,
        queryValidationTimeoutMs: 12_000,
      })
    );
    expect(result.results).toEqual([
      {
        type: 'other',
        data: {
          queries: [{ query: candidate, valid: true, status: 'Added' }],
          accepted_queries: [
            {
              type: 'match',
              esql: { query: 'FROM logs.test | WHERE message:"failure"' },
              title: 'Failures',
              description: 'Detects failures',
              severity_score: 60,
              features: [{ id: 'feature-1', run_id: 'run-1' }],
            },
          ],
        },
      },
    ]);
  });

  it('returns an Agent Builder error result when state loading fails', async () => {
    getFeatures.mockRejectedValueOnce(new Error('KI storage unavailable'));

    const result = await invokeHandler(
      createTool(),
      { target_id: 'logs.test', queries: [candidate] },
      createMockToolContext()
    );
    if (!('results' in result)) {
      throw new Error('Expected a standard tool result');
    }

    expect(result.results).toEqual([
      { type: 'error', data: { message: 'KI storage unavailable' } },
    ]);
  });
});
