/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Calculates elapsed time in milliseconds from a start timestamp.
 * Returns 0 for invalid or future timestamps.
 */
export const getElapsedFromTimestamp = (startedAt: string | undefined): number => {
  if (!startedAt) {
    return 0;
  }

  const startTime = new Date(startedAt).getTime();

  if (Number.isNaN(startTime)) {
    return 0;
  }

  return Math.max(0, Date.now() - startTime);
};
