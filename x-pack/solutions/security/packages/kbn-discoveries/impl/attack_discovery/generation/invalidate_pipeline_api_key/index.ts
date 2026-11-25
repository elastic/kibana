/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, Logger } from '@kbn/core/server';

export interface InvalidatePipelineApiKeyParams {
  apiKeyId: string | undefined;
  coreStart: CoreStart | undefined;
  logger: Logger;
}

/**
 * Invalidates the API key granted for a generation run so the credential stops
 * being usable when the run ends, rather than when it expires.
 *
 * Does nothing when no key was granted. Never throws: invalidation is cleanup,
 * and a failure here must not replace the outcome of the run itself.
 */
export const invalidatePipelineApiKey = async ({
  apiKeyId,
  coreStart,
  logger,
}: InvalidatePipelineApiKeyParams): Promise<void> => {
  if (apiKeyId == null || coreStart == null) {
    return;
  }

  try {
    await coreStart.security.authc.apiKeys.invalidateAsInternalUser({ ids: [apiKeyId] });

    logger.debug(() => `Invalidated pipeline API key ${apiKeyId}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    logger.warn(`Could not invalidate pipeline API key ${apiKeyId}: ${message}`);
  }
};
