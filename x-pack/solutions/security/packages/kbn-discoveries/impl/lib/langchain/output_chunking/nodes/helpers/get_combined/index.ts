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
 * The combined text to carry into the next attempt after a failed one. An attempt that produced no
 * content (`combinedResponse === ''`) leaves the accumulated text untouched, so an empty completion
 * yields the same state whether the `@kbn/langchain` guard threw or the node noticed it.
 */
export const getCombinedAfterFailedAttempt = ({
  combinedGenerations,
  combinedResponse,
}: {
  combinedGenerations: string;
  combinedResponse: string;
}): string => (combinedResponse === '' ? combinedGenerations : combinedResponse);
