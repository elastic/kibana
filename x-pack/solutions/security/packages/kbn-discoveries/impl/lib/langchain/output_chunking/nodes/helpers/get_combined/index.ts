/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const getCombined = ({
  combinedGenerations,
  partialResponse,
}: {
  combinedGenerations: string;
  partialResponse: string;
}): string => `${combinedGenerations}${partialResponse}`;

/**
 * The combined text to carry into the next attempt after a failed one.
 *
 * A failed attempt that produced no content must leave the accumulated text untouched. Keeping it is
 * what `getCombined` already computes for an empty `partialResponse` (it appends nothing), and the
 * text from earlier attempts is still valid input for the next attempt; resetting it would restart
 * the generation from scratch while the recorded error says no content was ever produced.
 *
 * The empty-completion branch and the catch block both go through this so that an empty completion
 * leaves the same state whether the guard in `@kbn/langchain` threw or the node noticed it.
 */
export const getCombinedAfterFailedAttempt = ({
  combinedGenerations,
  combinedResponse,
}: {
  combinedGenerations: string;
  combinedResponse: string;
}): string => (combinedResponse === '' ? combinedGenerations : combinedResponse);
