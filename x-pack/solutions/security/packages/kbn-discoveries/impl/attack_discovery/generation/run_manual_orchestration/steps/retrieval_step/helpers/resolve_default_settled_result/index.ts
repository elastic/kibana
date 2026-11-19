/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';

import type { AlertRetrievalResult } from '../../../../../invoke_alert_retrieval_workflow';

/**
 * Resolves the settled result from the legacy alert retrieval promise.
 *
 * If the legacy retrieval failed, the error is always re-thrown so the
 * pipeline does not proceed to generation with incomplete alert data.
 */
export const resolveLegacySettledResult = ({
  legacySettled,
  logger,
}: {
  legacySettled: PromiseSettledResult<AlertRetrievalResult | null>;
  logger: Logger;
}): AlertRetrievalResult | null => {
  if (legacySettled.status === 'fulfilled') {
    const legacyResult = legacySettled.value;

    if (legacyResult != null) {
      logger.info(
        `Default alert retrieval completed: ${legacyResult.alertsContextCount} alerts retrieved`
      );
    }

    return legacyResult;
  }

  const errorMessage =
    legacySettled.reason instanceof Error
      ? legacySettled.reason.message
      : String(legacySettled.reason);

  logger.error(`Default alert retrieval failed: ${errorMessage}`);
  throw legacySettled.reason;
};
