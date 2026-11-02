/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { ContentFilteredModelResponseError, EmptyModelResponseError } from '@kbn/langchain/server';
import { getEmptyModelResponseError } from '../../../lib/langchain/output_chunking/nodes/helpers/empty_model_response';
import { throwContentFilteredErrorWithGuidance, throwIfErrorCountsExceeded } from '.';

const mockLogger = {
  debug: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
} as unknown as Logger;

const defaultParams = {
  errors: [],
  generationAttempts: 0,
  hallucinationFailures: 0,
  logger: mockLogger,
  maxGenerationAttempts: 10,
  maxHallucinationFailures: 5,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('throwIfErrorCountsExceeded', () => {
  describe('when counts are under thresholds', () => {
    it('does NOT throw when generationAttempts is below maxGenerationAttempts', () => {
      expect(() =>
        throwIfErrorCountsExceeded({
          ...defaultParams,
          generationAttempts: 9,
          maxGenerationAttempts: 10,
        })
      ).not.toThrow();
    });

    it('does NOT throw when hallucinationFailures is below maxHallucinationFailures', () => {
      expect(() =>
        throwIfErrorCountsExceeded({
          ...defaultParams,
          hallucinationFailures: 4,
          maxHallucinationFailures: 5,
        })
      ).not.toThrow();
    });

    it('does NOT throw when both counts are zero', () => {
      expect(() => throwIfErrorCountsExceeded(defaultParams)).not.toThrow();
    });
  });

  describe('when hallucinationFailures reaches the threshold', () => {
    it('throws when hallucinationFailures equals maxHallucinationFailures', () => {
      expect(() =>
        throwIfErrorCountsExceeded({
          ...defaultParams,
          hallucinationFailures: 5,
          maxHallucinationFailures: 5,
        })
      ).toThrow();
    });

    it('throws when hallucinationFailures exceeds maxHallucinationFailures', () => {
      expect(() =>
        throwIfErrorCountsExceeded({
          ...defaultParams,
          hallucinationFailures: 6,
          maxHallucinationFailures: 5,
        })
      ).toThrow();
    });

    it('includes the hallucination failure count in the error message', () => {
      expect(() =>
        throwIfErrorCountsExceeded({
          ...defaultParams,
          hallucinationFailures: 5,
          maxHallucinationFailures: 5,
        })
      ).toThrow(/5/);
    });

    it('includes accumulated errors in the thrown message', () => {
      expect(() =>
        throwIfErrorCountsExceeded({
          ...defaultParams,
          errors: ['error one', 'error two'],
          hallucinationFailures: 5,
          maxHallucinationFailures: 5,
        })
      ).toThrow(/error one/);
    });

    it('logs the error via logger.error', () => {
      try {
        throwIfErrorCountsExceeded({
          ...defaultParams,
          hallucinationFailures: 5,
          maxHallucinationFailures: 5,
        });
      } catch (_) {
        // expected
      }

      expect(mockLogger.error).toHaveBeenCalledTimes(1);
    });
  });

  describe('when generationAttempts reaches the threshold', () => {
    it('throws when generationAttempts equals maxGenerationAttempts', () => {
      expect(() =>
        throwIfErrorCountsExceeded({
          ...defaultParams,
          generationAttempts: 10,
          maxGenerationAttempts: 10,
        })
      ).toThrow();
    });

    it('throws when generationAttempts exceeds maxGenerationAttempts', () => {
      expect(() =>
        throwIfErrorCountsExceeded({
          ...defaultParams,
          generationAttempts: 11,
          maxGenerationAttempts: 10,
        })
      ).toThrow();
    });

    it('includes the generation attempt count in the error message', () => {
      expect(() =>
        throwIfErrorCountsExceeded({
          ...defaultParams,
          generationAttempts: 10,
          maxGenerationAttempts: 10,
        })
      ).toThrow(/10/);
    });

    it('includes accumulated errors in the thrown message', () => {
      expect(() =>
        throwIfErrorCountsExceeded({
          ...defaultParams,
          errors: ['parse error', 'timeout error'],
          generationAttempts: 10,
          maxGenerationAttempts: 10,
        })
      ).toThrow(/parse error/);
    });

    it('logs the error via logger.error', () => {
      try {
        throwIfErrorCountsExceeded({
          ...defaultParams,
          generationAttempts: 10,
          maxGenerationAttempts: 10,
        });
      } catch (_) {
        // expected
      }

      expect(mockLogger.error).toHaveBeenCalledTimes(1);
    });
  });

  describe('hallucinationFailures check takes precedence over generationAttempts', () => {
    it('throws the hallucination error when both thresholds are exceeded', () => {
      expect(() =>
        throwIfErrorCountsExceeded({
          ...defaultParams,
          generationAttempts: 10,
          hallucinationFailures: 5,
          maxGenerationAttempts: 10,
          maxHallucinationFailures: 5,
        })
      ).toThrow(/hallucination/i);
    });
  });

  describe('when the errors are empty model responses', () => {
    const emptyModelResponseError = getEmptyModelResponseError({
      cause: new EmptyModelResponseError({
        completionTokens: 0,
        connectorId: 'test-connector-id',
        contentLength: 0,
        model: 'test-model',
        promptTokens: 128390,
        responseBody: '',
      }),
      generationAttempts: 9,
      llmType: 'inference',
      nodeName: 'generate',
    });

    const getMessage = () => {
      try {
        throwIfErrorCountsExceeded({
          ...defaultParams,
          errors: [emptyModelResponseError],
          generationAttempts: 10,
          maxGenerationAttempts: 10,
        });
      } catch (error) {
        return (error as Error).message;
      }

      throw new Error('expected throwIfErrorCountsExceeded to throw');
    };

    it('does NOT tell the user to send fewer alerts', () => {
      expect(getMessage()).not.toContain('Try sending fewer alerts');
    });

    it('names the empty model response as the cause', () => {
      expect(getMessage()).toContain('The model returned an empty response');
      expect(getMessage()).toContain('will not help');
    });

    it('keeps the connector, model and token counts in the thrown message', () => {
      const message = getMessage();

      expect(message).toContain('test-connector-id');
      expect(message).toContain('test-model');
      expect(message).toContain('prompt tokens: 128390');
    });

    it('keeps the existing remedy when the errors are not empty model responses', () => {
      expect(() =>
        throwIfErrorCountsExceeded({
          ...defaultParams,
          errors: ['generate node is unable to parse (fake) response from attempt 9'],
          generationAttempts: 10,
          maxGenerationAttempts: 10,
        })
      ).toThrow(/Try sending fewer alerts/);
    });
  });

  describe('when no logger is provided', () => {
    it('does not throw when calling without a logger and counts are under threshold', () => {
      expect(() =>
        throwIfErrorCountsExceeded({
          errors: [],
          generationAttempts: 0,
          hallucinationFailures: 0,
          maxGenerationAttempts: 10,
          maxHallucinationFailures: 5,
        })
      ).not.toThrow();
    });

    it('still throws when hallucinationFailures threshold is exceeded without a logger', () => {
      expect(() =>
        throwIfErrorCountsExceeded({
          errors: [],
          generationAttempts: 0,
          hallucinationFailures: 5,
          maxGenerationAttempts: 10,
          maxHallucinationFailures: 5,
        })
      ).toThrow();
    });
  });
});

describe('throwContentFilteredErrorWithGuidance', () => {
  const contentFiltered = new ContentFilteredModelResponseError({
    connectorId: 'connector-1',
    contentLength: 0,
    responseBody: '',
    model: 'gpt-x',
  });

  it('names the provider and model and suggests a different model', () => {
    let thrown: unknown;
    try {
      throwContentFilteredErrorWithGuidance({
        error: contentFiltered,
        logger: mockLogger,
        model: 'gpt-x',
        provider: 'openai',
      });
    } catch (e) {
      thrown = e;
    }

    const { message } = thrown as Error;
    expect(message).toContain('openai');
    expect(message).toContain('gpt-x');
    expect(message).toContain('content filter');
    expect(message).toContain('Select a different model');
  });

  it('does NOT advise sending fewer alerts', () => {
    let message = '';
    try {
      throwContentFilteredErrorWithGuidance({ error: contentFiltered, provider: 'openai' });
    } catch (e) {
      message = (e as Error).message;
    }

    expect(message).not.toMatch(/send(ing)? fewer alerts(?! to this model is unlikely)/i);
    expect(message).toContain('unlikely to help');
  });

  it('rethrows any other error untouched', () => {
    const other = new Error('Failed to generate a valid response');

    expect(() =>
      throwContentFilteredErrorWithGuidance({ error: other, provider: 'openai' })
    ).toThrow(other);
  });
});
