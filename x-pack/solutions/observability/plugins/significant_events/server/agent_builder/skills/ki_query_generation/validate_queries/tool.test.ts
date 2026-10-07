/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import {
  createQueryValidationContext,
  validateKIQueries,
  type ValidatedKIQuery,
} from '@kbn/nightshift-ai';
import type { GetScopedClients, RouteHandlerScopedClients } from '../../../../routes/types';
import {
  createMockToolContext,
  createSignificantEventsServer,
  invokeHandler,
  mockSourcesClient,
} from '../../../utils/test_helpers';
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
  const streamDataEsClient = { esql: { query: jest.fn() } };
  const getFeatures = jest.fn();
  const getSourceToQueryLinksMap = jest.fn();
  const getScopedClients = jest.fn(async () => {
    return {
      sourcesClient: mockSourcesClient(['logs.test']),
      getKnowledgeIndicatorClient: jest.fn().mockResolvedValue({
        getFeatures,
        getSourceToQueryLinksMap,
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
    expects_matches: true,
    feature_ids: ['feature-1'],
  };

  const acceptedQuery: ValidatedKIQuery = {
    type: 'match',
    esql: 'FROM logs.test | WHERE message:"failure"',
    title: 'Failures',
    description: 'Detects failures',
    category: 'error',
    severity_score: 60,
    expects_matches: true,
    features: [{ id: 'feature-1', run_id: 'run-1' }],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    getFeatures.mockResolvedValue({
      hits: [{ id: 'feature-1', run_id: 'run-1', type: 'entity' }],
    });
    getSourceToQueryLinksMap.mockResolvedValue({
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
      server: createSignificantEventsServer({ featurePrivilege: 'read' }),
      logger,
    });

  it('bounds its input and keeps evaluation intent optional', () => {
    const tool = createTool();
    if (!('schema' in tool)) {
      throw new Error('Expected a schema-backed tool registration');
    }

    const { expects_matches: _expectsMatches, ...withoutIntent } = candidate;
    expect(tool.schema.safeParse({ slug: 'logs.test', queries: [candidate] }).success).toBe(true);
    expect(tool.schema.safeParse({ slug: 'logs.test', queries: [withoutIntent] }).success).toBe(
      true
    );
    expect(tool.schema.safeParse({ slug: 'logs.test', queries: [] }).success).toBe(true);
    expect(
      tool.schema.safeParse({ slug: 'logs.test', queries: Array(101).fill(candidate) }).success
    ).toBe(false);
  });

  it('resolves an analysis target, queries KI state, and returns validated results', async () => {
    const result = await invokeHandler(
      createTool(),
      { slug: 'logs.test', queries: [candidate] },
      createMockToolContext()
    );
    if (!('results' in result)) {
      throw new Error('Expected a standard tool result');
    }

    expect(getFeatures).toHaveBeenCalledWith('logs.test', {
      featureIds: ['feature-1'],
      excludedType: ['log_samples'],
    });
    expect(createQueryValidationContextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        sources: ['$.nightshift.sources.default.logs.test'],
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
    expect(validateKIQueriesMock.mock.calls[0][0]).not.toHaveProperty('requireQueryIntent');
    expect(validateKIQueriesMock.mock.calls[0][0]).toHaveProperty('collectQueryAttempts', true);
    expect(result.results).toEqual([
      {
        type: 'other',
        data: {
          slug: 'logs.test',
          title: 'logs.test',
          view_name: '$.nightshift.sources.default.logs.test',
          queries: [{ query: candidate, valid: true, status: 'Added' }],
          finalized: true,
          finalized_queries: [
            {
              type: 'match',
              esql: { query: 'FROM logs.test | WHERE message:"failure"' },
              title: 'Failures',
              description: 'Detects failures',
              category: 'error',
              severity_score: 60,
              expects_matches: true,
              features: [{ id: 'feature-1', run_id: 'run-1' }],
            },
          ],
        },
      },
    ]);
  });

  it('does not finalize a batch containing rejected queries', async () => {
    validateKIQueriesMock.mockResolvedValueOnce({
      results: [{ query: candidate, valid: false, status: 'Failed to add' }],
      acceptedQueries: [],
      hasIntentFailures: false,
      hasNonIntentFailures: true,
    });

    const result = await invokeHandler(
      createTool(),
      { slug: 'logs.test', queries: [candidate] },
      createMockToolContext()
    );
    if (!('results' in result)) {
      throw new Error('Expected a standard tool result');
    }

    expect(result.results).toEqual([
      {
        type: 'other',
        data: {
          slug: 'logs.test',
          title: 'logs.test',
          view_name: '$.nightshift.sources.default.logs.test',
          queries: [{ query: candidate, valid: false, status: 'Failed to add' }],
          finalized: false,
        },
      },
    ]);
  });

  it('finalizes an explicit empty batch with the resolved source and no KI reads', async () => {
    const result = await invokeHandler(
      createTool(),
      { slug: 'logs.test', queries: [] },
      createMockToolContext()
    );
    if (!('results' in result)) {
      throw new Error('Expected a standard tool result');
    }

    expect(getFeatures).not.toHaveBeenCalled();
    expect(getSourceToQueryLinksMap).not.toHaveBeenCalled();
    expect(result.results).toEqual([
      {
        type: 'other',
        data: {
          slug: 'logs.test',
          title: 'logs.test',
          view_name: '$.nightshift.sources.default.logs.test',
          queries: [],
          finalized: true,
          finalized_queries: [],
        },
      },
    ]);
  });

  it('rejects an empty batch for an unknown slug instead of finalizing it', async () => {
    const result = await invokeHandler(
      createTool(),
      { slug: 'logs.missing', queries: [] },
      createMockToolContext()
    );
    if (!('results' in result)) {
      throw new Error('Expected a standard tool result');
    }

    expect(result.results).toEqual([
      { type: 'error', data: { message: 'Source not found in this space: logs.missing' } },
    ]);
  });

  it('returns an Agent Builder error result when state loading fails', async () => {
    getFeatures.mockRejectedValueOnce(new Error('KI storage unavailable'));

    const result = await invokeHandler(
      createTool(),
      { slug: 'logs.test', queries: [candidate] },
      createMockToolContext()
    );
    if (!('results' in result)) {
      throw new Error('Expected a standard tool result');
    }

    expect(result.results).toEqual([
      { type: 'error', data: { message: 'KI storage unavailable' } },
    ]);
  });

  it('does not validate queries without the Nightshift read privilege', async () => {
    const tool = createValidateQueriesTool({
      getScopedClients,
      server: createSignificantEventsServer({ featurePrivilege: 'none' }),
      logger,
    });

    const result = await invokeHandler(
      tool,
      { slug: 'logs.test', queries: [] },
      createMockToolContext()
    );

    expect(result).toMatchObject({ results: [{ type: 'error' }] });
  });
});
