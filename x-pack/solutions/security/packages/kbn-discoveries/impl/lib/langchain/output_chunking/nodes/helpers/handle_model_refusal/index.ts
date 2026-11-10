/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import type { ModelRefusalError } from '@kbn/langchain/server';
import { isModelRefusalError } from '@kbn/langchain/server';

import type { BaseGraphState, GraphInsightTypes } from '../../../../../types';

export const getModelRefusalErrorMessage = (error: ModelRefusalError): string =>
  i18n.translate('xpack.discoveries.langchain.outputChunking.modelRefusalErrorMessage', {
    defaultMessage:
      'The model ({model}) refused to complete the response, so generation stopped without retrying. Sending fewer alerts or events will not help, and retrying is unlikely to; choose a different model or connector. Details: {details}',
    values: {
      details: error.message,
      model: error.model ?? error.connectorId,
    },
  });

/**
 * Ends generation on a model refusal (for example a `content_filter` finish) instead of retrying
 * the same prompt: the generate and refine nodes both stop on the first refusal. Returns without
 * doing anything for any other error, so callers keep their usual handling.
 */
export const handleModelRefusal = <T extends GraphInsightTypes>({
  error,
  logger,
  nodeName,
  state,
}: {
  error: unknown;
  logger?: Logger;
  nodeName: 'generate' | 'refine';
  state: BaseGraphState<T>;
}): void => {
  if (!isModelRefusalError(error)) {
    return;
  }

  const message = getModelRefusalErrorMessage(error);

  // the provider's own refusal text is model output, so it's kept out of the message and logged at debug only:
  logger?.debug(() => `${nodeName} node refusal text: ${error.refusal}`);
  logger?.warn(
    `${nodeName} node received a model refusal on attempt ${state.generationAttempts} (connector: ${error.connectorId}); ${message}`
  );

  throw new Error(message);
};
