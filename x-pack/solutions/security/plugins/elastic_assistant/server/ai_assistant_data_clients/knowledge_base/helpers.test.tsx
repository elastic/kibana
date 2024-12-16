/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { DynamicStructuredTool } from '@langchain/core/tools';
import {
  isModelAlreadyExistsError,
  getKBVectorSearchQuery,
  getStructuredToolForIndexEntry,
} from './helpers';
import { authenticatedUser } from '../../__mocks__/user';
import { getCreateKnowledgeBaseEntrySchemaMock } from '../../__mocks__/knowledge_base_entry_schema.mock';
import { IndexEntry } from '@kbn/elastic-assistant-common';

// Mock dependencies
jest.mock('@elastic/elasticsearch');
jest.mock('@kbn/zod', () => ({
  z: {
    string: jest.fn().mockReturnValue({ describe: (str: string) => str }),
    number: jest.fn().mockReturnValue({ describe: (str: string) => str }),
    boolean: jest.fn().mockReturnValue({ describe: (str: string) => str }),
    object: jest.fn().mockReturnValue({ describe: (str: string) => str }),
    any: jest.fn().mockReturnValue({ describe: (str: string) => str }),
  },
}));
jest.mock('lodash');

describe('isModelAlreadyExistsError', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('should return true if error is resource_not_found_exception', () => {
    const error = new errors.ResponseError({
      meta: {
        name: 'error',
        context: 'error',
        request: {
          params: { method: 'post', path: '/' },
          options: {},
          id: 'error',
        },
        connection: null,
        attempts: 0,
        aborted: false,
      },
      warnings: null,
      body: { error: { type: 'resource_not_found_exception' } },
    });
    // @ts-ignore
    error.body = {
      error: {
        type: 'resource_not_found_exception',
      },
    };
    expect(isModelAlreadyExistsError(error)).toBe(true);
  });

  it('should return true if error is status_exception', () => {
    const error = new errors.ResponseError({
      meta: {
        name: 'error',
        context: 'error',
        request: {
          params: { method: 'post', path: '/' },
          options: {},
          id: 'error',
        },
        connection: null,
        attempts: 0,
        aborted: false,
      },
      warnings: null,
      body: { error: { type: 'status_exception' } },
    });
    // @ts-ignore
    error.body = {
      error: {
        type: 'status_exception',
      },
    };
    expect(isModelAlreadyExistsError(error)).toBe(true);
  });

  it('should return false for other error types', () => {
    const error = new Error('Some other error');
    expect(isModelAlreadyExistsError(error)).toBe(false);
  });
});

describe('getKBVectorSearchQuery', () => {
  const mockUser = authenticatedUser;

  it('should construct a query with no filters if none are provided', () => {
    const query = getKBVectorSearchQuery({ user: mockUser });
    expect(query).toEqual({
      bool: {
        must: [],
        should: expect.any(Array),
        filter: undefined,
        minimum_should_match: 1,
      },
    });
  });

  it('should include kbResource in the query if provided', () => {
    const query = getKBVectorSearchQuery({ user: mockUser, kbResource: 'esql' });
    expect(query?.bool?.must).toEqual(
      expect.arrayContaining([
        {
          term: { kb_resource: 'esql' },
        },
      ])
    );
  });

  it('should include required filter in the query if required is true', () => {
    const query = getKBVectorSearchQuery({ user: mockUser, required: true });
    expect(query?.bool?.must).toEqual(
      expect.arrayContaining([
        {
          term: { required: true },
        },
      ])
    );
  });

  it('should add semantic text filter if query is provided', () => {
    const query = getKBVectorSearchQuery({ user: mockUser, query: 'example' });
    expect(query?.bool?.must).toEqual(
      expect.arrayContaining([
        {
          semantic: {
            field: 'semantic_text',
            query: 'example',
          },
        },
      ])
    );
  });
});

describe('getStructuredToolForIndexEntry', () => {
  const mockLogger = {
    debug: jest.fn(),
    error: jest.fn(),
  } as unknown as Logger;

  const mockEsClient = {} as ElasticsearchClient;

  const mockIndexEntry = getCreateKnowledgeBaseEntrySchemaMock({ type: 'index' }) as IndexEntry;

  it('should return a DynamicStructuredTool with correct name and schema', () => {
    const tool = getStructuredToolForIndexEntry({
      indexEntry: mockIndexEntry,
      esClient: mockEsClient,
      logger: mockLogger,
      elserId: 'elser123',
    });

    expect(tool).toBeInstanceOf(DynamicStructuredTool);
    expect(tool.lc_kwargs).toEqual(
      expect.objectContaining({
        name: 'test',
        description: 'test',
        tags: ['knowledge-base'],
      })
    );
  });

  it('should execute func correctly and return expected results', async () => {
    const mockSearchResult = {
      hits: {
        hits: [
          {
            _source: {
              field1: 'value1',
              field2: 2,
            },
            inner_hits: {
              'test.test': {
                hits: {
                  hits: [
                    { _source: { text: 'Inner text 1' } },
                    { _source: { text: 'Inner text 2' } },
                  ],
                },
              },
            },
          },
        ],
      },
    };

    mockEsClient.search = jest.fn().mockResolvedValue(mockSearchResult);

    const tool = getStructuredToolForIndexEntry({
      indexEntry: mockIndexEntry,
      esClient: mockEsClient,
      logger: mockLogger,
      elserId: 'elser123',
    });

    const input = { query: 'testQuery', field1: 'value1', field2: 2 };
    const result = await tool.invoke(input, {});

    expect(result).toContain('Below are all relevant documents in JSON format');
    expect(result).toContain('"text":"Inner text 1\\n --- \\nInner text 2"');
  });

  it('should log an error and return error message on Elasticsearch error', async () => {
    const mockError = new Error('Elasticsearch error');
    mockEsClient.search = jest.fn().mockRejectedValue(mockError);

    const tool = getStructuredToolForIndexEntry({
      indexEntry: mockIndexEntry,
      esClient: mockEsClient,
      logger: mockLogger,
      elserId: 'elser123',
    });

    const input = { query: 'testQuery', field1: 'value1', field2: 2 };
    const result = await tool.invoke(input, {});

    expect(mockLogger.error).toHaveBeenCalledWith(
      `Error performing IndexEntry KB Similarity Search: ${mockError.message}`
    );
    expect(result).toContain(`I'm sorry, but I was unable to find any information`);
  });
});
