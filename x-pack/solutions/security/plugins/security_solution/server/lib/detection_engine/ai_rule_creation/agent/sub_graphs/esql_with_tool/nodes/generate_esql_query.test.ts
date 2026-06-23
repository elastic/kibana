/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { generateEsqlQueryNode } from './generate_esql_query';
import { loggerMock } from '@kbn/logging-mocks';
import type { RuleCreationState } from '../../../state';

jest.mock('@kbn/agent-builder-genai-utils', () => ({
  generateEsql: jest.fn(),
}));

import { generateEsql } from '@kbn/agent-builder-genai-utils';

const generateEsqlMock = generateEsql as jest.MockedFunction<typeof generateEsql>;

const mockLogger = loggerMock.create();

const createMockInference = () =>
  ({
    getClient: jest.fn().mockReturnValue({
      getConnectorById: jest.fn().mockResolvedValue({ id: 'test-connector' }),
    }),
  } as any);

const createMockEvents = () => ({
  reportProgress: jest.fn(),
  sendUiEvent: jest.fn(),
});

const baseState: RuleCreationState = {
  userQuery: 'detect suspicious process execution',
  rule: {},
  errors: [],
  warnings: [],
};

describe('generateEsqlQueryNode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('qualifier-based refusal', () => {
    it('should detect "using only" qualifier and add refusal instruction', async () => {
      const stateWithQualifier: RuleCreationState = {
        ...baseState,
        userQuery: 'detect DNS tunneling using only Okta logs',
      };

      generateEsqlMock.mockResolvedValueOnce({
        answer: 'ERROR: UNSUPPORTED_DETECTION — Okta logs do not contain DNS query data',
        query: undefined,
        error: undefined,
      } as any);

      const events = createMockEvents();
      const node = await generateEsqlQueryNode({
        model: {} as any,
        esClient: {} as any,
        connectorId: 'test',
        inference: createMockInference(),
        logger: mockLogger,
        request: {} as any,
        events,
      });

      const result = await node(stateWithQualifier);

      expect(result.errors).toEqual(
        expect.arrayContaining([expect.stringContaining('not supported by the available data')])
      );
      expect(result.rule?.query).toBeUndefined();
    });

    it('should propagate refusal before retry loop can override it', async () => {
      const stateWithQualifier: RuleCreationState = {
        ...baseState,
        userQuery: 'detect network intrusion using only Okta events',
      };

      generateEsqlMock.mockResolvedValueOnce({
        answer:
          'ERROR: UNSUPPORTED_DETECTION — Okta event logs do not contain network traffic data',
        query: undefined,
        error: undefined,
      } as any);

      const node = await generateEsqlQueryNode({
        model: {} as any,
        esClient: {} as any,
        connectorId: 'test',
        inference: createMockInference(),
        logger: mockLogger,
        request: {} as any,
      });

      const result = await node(stateWithQualifier);

      expect(result.errors?.[0]).toContain('UNSUPPORTED_DETECTION');
      // generateEsql should only be called once (no retry after refusal)
      expect(generateEsqlMock).toHaveBeenCalledTimes(1);
    });

    it('should not trigger refusal for queries without "using only"', async () => {
      generateEsqlMock.mockResolvedValueOnce({
        answer: 'some answer',
        query: 'FROM logs-* | WHERE process.name == "cmd.exe"',
        error: undefined,
      } as any);

      const node = await generateEsqlQueryNode({
        model: {} as any,
        esClient: {} as any,
        connectorId: 'test',
        inference: createMockInference(),
        logger: mockLogger,
        request: {} as any,
      });

      const result = await node(baseState);

      expect(result.errors).toEqual([]);
      expect(result.rule?.query).toBe('FROM logs-* | WHERE process.name == "cmd.exe"');
    });
  });

  describe('two-phase ES|QL generation', () => {
    it('should use first attempt result when query is valid', async () => {
      generateEsqlMock.mockResolvedValueOnce({
        answer: '',
        query: 'FROM logs-endpoint.events.* | WHERE process.name == "cmd.exe"',
        error: undefined,
      } as any);

      const node = await generateEsqlQueryNode({
        model: {} as any,
        esClient: {} as any,
        connectorId: 'test',
        inference: createMockInference(),
        logger: mockLogger,
        request: {} as any,
      });

      const result = await node(baseState);

      expect(result.rule?.query).toBe(
        'FROM logs-endpoint.events.* | WHERE process.name == "cmd.exe"'
      );
      expect(generateEsqlMock).toHaveBeenCalledTimes(1);
      expect(generateEsqlMock).toHaveBeenCalledWith(
        expect.objectContaining({ maxRetries: 0 })
      );
    });

    it('should retry with maxRetries=3 when first attempt fails without refusal', async () => {
      generateEsqlMock
        .mockResolvedValueOnce({
          answer: '',
          query: undefined,
          error: 'syntax error',
        } as any)
        .mockResolvedValueOnce({
          answer: '',
          query: 'FROM logs-* | WHERE host.name == "server01"',
          error: undefined,
        } as any);

      const node = await generateEsqlQueryNode({
        model: {} as any,
        esClient: {} as any,
        connectorId: 'test',
        inference: createMockInference(),
        logger: mockLogger,
        request: {} as any,
      });

      const result = await node(baseState);

      expect(generateEsqlMock).toHaveBeenCalledTimes(2);
      expect(generateEsqlMock).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ maxRetries: 0 })
      );
      expect(generateEsqlMock).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ maxRetries: 3 })
      );
      expect(result.rule?.query).toBe('FROM logs-* | WHERE host.name == "server01"');
    });
  });

  describe('error handling', () => {
    it('should return error state when both attempts fail', async () => {
      generateEsqlMock
        .mockResolvedValueOnce({
          answer: '',
          query: undefined,
          error: 'syntax error',
        } as any)
        .mockResolvedValueOnce({
          answer: '',
          query: undefined,
          error: 'still broken',
        } as any);

      const events = createMockEvents();
      const node = await generateEsqlQueryNode({
        model: {} as any,
        esClient: {} as any,
        connectorId: 'test',
        inference: createMockInference(),
        logger: mockLogger,
        request: {} as any,
        events,
      });

      const result = await node(baseState);

      expect(result.errors).toEqual(
        expect.arrayContaining([expect.stringContaining('Failed to generate ES|QL query')])
      );
    });

    it('should return error state when query is empty', async () => {
      generateEsqlMock.mockResolvedValueOnce({
        answer: '',
        query: '',
        error: undefined,
      } as any);

      generateEsqlMock.mockResolvedValueOnce({
        answer: '',
        query: '',
        error: undefined,
      } as any);

      const node = await generateEsqlQueryNode({
        model: {} as any,
        esClient: {} as any,
        connectorId: 'test',
        inference: createMockInference(),
        logger: mockLogger,
        request: {} as any,
      });

      const result = await node(baseState);

      expect(result.errors).toEqual(
        expect.arrayContaining([expect.stringContaining('empty')])
      );
    });

    it('should catch and wrap thrown exceptions', async () => {
      generateEsqlMock.mockRejectedValueOnce(new Error('network failure'));

      const events = createMockEvents();
      const node = await generateEsqlQueryNode({
        model: {} as any,
        esClient: {} as any,
        connectorId: 'test',
        inference: createMockInference(),
        logger: mockLogger,
        request: {} as any,
        events,
      });

      const result = await node(baseState);

      expect(result.errors).toEqual(
        expect.arrayContaining([expect.stringContaining('network failure')])
      );
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('successful generation', () => {
    it('should set rule type and language to esql', async () => {
      generateEsqlMock.mockResolvedValueOnce({
        answer: '',
        query: 'FROM logs-* | WHERE event.action == "login"',
        error: undefined,
      } as any);

      const node = await generateEsqlQueryNode({
        model: {} as any,
        esClient: {} as any,
        connectorId: 'test',
        inference: createMockInference(),
        logger: mockLogger,
        request: {} as any,
      });

      const result = await node(baseState);

      expect(result.rule?.type).toBe('esql');
      expect(result.rule?.language).toBe('esql');
      expect(result.rule?.query).toBe('FROM logs-* | WHERE event.action == "login"');
    });
  });

  describe('event emitter fallback', () => {
    it('should work without events parameter', async () => {
      generateEsqlMock.mockResolvedValueOnce({
        answer: '',
        query: 'FROM logs-* | WHERE true',
        error: undefined,
      } as any);

      const node = await generateEsqlQueryNode({
        model: {} as any,
        esClient: {} as any,
        connectorId: 'test',
        inference: createMockInference(),
        logger: mockLogger,
        request: {} as any,
      });

      await expect(node(baseState)).resolves.not.toThrow();
    });
  });
});
