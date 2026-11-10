/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Parses PERSONA_MATRIX_WORKERS. Only 2 or 3 opt into parallelism; anything
 * else set explicitly runs serially and warns, so a typo doesn't quietly turn
 * a parallel sweep back into a serial one.
 */
export const resolveWorkers = (
  raw: string | undefined,
  warn: (message: string) => void
): 1 | 2 | 3 => {
  if (raw === undefined || raw === '' || raw === '1') {
    return 1;
  }
  if (raw === '2') {
    return 2;
  }
  if (raw === '3') {
    return 3;
  }
  warn(
    `PERSONA_MATRIX_WORKERS="${raw}" is not supported (allowed: 1, 2, 3); running with 1 worker.`
  );
  return 1;
};
