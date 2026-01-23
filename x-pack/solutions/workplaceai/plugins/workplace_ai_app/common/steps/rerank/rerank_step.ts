/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';

/**
 * Step type ID for the rerank workflow step
 */
export const RerankStepTypeId = 'search.rerank';

/**
 * Default values for rerank step parameters
 */
export const RERANK_DEFAULT_RANK_WINDOW_SIZE = 100;
export const RERANK_DEFAULT_MAX_INPUT_FIELD_LENGTH = 1000;
export const RERANK_DEFAULT_MAX_INPUT_TOTAL_LENGTH = 2000;

/**
 * Input schema for the rerank step
 */
const RerankInputSchema = z.object({
  rerank_text: z.string().describe('Text to rerank documents against'),
  data: z.array(z.any()).describe('Array of documents to rerank'),
  fields: z
    .array(z.array(z.string()))
    .optional()
    .describe(
      'Optional field paths to extract from each document for reranking. E.g., [["title"], ["content"], ["user", "name"]] extracts item.title, item.content, and item.user.name'
    ),
  rank_window_size: z
    .number()
    .default(RERANK_DEFAULT_RANK_WINDOW_SIZE)
    .describe(
      `Number of documents from the start of the input array to send for reranking. Limits inference API costs by only reranking the top N documents. Remaining documents are appended to output in their input order. Defaults to ${RERANK_DEFAULT_RANK_WINDOW_SIZE}.`
    ),
  max_input_field_length: z
    .number()
    .default(RERANK_DEFAULT_MAX_INPUT_FIELD_LENGTH)
    .describe(
      `Maximum character length per individual field when extracting fields from documents. Prevents any single field from dominating the text sent to rerank. Defaults to ${RERANK_DEFAULT_MAX_INPUT_FIELD_LENGTH} characters.`
    ),
  max_input_total_length: z
    .number()
    .default(RERANK_DEFAULT_MAX_INPUT_TOTAL_LENGTH)
    .describe(
      `Maximum character length for the total text sent per document to the rerank endpoint. Applied after field extraction and concatenation. Prevents exceeding model token limits. Defaults to ${RERANK_DEFAULT_MAX_INPUT_TOTAL_LENGTH} characters.`
    ),
});

/**
 * Config schema for the rerank step
 * Defines step-level configuration that controls execution behavior
 */
const RerankConfigSchema = z.object({
  inference_id: z
    .string()
    .optional()
    .describe(
      'Rerank inference endpoint ID. If not provided, automatically selects an available rerank endpoint from Elasticsearch, prioritizing Elastic-hosted models over self-hosted Elasticsearch models.'
    ),
});

const RerankOutputSchema = z
  .array(z.any())
  .describe('Array of reranked documents in descending relevance order');

export type RerankInput = z.infer<typeof RerankInputSchema>;
export type RerankConfig = z.infer<typeof RerankConfigSchema>;
export type RerankOutput = z.infer<typeof RerankOutputSchema>;

/**
 * Common step definition for rerank step
 * Shared between server and public implementations
 */
export const rerankStepCommonDefinition: CommonStepDefinition<
  typeof RerankInputSchema,
  typeof RerankOutputSchema,
  typeof RerankConfigSchema
> = {
  id: RerankStepTypeId,
  inputSchema: RerankInputSchema,
  configSchema: RerankConfigSchema,
  outputSchema: RerankOutputSchema,
};
