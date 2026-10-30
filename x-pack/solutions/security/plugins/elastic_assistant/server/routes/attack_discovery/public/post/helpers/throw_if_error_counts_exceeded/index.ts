/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { isEmptyModelResponseErrorEntry } from '@kbn/discoveries';

import * as i18n from './translations';

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
    const hallucinationFailuresError = `${i18n.MAX_HALLUCINATION_FAILURES(
      hallucinationFailures
    )}\n${errors.join(',\n')}`;

    logger?.error(hallucinationFailuresError);
    throw new Error(hallucinationFailuresError);
  }

  if (generationAttempts >= maxGenerationAttempts) {
    // every failed attempt being an empty model response is a model/connector failure, so the
    // "send fewer alerts" advice cannot help; a mix with other failures keeps it
    const hasEmptyModelResponseErrors =
      errors.length > 0 && errors.every(isEmptyModelResponseErrorEntry);

    const generationAttemptsError = `${
      hasEmptyModelResponseErrors
        ? i18n.MAX_GENERATION_ATTEMPTS_WITH_EMPTY_MODEL_RESPONSE(generationAttempts)
        : i18n.MAX_GENERATION_ATTEMPTS(generationAttempts)
    }\n${errors.join(',\n')}`;

    logger?.error(generationAttemptsError);
    throw new Error(generationAttemptsError);
  }
};
