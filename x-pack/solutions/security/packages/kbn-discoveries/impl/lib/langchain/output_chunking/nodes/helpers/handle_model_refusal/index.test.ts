/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttackDiscovery } from '@kbn/elastic-assistant-common';
import { ModelRefusalError } from '@kbn/langchain/server';
import { loggerMock } from '@kbn/logging-mocks';

import type { AttackDiscoveryGraphState } from '../../../../../types';
import { getModelRefusalErrorMessage, handleModelRefusal } from '.';

const refusalError = new ModelRefusalError({
  connectorId: '.anthropic-claude-5.5-opus-chat_completion',
  partialContentLength: 0,
  refusal:
    'The response was stopped by the provider content filter (finish_reason: content_filter).',
});

const state = {
  errors: ['earlier error'],
  generationAttempts: 2,
  insights: null,
  unrefinedResults: [{ title: 'unrefined' }] as AttackDiscovery[],
} as unknown as AttackDiscoveryGraphState;

describe('handleModelRefusal', () => {
  const logger = loggerMock.create();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does nothing for an error that is not a model refusal', () => {
    expect(() =>
      handleModelRefusal({
        error: new SyntaxError('Unexpected end of JSON input'),
        logger,
        nodeName: 'generate',
        state,
      })
    ).not.toThrow();
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('throws the refusal message from the generate node, so generation is not retried', () => {
    expect(() =>
      handleModelRefusal({ error: refusalError, logger, nodeName: 'generate', state })
    ).toThrow(getModelRefusalErrorMessage(refusalError));
  });

  it('throws from the refine node even when unrefined results exist', () => {
    expect(() =>
      handleModelRefusal({ error: refusalError, logger, nodeName: 'refine', state })
    ).toThrow(getModelRefusalErrorMessage(refusalError));
  });

  it('logs one warning that names the node, attempt, and connector', () => {
    expect(() =>
      handleModelRefusal({ error: refusalError, logger, nodeName: 'refine', state })
    ).toThrow();

    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining(
        'refine node received a model refusal on attempt 2 (connector: .anthropic-claude-5.5-opus-chat_completion)'
      )
    );
  });
});

describe('getModelRefusalErrorMessage', () => {
  it('says the content filter stopped the response and that sending fewer alerts will not help', () => {
    const message = getModelRefusalErrorMessage(refusalError);

    expect(message).toContain('content filter (finish_reason: content_filter)');
    expect(message).toContain(
      'Sending fewer alerts or events will not help, and retrying is unlikely to'
    );
    expect(message).toContain('.anthropic-claude-5.5-opus-chat_completion');
  });

  it('names the model when it is known', () => {
    const message = getModelRefusalErrorMessage(
      new ModelRefusalError({
        connectorId: 'connector-1',
        model: 'claude-opus-5-5',
        partialContentLength: 0,
        refusal: 'refused',
      })
    );

    expect(message).toContain('The model (claude-opus-5-5)');
  });
});
