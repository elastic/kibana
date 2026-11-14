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
 * `combinedResponse` is only assigned once a response was combined, so it is still '' when the
 * attempt failed before producing content (for example an empty completion). Resetting the
 * accumulated text then would discard every partial result from earlier attempts.
 */
export const getCombinedAfterFailedAttempt = ({
  combinedGenerations,
  combinedResponse,
}: {
  combinedGenerations: string;
  combinedResponse: string;
}): string => (combinedResponse === '' ? combinedGenerations : combinedResponse);
