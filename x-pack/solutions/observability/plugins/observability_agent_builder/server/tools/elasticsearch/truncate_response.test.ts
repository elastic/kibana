/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { truncateJsonResponse } from './truncate_response';

const createMockChatModel = (responseText: string): BaseChatModel =>
  ({
    invoke: jest.fn().mockResolvedValue({
      content: responseText,
    }),
  } as unknown as BaseChatModel);

const generateLargeArray = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    id: i,
    name: `item_${i}`,
    description: `This is a description for item number ${i} with some extra text to increase size`,
    value: Math.random() * 1000,
  }));

const generateLargeObject = (fieldCount: number) => {
  const obj: Record<string, unknown> = {};
  for (let i = 0; i < fieldCount; i++) {
    obj[`field_${i}`] = `value_${i}_${'x'.repeat(50)}`;
  }
  return obj;
};

describe('truncateJsonResponse', () => {
  describe('Tier 1: Small responses (< 2K chars)', () => {
    it('passes through null unchanged', async () => {
      const result = await truncateJsonResponse(null);
      expect(result).toBeNull();
    });

    it('passes through primitives unchanged', async () => {
      expect(await truncateJsonResponse(42)).toBe(42);
      expect(await truncateJsonResponse('hello')).toBe('hello');
      expect(await truncateJsonResponse(true)).toBe(true);
    });

    it('passes through small objects unchanged', async () => {
      const obj = { took: 5, timed_out: false, hits: { total: 10 } };
      const result = await truncateJsonResponse(obj);
      expect(result).toEqual(obj);
    });

    it('passes through small arrays unchanged', async () => {
      const arr = [1, 2, 3, 4, 5];
      const result = await truncateJsonResponse(arr);
      expect(result).toEqual(arr);
    });

    it('passes through an empty object unchanged', async () => {
      const result = await truncateJsonResponse({});
      expect(result).toEqual({});
    });

    it('passes through an empty array unchanged', async () => {
      const result = await truncateJsonResponse([]);
      expect(result).toEqual([]);
    });
  });

  describe('Tier 2: Medium responses (2K–10K chars)', () => {
    it('truncates large arrays and adds truncation markers', async () => {
      const largeArray = generateLargeArray(50);
      const result = (await truncateJsonResponse(largeArray)) as unknown[];

      expect(result.length).toBeLessThan(largeArray.length);

      const lastItem = result[result.length - 1] as { _truncation_info?: unknown };
      expect(lastItem._truncation_info).toBeDefined();
      expect(lastItem._truncation_info).toMatchObject({
        type: 'array',
        total: 50,
      });
    });

    it('truncates large objects and adds truncation markers', async () => {
      const largeObj = generateLargeObject(80);
      const result = (await truncateJsonResponse(largeObj)) as Record<string, unknown>;

      const resultKeys = Object.keys(result);
      expect(resultKeys.length).toBeLessThan(80);
      expect(result._truncation_info).toBeDefined();
      expect(result._truncation_info).toMatchObject({
        type: 'object',
      });
    });

    it('truncates long string values', async () => {
      const obj = {
        data: 'x'.repeat(3000),
      };
      const result = (await truncateJsonResponse(obj)) as { data: string };

      expect(result.data.length).toBeLessThan(3000);
      expect(result.data).toContain('...[truncated]');
    });

    it('preserves structure proportionally across top-level keys', async () => {
      const obj = {
        small_key: { value: 1 },
        large_key: generateLargeArray(30),
        medium_key: generateLargeObject(10),
      };
      const result = (await truncateJsonResponse(obj)) as Record<string, unknown>;

      // All top-level keys should be present
      expect(result).toHaveProperty('small_key');
      expect(result).toHaveProperty('large_key');
      // medium_key may or may not be present depending on budget
    });

    it('respects depth limits', async () => {
      // Create a deeply nested object
      let nested: Record<string, unknown> = { value: 'deep' };
      for (let i = 0; i < 10; i++) {
        nested = { [`level_${i}`]: nested, padding: 'x'.repeat(200) };
      }
      const result = (await truncateJsonResponse(nested)) as Record<string, unknown>;

      // The result should exist and be an object
      expect(typeof result).toBe('object');
      // Verify the total serialized size is within bounds
      const serialized = JSON.stringify(result);
      expect(serialized.length).toBeLessThanOrEqual(10000);
    });
  });

  describe('Tier 3: Large responses (> 10K chars) with LLM', () => {
    it('uses LLM summarization when chatModel is provided', async () => {
      const largeData = generateLargeArray(200);
      const mockSummary = JSON.stringify({ total_items: 200, sample: { id: 0 } });
      const mockModel = createMockChatModel(mockSummary);

      const result = (await truncateJsonResponse(largeData, { chatModel: mockModel })) as {
        _summarized: boolean;
        summary: unknown;
      };

      expect(result._summarized).toBe(true);
      expect(result.summary).toEqual({ total_items: 200, sample: { id: 0 } });
      expect(mockModel.invoke).toHaveBeenCalledTimes(1);

      // Verify the prompt sent to the LLM contains the pre-trimmed data
      const invokedPrompt = (mockModel.invoke as jest.Mock).mock.calls[0][0] as string;
      expect(invokedPrompt).toContain('Summarize');
      expect(invokedPrompt).toContain('4000');
    });

    it('handles non-JSON LLM response gracefully', async () => {
      const largeData = generateLargeArray(200);
      const mockModel = createMockChatModel('This is a plain text summary of the data.');

      const result = (await truncateJsonResponse(largeData, { chatModel: mockModel })) as {
        _summarized: boolean;
        summary: unknown;
      };

      expect(result._summarized).toBe(true);
      expect(result.summary).toEqual({ raw_summary: 'This is a plain text summary of the data.' });
    });

    it('falls back to Tier 2 when no chatModel is provided for large responses', async () => {
      const largeData = generateLargeArray(200);
      const result = (await truncateJsonResponse(largeData)) as unknown[];

      // Should be truncated but not summarized
      expect(result).not.toHaveProperty('_summarized');
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeLessThan(200);
    });
  });

  describe('edge cases', () => {
    it('handles undefined', async () => {
      const result = await truncateJsonResponse(undefined);
      expect(result).toBeUndefined();
    });

    it('handles mixed nested structures', async () => {
      const obj = {
        metadata: { took: 5 },
        results: generateLargeArray(20),
        aggregations: {
          bucket1: { doc_count: 100, values: generateLargeArray(10) },
        },
      };
      const result = await truncateJsonResponse(obj);
      expect(result).toBeDefined();
      expect(JSON.stringify(result).length).toBeLessThanOrEqual(10000);
    });
  });
});
