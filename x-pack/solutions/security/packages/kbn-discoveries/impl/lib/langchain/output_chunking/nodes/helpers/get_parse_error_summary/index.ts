/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EMPTY_MODEL_RESPONSE_ERROR_MESSAGE_PREFIX,
  EmptyModelResponseError,
  MAX_SANITIZED_ERROR_MESSAGE_LENGTH,
  getEmptyModelResponseDiagnostics,
  isEmptyModelResponseError,
  safeToString,
  sanitizeErrorMessage,
} from '@kbn/langchain/server';

// a `z.record` / `z.map` schema would put model-chosen keys into this path
const getIssuePath = (path: unknown): string =>
  Array.isArray(path) && path.length > 0
    ? path.map((segment) => safeToString(segment)).join('.')
    : '(root)';

const JSON_POSITION_MARKER = ' in JSON at position';

// Connector errors can carry the upstream error body in `name` (`error.name = serviceMessage`), and
// that body can quote model output, so only a conventional class name is kept.
const ERROR_CLASS_NAME = /^[A-Za-z][A-Za-z0-9_]*(Error|Exception)$/;

/**
 * V8 `JSON.parse` messages either quote the input (`Unexpected token 'g', "gen0gen1" is not valid
 * JSON`) or end with ` in JSON at position N (line L column C)`. Keep the leading diagnostic and the
 * position; drop everything from the first quote.
 */
const getSyntaxErrorSummary = (error: SyntaxError): string => {
  const message = typeof error.message === 'string' ? error.message : '';
  const position = /at position (\d+)/.exec(message)?.[1];
  const cutAt = [message.indexOf('"'), message.indexOf(JSON_POSITION_MARKER)]
    .filter((index) => index !== -1)
    .reduce((min, index) => Math.min(min, index), message.length);
  const reason = message
    .slice(0, cutAt)
    .replace(/^(Unexpected token)\b.*$/s, '$1') // the token, and any `...` before the cut quote, come from the input
    .trim()
    .replace(/[,:]+$/, '');

  return `SyntaxError: ${reason || 'the response is not valid JSON'}${
    position != null ? ` (at position ${position})` : ''
  }`;
};

/**
 * Summarizes a failure to parse or validate a model response without reproducing any of it.
 *
 * `JSON.parse` errors quote a snippet of the input, schema validation errors can quote model-chosen
 * keys and values, and transport errors such as `Failed to parse line "<SSE chunk>"` quote the raw
 * stream chunk. The summary keeps only the error class, the JSON position, the schema issue codes
 * and paths, and, for any other error, a conventional class name plus the message up to its first
 * quote, so it is safe to persist and to send to telemetry. A real `EmptyModelResponseError` is
 * summarized from its structured fields; an error that only carries its code or message prefix
 * gets no message text, because the sanitizer cannot tell upstream text from diagnostics.
 */
export const getParseErrorSummary = (error: unknown): string => {
  if (error instanceof SyntaxError) {
    return getSyntaxErrorSummary(error);
  }

  const issues = (error as { issues?: unknown } | null)?.issues;

  if (Array.isArray(issues)) {
    const summary = issues
      .map((issue: { code?: unknown; path?: unknown; expected?: unknown }) => {
        const expected = typeof issue?.expected === 'string' ? ` (expected ${issue.expected})` : '';

        return `${safeToString(issue?.code ?? 'invalid')} at ${getIssuePath(
          issue?.path
        )}${expected}`;
      })
      .join('; ');

    return `the response does not match the expected schema (${summary})`;
  }

  // an `Error` can carry a non-string `message`, which may hold model output: never read it as text
  const message = error instanceof Error && typeof error.message === 'string' ? error.message : '';

  if (error instanceof EmptyModelResponseError) {
    return getEmptyModelResponseDiagnostics(error);
  }

  if (error instanceof Error) {
    const code = (error as { code?: unknown }).code;
    const codeSuffix = typeof code === 'string' ? ` [${code}]` : '';
    const name =
      typeof error.name === 'string' && ERROR_CLASS_NAME.test(error.name) ? error.name : 'Error';
    const looksLikeEmptyResponse =
      isEmptyModelResponseError(error) ||
      message.startsWith(EMPTY_MODEL_RESPONSE_ERROR_MESSAGE_PREFIX);
    const detail = looksLikeEmptyResponse ? '' : `: ${sanitizeErrorMessage(message)}`;

    return `${name}${codeSuffix}${detail}`.slice(0, MAX_SANITIZED_ERROR_MESSAGE_LENGTH);
  }

  return safeToString(error).split('"')[0].trim().slice(0, MAX_SANITIZED_ERROR_MESSAGE_LENGTH);
};
