/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * A space that has never run a detection rule has no alerts index. Elasticsearch reports that as
 * "Unknown index" or "no such index". Either one is empty data, not a query bug.
 */
export const isMissingIndexError = (error: unknown): boolean => {
  if (typeof error !== 'object' || error == null || !('message' in error)) {
    return false;
  }
  const { message } = error as { message: unknown };
  return (
    typeof message === 'string' &&
    (message.includes('Unknown index') || message.includes('no such index'))
  );
};
