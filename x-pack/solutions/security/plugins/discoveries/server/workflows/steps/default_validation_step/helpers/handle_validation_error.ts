/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';

export const handleValidationError = ({
  contextLogger,
  error,
  logger,
}: {
  contextLogger: { error: (message: string, error?: Error) => void };
  error: unknown;
  logger: Logger;
}): { error: Error } => {
  logger.debug(() => `🔍 [VALIDATE] ERROR: ${error}`);

  contextLogger.error('Failed to validate discoveries', error instanceof Error ? error : undefined);

  return {
    error: new Error(error instanceof Error ? error.message : 'Failed to validate discoveries'),
  };
};
