/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { DeeplyMockedKeys } from '@kbn/utility-types-jest';
import { ChatFunctionClient } from '@kbn/observability-ai-assistant-plugin/server/service/chat_function_client';
import { registerExecuteQueryFunction } from '.';
import { EXECUTE_QUERY_FUNCTION_NAME } from '@kbn/observability-ai-assistant-plugin/server';

describe('executeQuery function', () => {
  const currentUserEsClientMock: DeeplyMockedKeys<ElasticsearchClient> = {
    search: vi.fn(),
    fieldCaps: vi.fn(),
    esql: {
      query: () => Promise.resolve({ columns: [], values: [] }),
    },
  } as any;

  const consoleOrPassThrough = () => {};

  const loggerMock: DeeplyMockedKeys<Logger> = {
    log: vi.fn().mockImplementation(consoleOrPassThrough),
    error: vi.fn().mockImplementation(consoleOrPassThrough),
    debug: vi.fn().mockImplementation(consoleOrPassThrough),
    trace: vi.fn().mockImplementation(consoleOrPassThrough),
    isLevelEnabled: vi.fn().mockReturnValue(true),
  } as any;

  let result: any;
  const timeoutError = new Error('Request timed out');
  beforeEach(async () => {
    vi.clearAllMocks();
    const functionClient = new ChatFunctionClient([]);

    // mock the esql query to throw a timeout error
    currentUserEsClientMock.esql.query = vi.fn().mockImplementation(() => {
      const error = timeoutError;
      error.name = 'TimeoutError';
      throw error;
    });

    registerExecuteQueryFunction({
      functions: functionClient,
      resources: {
        context: {
          // @ts-expect-error Type mismatch is expected in test mocks
          core: Promise.resolve({
            elasticsearch: { client: { asCurrentUser: currentUserEsClientMock } },
          }),
        },
      },
      signal: new AbortController().signal,
    });

    result = await functionClient.executeFunction({
      chat: vi.fn(),
      name: EXECUTE_QUERY_FUNCTION_NAME,
      args: JSON.stringify({ query: 'FROM logs-* | LIMIT 10' }),
      messages: [],
      signal: new AbortController().signal,
      logger: loggerMock,
      connectorId: 'foo',
      simulateFunctionCalling: false,
    });
  });

  it('return an error message when the execute_query function throws a timeout', () => {
    expect(result).toEqual({
      content: {
        message: 'The query failed to execute',
        error: timeoutError,
        errorMessages: undefined,
      },
    });
  });
});
