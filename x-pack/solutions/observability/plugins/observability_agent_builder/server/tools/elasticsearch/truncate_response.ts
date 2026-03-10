/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseChatModel } from '@langchain/core/language_models/chat_models';

const TRUNCATION_CONFIG = {
  /** Responses below this size are passed through unchanged (Tier 1) */
  TIER_1_MAX: 2000,
  /** Responses below this size use proportional budget truncation (Tier 2) */
  TIER_2_MAX: 10000,
  /** Target output budget for Tier 2 truncation */
  TIER_2_BUDGET: 6000,
  /** Max depth for recursive traversal before replacing with placeholders */
  MAX_DEPTH: 5,
  /** Max characters for individual string values */
  MAX_STRING_LENGTH: 500,
  /** Pre-trim budget before sending to LLM in Tier 3 */
  TIER_3_PRE_TRIM_BUDGET: 15000,
  /** Target output size for LLM summarization */
  TIER_3_SUMMARY_BUDGET: 4000,
} as const;

/**
 * Returns the JSON-serialized size of a value in characters.
 */
const estimateSize = (value: unknown): number => {
  return JSON.stringify(value)?.length ?? 0;
};

/**
 * Returns a type/size placeholder string for values that exceed the max depth.
 */
const describeValue = (value: unknown): string => {
  if (value === null) return 'null';
  if (Array.isArray(value)) return `<array: ${value.length} items>`;
  if (typeof value === 'object') return `<object: ${Object.keys(value).length} keys>`;
  return `<${typeof value}>`;
};

/**
 * Truncates a string value to MAX_STRING_LENGTH, appending an ellipsis indicator.
 */
const truncateString = (str: string): string => {
  if (str.length <= TRUNCATION_CONFIG.MAX_STRING_LENGTH) return str;
  return str.slice(0, TRUNCATION_CONFIG.MAX_STRING_LENGTH) + '...[truncated]';
};

/**
 * Tier 2: Proportional budget truncation.
 *
 * Allocates the budget proportionally across top-level keys based on their
 * serialized weight, then recursively trims each subtree within its allocation.
 */
const truncateWithBudget = (
  value: unknown,
  budget: number,
  depth: number = 0
): { value: unknown; size: number } => {
  if (value === null || value === undefined) {
    return { value, size: 4 };
  }

  if (typeof value === 'string') {
    const truncated = truncateString(value);
    return { value: truncated, size: truncated.length + 2 };
  }

  if (typeof value !== 'object') {
    const serialized = JSON.stringify(value);
    return { value, size: serialized.length };
  }

  // Beyond max depth, replace with a placeholder
  if (depth >= TRUNCATION_CONFIG.MAX_DEPTH) {
    const placeholder = describeValue(value);
    return { value: placeholder, size: placeholder.length + 2 };
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
  let usedSize = 2; // opening and closing brackets

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

    const itemBudget = Math.max(budget - usedSize, 50);
    const { value: processedItem, size: itemSize } = truncateWithBudget(
      arr[i],
      itemBudget,
      depth + 1
    );
    result.push(processedItem);
    usedSize += itemSize + 1; // +1 for comma
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
  let usedSize = 2; // braces
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
    usedSize += key.length + 3 + valSize; // key + quotes + colon + value
    fieldsProcessed++;
  }

  return { value: result, size: usedSize };
};

const LLM_SUMMARIZATION_PROMPT = `You are a data summarization assistant. Summarize the following Elasticsearch API response into a compact structured JSON.

Rules:
- Preserve all key metrics, counts, status fields, and error information.
- Include representative data points (1-2 examples) for large collections.
- Indicate totals and counts where arrays/objects were condensed.
- Output ONLY raw JSON. Do NOT wrap the output in markdown code fences, backticks, or any other formatting.
- Do NOT include any text before or after the JSON object.
- Keep the output under {budget} characters.

Response to summarize:
{response}`;

/**
 * Tier 3: LLM-based summarization for very large responses.
 *
 * Pre-trims the response mechanically (using Tier 2), then sends it to the LLM
 * for intelligent summarization that preserves semantic context.
 */
const summarizeWithLlm = async (
  obj: unknown,
  chatModel: BaseChatModel
): Promise<{ _summarized: true; summary: unknown }> => {
  // Pre-trim to avoid sending an enormous payload to the LLM
  const { value: preTrimmed } = truncateWithBudget(obj, TRUNCATION_CONFIG.TIER_3_PRE_TRIM_BUDGET);
  const serialized = JSON.stringify(preTrimmed);

  const prompt = LLM_SUMMARIZATION_PROMPT.replace(
    '{budget}',
    String(TRUNCATION_CONFIG.TIER_3_SUMMARY_BUDGET)
  ).replace('{response}', serialized);

  const response = await chatModel.invoke(prompt);
  const responseText =
    typeof response.content === 'string'
      ? response.content
      : (response.content as Array<{ type: string; text?: string }>)
          .filter((item) => item.type === 'text')
          .map((item) => item.text ?? '')
          .join('');

  try {
    return { _summarized: true, summary: JSON.parse(responseText) as Record<string, unknown> };
  } catch {
    return { _summarized: true, summary: { raw_summary: responseText } };
  }
};

/**
 * Truncates a JSON response using a tiered strategy based on response size:
 *
 * - Tier 1 (< 2K chars): Pass through unchanged
 * - Tier 2 (2K–10K chars): Proportional budget truncation with depth limits
 * - Tier 3 (> 10K chars): LLM summarization (falls back to Tier 2 if no model provided)
 */
export const truncateJsonResponse = async (
  obj: unknown,
  options?: { chatModel?: BaseChatModel }
): Promise<unknown> => {
  const totalSize = estimateSize(obj);

  // Tier 1: small responses pass through unchanged
  if (totalSize <= TRUNCATION_CONFIG.TIER_1_MAX) {
    return obj;
  }

  // Tier 3: large responses get LLM summarization
  if (totalSize > TRUNCATION_CONFIG.TIER_2_MAX && options?.chatModel) {
    return summarizeWithLlm(obj, options.chatModel);
  }

  // Tier 2: medium responses (or large responses without a model) get proportional truncation
  const budget =
    totalSize > TRUNCATION_CONFIG.TIER_2_MAX
      ? TRUNCATION_CONFIG.TIER_2_BUDGET
      : TRUNCATION_CONFIG.TIER_2_BUDGET;
  const { value } = truncateWithBudget(obj, budget);
  return value;
};
