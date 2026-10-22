/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getWorkflowFailureMessage } from './errors';

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
