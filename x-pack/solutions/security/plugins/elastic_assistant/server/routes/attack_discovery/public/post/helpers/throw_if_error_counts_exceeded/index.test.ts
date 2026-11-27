/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EMPTY_MODEL_RESPONSE_ERROR_MESSAGE_PREFIX } from '@kbn/langchain/server';

import { throwIfErrorCountsExceeded } from '.';

const emptyResponseError = `generate node is unable to parse (fake) response from attempt 1; (this may be an incomplete response from the model): ${EMPTY_MODEL_RESPONSE_ERROR_MESSAGE_PREFIX} (connector my-connector)`;
const truncatedResponseError = 'generate node is unable to parse (fake) response from attempt 2';

const defaultParams = {
  errors: [] as string[],
  generationAttempts: 0,
  hallucinationFailures: 0,
  maxGenerationAttempts: 10,
  maxHallucinationFailures: 5,
};

const getThrownMessage = (params: Parameters<typeof throwIfErrorCountsExceeded>[0]): string => {
  try {
    throwIfErrorCountsExceeded(params);
  } catch (error) {
    return (error as Error).message;
  }

  return '';
};

describe('throwIfErrorCountsExceeded', () => {
  it('does not throw when neither limit is reached', () => {
    expect(() =>
      throwIfErrorCountsExceeded({ ...defaultParams, errors: [emptyResponseError] })
    ).not.toThrow();
  });

  it('throws the hallucination message when the hallucination limit is reached', () => {
    const message = getThrownMessage({ ...defaultParams, hallucinationFailures: 5 });

    expect(message).toContain('Maximum hallucination failures (5) reached');
  });

  it('reports a model or connector problem when every error is an empty model response', () => {
    const message = getThrownMessage({
      ...defaultParams,
      errors: [emptyResponseError, emptyResponseError],
      generationAttempts: 10,
    });

    expect(message).toContain('will not help');
    expect(message).not.toContain('Try sending fewer alerts');
    expect(message).toContain(emptyResponseError);
    expect(message).toContain(
      'when available, the connector, model and token counts are in the errors below'
    );
  });

  it('keeps the existing remedy when only some of the errors are empty model responses', () => {
    const message = getThrownMessage({
      ...defaultParams,
      errors: [emptyResponseError, truncatedResponseError],
      generationAttempts: 10,
    });

    expect(message).toContain('Try sending fewer alerts');
    expect(message).not.toContain('will not help');
  });

  it('keeps the existing remedy when the attempt limit is hit with no recorded errors', () => {
    const message = getThrownMessage({ ...defaultParams, errors: [], generationAttempts: 10 });

    expect(message).toContain('Try sending fewer alerts');
    expect(message).not.toContain('will not help');
  });
});
