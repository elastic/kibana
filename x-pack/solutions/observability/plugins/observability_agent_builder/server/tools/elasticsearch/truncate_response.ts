/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseMessageLike } from '@langchain/core/messages';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { createUserMessage } from '@kbn/agent-builder-genai-utils/langchain';

const TRUNCATION_CONFIG = {
  TIER_1_MAX: 2000,
  TIER_2_MAX: 10000,
  TIER_2_BUDGET: 6000,
  MAX_DEPTH: 5,
  MAX_STRING_LENGTH: 500,
  /** Mechanically trim before sending to the LLM to stay within context limits. */
  TIER_3_PRE_TRIM_BUDGET: 15000,
  TIER_3_SUMMARY_BUDGET: 4000,
} as const;

const estimateSize = (value: unknown): number => JSON.stringify(value).length;

const describeValue = (value: unknown): string => {
  if (value === null) return 'null';
  if (Array.isArray(value)) return `<array: ${value.length} items>`;
  if (typeof value === 'object') return `<object: ${Object.keys(value).length} keys>`;
  return `<${typeof value}>`;
};

const truncateString = (str: string): string => {
  if (str.length <= TRUNCATION_CONFIG.MAX_STRING_LENGTH) return str;
  return str.slice(0, TRUNCATION_CONFIG.MAX_STRING_LENGTH) + '...[truncated]';
};

/**
 * Tier 2: Proportional budget truncation.
 */
const truncateWithBudget = (
  value: unknown,
  budget: number,
  depth: number = 0
): { value: unknown; size: number } => {
  if (value == null) return { value, size: 4 };

  // Beyond max depth, replace with a placeholder before type dispatch
  if (depth >= TRUNCATION_CONFIG.MAX_DEPTH && typeof value === 'object') {
    const placeholder = describeValue(value);
    return { value: placeholder, size: placeholder.length };
  }

  if (typeof value === 'string') {
    const truncated = truncateString(value);
    return { value: truncated, size: truncated.length };
  }

  if (typeof value !== 'object') {
    return { value, size: JSON.stringify(value).length };
  }

  if (Array.isArray(value)) {
    return truncateArray(value, budget, depth);
  }

  return truncateObject(value as Record<string, unknown>, budget, depth);
};

const truncateArray = (
  arr: unknown[],
  budget: number,
  depth: number
): { value: unknown; size: number } => {
  if (arr.length === 0) return { value: [], size: 2 };

  const result: unknown[] = [];
  let usedSize = 0;
  const perItemBudget = Math.max(Math.floor((budget - 2) / arr.length), 50);

  for (let i = 0; i < arr.length; i++) {
    if (usedSize >= budget) {
      const remaining = arr.length - i;
      if (remaining > 0) {
        result.push({
          _truncation_info: {
            type: 'array',
            shown: result.length,
            total: arr.length,
            remaining,
          },
        });
      }
      break;
    }

    const { value: processedItem, size: itemSize } = truncateWithBudget(
      arr[i],
      perItemBudget,
      depth + 1
    );
    result.push(processedItem);
    usedSize += itemSize;
  }

  return { value: result, size: usedSize };
};

const truncateObject = (
  obj: Record<string, unknown>,
  budget: number,
  depth: number
): { value: unknown; size: number } => {
  const entries = Object.entries(obj);
  if (entries.length === 0) return { value: {}, size: 2 };

  // Calculate each key's weight for proportional allocation
  const keyWeights = entries.map(([key, val]) => ({
    key,
    val,
    weight: estimateSize(val),
  }));
  const totalWeight = keyWeights.reduce((sum, kw) => sum + kw.weight, 0);

  const result: Record<string, unknown> = {};
  let usedSize = 0;
  let fieldsProcessed = 0;

  for (const { key, val, weight } of keyWeights) {
    if (usedSize >= budget) {
      const remainingFields = entries.length - fieldsProcessed;
      if (remainingFields > 0) {
        result._truncation_info = {
          type: 'object',
          fields_shown: fieldsProcessed,
          fields_total: entries.length,
          fields_remaining: remainingFields,
        };
      }
      break;
    }

    // Proportional allocation: this key gets its fair share of the remaining budget
    const proportion = totalWeight > 0 ? weight / totalWeight : 1 / entries.length;
    const keyBudget = Math.max(Math.floor(budget * proportion), 50);

    const { value: processedVal, size: valSize } = truncateWithBudget(val, keyBudget, depth + 1);
    result[key] = processedVal;
    usedSize += key.length + valSize;
    fieldsProcessed++;
  }

  return { value: result, size: usedSize };
};

const summarySchema = {
  type: 'object',
  description: 'Use this tool to provide the summarized Elasticsearch response.',
  properties: {
    summary: {
      type: 'object',
      description: 'The summarized Elasticsearch response as structured data',
      properties: {},
      additionalProperties: true,
    },
  },
  required: ['summary'],
};

const buildSummarizationPrompt = (serializedResponse: string): BaseMessageLike[] => [
  [
    'system',
    `You are a data summarization assistant. Your ONLY purpose is to summarize Elasticsearch API responses into compact structured JSON.

You MUST call the 'summarize_response' tool to provide the summary. Do NOT respond with plain text or any other conversational language.

Rules:
- Preserve all key metrics, counts, status fields, and error information.
- Include representative data points (1-2 examples) for large collections.
- Indicate totals and counts where arrays/objects were condensed.
- Keep the output under ${TRUNCATION_CONFIG.TIER_3_SUMMARY_BUDGET} characters.`,
  ],
  createUserMessage(`Summarize the following Elasticsearch API response:\n\n${serializedResponse}`),
];

/**
 * Tier 3: LLM-based summarization for very large responses.
 */
const summarizeWithLlm = async (
  obj: unknown,
  chatModel: BaseChatModel
): Promise<{ _summarized: true; summary: unknown }> => {
  // Pre-trim to avoid sending an enormous payload to the LLM
  const { value: preTrimmed } = truncateWithBudget(obj, TRUNCATION_CONFIG.TIER_3_PRE_TRIM_BUDGET);
  const serialized = JSON.stringify(preTrimmed);
  const prompt = buildSummarizationPrompt(serialized);

  const structuredModel = chatModel.withStructuredOutput(summarySchema, {
    name: 'summarize_response',
  });
  const { summary } = await structuredModel.invoke(prompt);

  return { _summarized: true, summary };
};

/**
 * Truncates a JSON response using a tiered strategy based on response size:
 *
 * - Tier 1: Pass through unchanged
 * - Tier 2: Proportional budget truncation with depth limits
 * - Tier 3: LLM summarization
 */
export const truncateJsonResponse = async (
  obj: unknown,
  chatModel: BaseChatModel
): Promise<unknown> => {
  const totalSize = estimateSize(obj);

  // Tier 1: small responses pass through unchanged
  if (totalSize <= TRUNCATION_CONFIG.TIER_1_MAX) {
    return obj;
  }

  // Tier 3: large responses get LLM summarization
  if (totalSize > TRUNCATION_CONFIG.TIER_2_MAX && chatModel) {
    return summarizeWithLlm(obj, chatModel);
  }

  // Tier 2: medium responses get proportional truncation
  const { value } = truncateWithBudget(obj, TRUNCATION_CONFIG.TIER_2_BUDGET);
  return value;
};
