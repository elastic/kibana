/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';

export class SloToolValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SloToolValidationError';
  }
}

export const toToolErrorResult = ({
  error,
  metadata,
  logger,
}: {
  error: unknown;
  metadata?: Record<string, unknown>;
  logger: Logger;
}) => {
  const message = error instanceof Error ? error.message : String(error);

  if (error instanceof SloToolValidationError) {
    logger.debug(`SLO tool validation error: ${message}`);
  } else {
    logger.warn(`SLO tool unexpected error: ${message}`);
  }

  return {
    results: [
      {
        type: ToolResultType.error,
        data: {
          message,
          ...(metadata && { metadata }),
        },
      },
    ],
  };
};
