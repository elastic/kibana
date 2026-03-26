/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseDataStream } from './api';
import { MessageRole } from '../types';

interface MockChunk {
  type: string;
  data?: unknown[];
  delta?: string;
  id?: string;
  errorText?: string;
}

// Helper to create a mock reader that yields chunks in sequence
function createMockReader(chunks: MockChunk[]): ReadableStreamDefaultReader<Uint8Array> {
  let index = 0;
  const encoder = new TextEncoder();

  return {
    read: jest.fn().mockImplementation(async () => {
      if (index >= chunks.length) {
        return { done: true, value: undefined };
      }
      const chunk = chunks[index];
      index += 1;
      const sseData = `data: ${JSON.stringify(chunk)}\n\n`;
      return { done: false, value: encoder.encode(sseData) };
    }),
    releaseLock: jest.fn(),
    cancel: jest.fn(),
    closed: Promise.resolve(undefined),
  } as unknown as ReadableStreamDefaultReader<Uint8Array>;
}

describe('parseDataStream', () => {
  const mockDate = new Date('2024-01-01T00:00:00.000Z');
  const mockId = 'test-id';

  describe('annotations handling', () => {
    it('should preserve annotations received before text-start chunk', async () => {
      // This test verifies the fix for the NaN token count bug.
      // In AI SDK v5, annotations are sent BEFORE text-start, so they must persist.
      const chunks: MockChunk[] = [
        // Annotations come first (AI SDK v5 behavior)
        {
          type: 'data-message_annotations',
          data: [
            { type: 'context_token_count', count: 100 },
            { type: 'prompt_token_count', count: 200 },
          ],
        },
        // Then text-start arrives
        { type: 'text-start' },
        // Then text content streams in
        { type: 'text-delta', delta: 'Hello' },
        { type: 'text-delta', delta: ' world' },
      ];

      const reader = createMockReader(chunks);
      const updateMock = jest.fn();
      const handleFailureMock = jest.fn();

      const result = await parseDataStream({
        reader,
        update: updateMock,
        handleFailure: handleFailureMock,
        generateId: () => mockId,
        getCurrentDate: () => mockDate,
      });

      // Verify the final message has annotations attached
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].annotations).toBeDefined();
      expect(result.messages[0].annotations).toEqual([
        { type: 'context_token_count', count: 100 },
        { type: 'prompt_token_count', count: 200 },
      ]);
      expect(result.messages[0].content).toBe('Hello world');
      expect(result.messages[0].role).toBe(MessageRole.assistant);
    });

    it('should accumulate multiple annotation chunks', async () => {
      const chunks: MockChunk[] = [
        {
          type: 'data-message_annotations',
          data: [{ type: 'context_token_count', count: 100 }],
        },
        {
          type: 'data-message_annotations',
          data: [{ type: 'prompt_token_count', count: 200 }],
        },
        { type: 'text-start' },
        { type: 'text-delta', delta: 'Response' },
      ];

      const reader = createMockReader(chunks);
      const updateMock = jest.fn();
      const handleFailureMock = jest.fn();

      const result = await parseDataStream({
        reader,
        update: updateMock,
        handleFailure: handleFailureMock,
        generateId: () => mockId,
        getCurrentDate: () => mockDate,
      });

      expect(result.messages[0].annotations).toHaveLength(2);
      expect(result.messages[0].annotations).toContainEqual({
        type: 'context_token_count',
        count: 100,
      });
      expect(result.messages[0].annotations).toContainEqual({
        type: 'prompt_token_count',
        count: 200,
      });
    });

    it('should handle annotations with retrieved docs and citations', async () => {
      const mockDoc = {
        metadata: { _id: 'doc1', _index: 'test-index', _score: 1 },
        pageContent: 'Test content',
      };

      const chunks: MockChunk[] = [
        {
          type: 'data-message_annotations',
          data: [{ type: 'retrieved_docs', documents: [mockDoc] }],
        },
        {
          type: 'data-message_annotations',
          data: [{ type: 'context_token_count', count: 50 }],
        },
        { type: 'text-start' },
        { type: 'text-delta', delta: 'Based on the documents...' },
        {
          type: 'data-message_annotations',
          data: [{ type: 'citations', documents: [mockDoc] }],
        },
      ];

      const reader = createMockReader(chunks);
      const updateMock = jest.fn();
      const handleFailureMock = jest.fn();

      const result = await parseDataStream({
        reader,
        update: updateMock,
        handleFailure: handleFailureMock,
        generateId: () => mockId,
        getCurrentDate: () => mockDate,
      });

      expect(result.messages[0].annotations).toHaveLength(3);
      expect(result.messages[0].annotations).toContainEqual({
        type: 'retrieved_docs',
        documents: [mockDoc],
      });
      expect(result.messages[0].annotations).toContainEqual({
        type: 'context_token_count',
        count: 50,
      });
      expect(result.messages[0].annotations).toContainEqual({
        type: 'citations',
        documents: [mockDoc],
      });
    });
  });

  describe('text streaming', () => {
    it('should correctly assemble text from multiple delta chunks', async () => {
      const chunks: MockChunk[] = [
        { type: 'text-start' },
        { type: 'text-delta', delta: 'The ' },
        { type: 'text-delta', delta: 'quick ' },
        { type: 'text-delta', delta: 'brown ' },
        { type: 'text-delta', delta: 'fox' },
      ];

      const reader = createMockReader(chunks);
      const updateMock = jest.fn();
      const handleFailureMock = jest.fn();

      const result = await parseDataStream({
        reader,
        update: updateMock,
        handleFailure: handleFailureMock,
        generateId: () => mockId,
        getCurrentDate: () => mockDate,
      });

      expect(result.messages[0].content).toBe('The quick brown fox');
    });

    it('should call update callback for each chunk', async () => {
      const chunks: MockChunk[] = [
        { type: 'text-start' },
        { type: 'text-delta', delta: 'A' },
        { type: 'text-delta', delta: 'B' },
        { type: 'text-delta', delta: 'C' },
      ];

      const reader = createMockReader(chunks);
      const updateMock = jest.fn();
      const handleFailureMock = jest.fn();

      await parseDataStream({
        reader,
        update: updateMock,
        handleFailure: handleFailureMock,
        generateId: () => mockId,
        getCurrentDate: () => mockDate,
      });

      // Update should be called for each text-delta chunk
      expect(updateMock).toHaveBeenCalledTimes(3);
      // Last call should have the complete message
      const lastCall = updateMock.mock.calls[2][0];
      expect(lastCall[0].content).toBe('ABC');
    });
  });

  describe('error handling', () => {
    it('should call handleFailure on error chunk', async () => {
      const chunks: MockChunk[] = [
        { type: 'text-start' },
        { type: 'text-delta', delta: 'Starting...' },
        { type: 'error', errorText: 'Something went wrong' },
      ];

      const reader = createMockReader(chunks);
      const updateMock = jest.fn();
      const handleFailureMock = jest.fn();

      await parseDataStream({
        reader,
        update: updateMock,
        handleFailure: handleFailureMock,
        generateId: () => mockId,
        getCurrentDate: () => mockDate,
      });

      expect(handleFailureMock).toHaveBeenCalledWith('Something went wrong');
    });
  });
});
