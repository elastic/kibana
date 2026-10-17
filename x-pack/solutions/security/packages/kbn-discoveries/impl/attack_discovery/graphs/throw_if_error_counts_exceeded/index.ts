/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { Logger } from '@kbn/core/server';

import { isEmptyModelResponseError } from '../../../lib/langchain/output_chunking/nodes/helpers/empty_model_response';

export const EMPTY_MODEL_RESPONSE_REMEDY_NOTE =
  'The model returned an empty response (no content, 0 completion tokens) for these attempts, so sending fewer alerts to this model will not help: this is a model or connector problem, not a prompt-size problem. Check the connector and model used for Attack Discovery; their ids and the prompt/completion token counts are in the errors below.';

export const MAX_HALLUCINATION_FAILURES = (hallucinationFailures: number) =>
  i18n.translate(
    'xpack.discoveries.attackDiscovery.graphs.throwIfErrorCountsExceeded.maxHallucinationFailuresErrorMessage',
    {
      defaultMessage:
        'Maximum hallucination failures ({hallucinationFailures}) reached. Try sending fewer alerts to this model.',
      values: { hallucinationFailures },
    }
  );

export const MAX_GENERATION_ATTEMPTS = (generationAttempts: number) =>
  i18n.translate(
    'xpack.discoveries.attackDiscovery.graphs.throwIfErrorCountsExceeded.maxGenerationAttemptsErrorMessage',
    {
      defaultMessage:
        'Maximum generation attempts ({generationAttempts}) reached. Try sending fewer alerts to this model.',
      values: { generationAttempts },
    }
  );

export const MAX_GENERATION_ATTEMPTS_WITH_EMPTY_MODEL_RESPONSE = (generationAttempts: number) =>
  i18n.translate(
    'xpack.discoveries.attackDiscovery.graphs.throwIfErrorCountsExceeded.maxGenerationAttemptsWithEmptyModelResponseErrorMessage',
    {
      defaultMessage: `Maximum generation attempts ({generationAttempts}) reached. ${EMPTY_MODEL_RESPONSE_REMEDY_NOTE}`,
      values: { generationAttempts },
    }
  );

export const throwIfErrorCountsExceeded = ({
  errors,
  generationAttempts,
  hallucinationFailures,
  logger,
  maxGenerationAttempts,
  maxHallucinationFailures,
}: {
  errors: string[];
  generationAttempts: number;
  hallucinationFailures: number;
  logger?: Logger;
  maxGenerationAttempts: number;
  maxHallucinationFailures: number;
}): void => {
  if (hallucinationFailures >= maxHallucinationFailures) {
    const hallucinationFailuresError = `${MAX_HALLUCINATION_FAILURES(
      hallucinationFailures
    )}\n${errors.join(',\n')}`;

    logger?.error(hallucinationFailuresError);
    throw new Error(hallucinationFailuresError);
  }

  if (generationAttempts >= maxGenerationAttempts) {
    // An empty model response is a model/connector failure: report that instead of the "send fewer
    // alerts" advice, which provably cannot help (see getEmptyModelResponseError):
    const hasEmptyModelResponseErrors = errors.some(isEmptyModelResponseError);

    const generationAttemptsError = `${
      hasEmptyModelResponseErrors
        ? MAX_GENERATION_ATTEMPTS_WITH_EMPTY_MODEL_RESPONSE(generationAttempts)
        : MAX_GENERATION_ATTEMPTS(generationAttempts)
    }\n${errors.join(',\n')}`;

    logger?.error(generationAttemptsError);
    throw new Error(generationAttemptsError);
  }
};
