/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isContentFilterError } from '.';

describe('isContentFilterError', () => {
  it.each([
    'The model (claude-opus-5-5) refused to complete the response, so generation stopped without retrying. Details: The model refused to complete the response: The response was stopped by the provider content filter (finish_reason: content_filter).',
    'Generation workflow failed: THE MODEL REFUSED TO COMPLETE THE RESPONSE: refused',
    'stopped (finish_reason: content_filter)',
  ])('returns true for %p', (message) => {
    expect(isContentFilterError(message)).toBe(true);
  });

  it.each([
    'Maximum generation attempts (10) reached. Try sending fewer alerts to this model.',
    "This model's maximum context length is 4097 tokens",
    'Step execution exceeded the configured timeout of 10m',
  ])('returns false for %p', (message) => {
    expect(isContentFilterError(message)).toBe(false);
  });
});
