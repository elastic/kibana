/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType, type ToolResult } from '@kbn/agent-builder-common/tools/tool_result';

export interface BridgedToolResponse {
  results: Array<{ type: string; data: unknown }>;
  count: number;
  error?: string;
  // Required by the inference ToolResponse's Record<string, unknown> constraint.
  [key: string]: unknown;
}

export const formatToolResults = (results: ToolResult[] | undefined): BridgedToolResponse => {
  const list = results ?? [];
  const errors = list
    .filter((result) => result.type === ToolResultType.error)
    .map((result) => (result.data as { message?: string })?.message ?? 'Unknown tool error');

  const data = list
    .filter((result) => result.type !== ToolResultType.error)
    .map((result) => ({ type: result.type, data: result.data }));

  return {
    results: data,
    count: data.length,
    ...(errors.length > 0 ? { error: errors.join('; ') } : {}),
  };
};
