/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const getIssuePath = (path: unknown): string =>
  Array.isArray(path) && path.length > 0 ? path.map(String).join('.') : '(root)';

/**
 * Summarizes a failure to parse or validate a model response without reproducing any of it.
 *
 * `JSON.parse` errors quote a snippet of the input and schema validation errors can quote
 * model-chosen keys and values. The summary keeps only the error class, the JSON position and the
 * schema issue codes and paths, so it is safe to persist and to send to telemetry.
 */
export const getParseErrorSummary = (error: unknown): string => {
  if (error instanceof SyntaxError) {
    const position = /at position (\d+)/.exec(error.message)?.[1];

    return `SyntaxError: the response is not valid JSON${
      position != null ? ` (at position ${position})` : ''
    }`;
  }

  const issues = (error as { issues?: unknown } | null)?.issues;

  if (Array.isArray(issues)) {
    const summary = issues
      .map(
        (issue: { code?: unknown; path?: unknown }) =>
          `${String(issue?.code ?? 'invalid')} at ${getIssuePath(issue?.path)}`
      )
      .join('; ');

    return `the response does not match the expected schema (${summary})`;
  }

  return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
};
