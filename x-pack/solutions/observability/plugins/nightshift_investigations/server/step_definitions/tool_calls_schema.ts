/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazySchema, z } from '@kbn/zod/v4';

const MAX_TOOL_CALLS = 2_000;

const buildToolCallSchema = () =>
  z
    .object({
      tool_id: z.string().max(512).optional(),
      tool_call_id: z.string().max(512).optional(),
      params: z.record(z.string(), z.unknown()).optional(),
    })
    .passthrough();

const buildToolResultSchema = () =>
  z
    .object({
      tool_id: z.string().max(512).optional(),
      tool_call_id: z.string().max(512),
      results: z.array(z.unknown()).max(MAX_TOOL_CALLS),
    })
    .passthrough();

const parseJsonArray = (value: unknown): unknown => {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as unknown;
    } catch {
      return [];
    }
  }
  return value;
};

/** Tool calls a post-execution hook passes for a completed round, as an array or its JSON string. */
export const toolCallsSchema = lazySchema(() =>
  z.preprocess(parseJsonArray, z.array(buildToolCallSchema()).max(MAX_TOOL_CALLS).optional())
);

/** Tool call results a post-execution hook passes for a completed round, keyed by `tool_call_id`. */
export const toolResultsSchema = lazySchema(() =>
  z.preprocess(parseJsonArray, z.array(buildToolResultSchema()).max(MAX_TOOL_CALLS).optional())
);
