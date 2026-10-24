/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SourceWriteConflictReason } from '@kbn/significant-events-schema';
import { getFormattedError, getWorkflowFailureMessage } from './errors';

const SERVER_MESSAGE = 'Source knowledge is being updated; retry after the current write finishes';

const conflictResponse = (data: unknown) => ({
  body: {
    statusCode: 409,
    error: 'Conflict',
    message: SERVER_MESSAGE,
    attributes: { data },
  },
});

describe('getFormattedError', () => {
  it.each<[SourceWriteConflictReason, string]>([
    ['lease_held', 'This source is being updated. Try again in a few seconds.'],
    [
      'reconcile_pending',
      'This source is still applying a change to its query. Try again in a few seconds.',
    ],
    ['source_disabled', 'This source is disabled. Enable it to change its knowledge indicators.'],
    ['stale_revision', 'This source changed since the page was loaded. Refresh and try again.'],
  ])('shows a specific message for a %s conflict', (reason, expectedMessage) => {
    expect(getFormattedError(conflictResponse({ reason })).message).toBe(expectedMessage);
  });

  it('falls back to the server message for an unknown conflict reason', () => {
    expect(getFormattedError(conflictResponse({ reason: 'something_else' })).message).toBe(
      SERVER_MESSAGE
    );
  });
});

describe('getWorkflowFailureMessage', () => {
  it('unwraps the API message from a failed workflow HTTP step and keeps anything else as is', () => {
    expect(
      getWorkflowFailureMessage(
        'HTTP 400: {"statusCode":400,"error":"Bad Request","message":"No index yet.","attributes":{"data":null}}'
      )
    ).toBe('No index yet.');
    expect(getWorkflowFailureMessage('HTTP 502: Bad Gateway')).toBe('HTTP 502: Bad Gateway');
    expect(getWorkflowFailureMessage('Workflow onboarding timed out')).toBe(
      'Workflow onboarding timed out'
    );
  });
});
