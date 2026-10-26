/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const getBodyMessage = (body: unknown): string | undefined => {
  if (typeof body === 'string') {
    return body;
  }
  if (!isRecord(body)) {
    return;
  }

  return typeof body.message === 'string' ? body.message : undefined;
};

// The workflow engine reports a failed Kibana API step as `HTTP <status>: <response body>`.
const WORKFLOW_HTTP_FAILURE_REGEX = /^HTTP \d{3}: (.+)$/s;

/** Returns the API's own message from a workflow failure, or the failure as reported. */
export const getWorkflowFailureMessage = (failure: string): string => {
  const [, body] = failure.match(WORKFLOW_HTTP_FAILURE_REGEX) ?? [];
  if (body === undefined) {
    return failure;
  }
  try {
    return getBodyMessage(JSON.parse(body)) ?? failure;
  } catch {
    return failure;
  }
};

export const getFormattedError = (error: unknown): Error => {
  if (isRecord(error) && 'body' in error) {
    const message = getBodyMessage(error.body);
    if (message) {
      return new Error(message);
    }
  }

  if (error instanceof Error) {
    return error;
  }

  if (typeof error === 'string') {
    return new Error(error);
  }

  return new Error('Unknown error');
};
