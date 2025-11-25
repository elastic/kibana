/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup, Logger } from '@kbn/core/server';
import type { ApiConfig } from '@kbn/elastic-assistant-common';
import { transformError } from '@kbn/securitysolution-es-utils';

import { reportAttackDiscoveryGenerationFailure } from '../../../../helpers/telemetry';

export const handleGraphError = async ({
  apiConfig,
  err,
  logger,
  telemetry,
}: {
  apiConfig: ApiConfig;
  err: Error;
  logger: Logger;
  telemetry: AnalyticsServiceSetup;
}) => {
  try {
    logger.error(err);

    const error = transformError(err);
    reportAttackDiscoveryGenerationFailure({
      apiConfig,
      errorMessage: error.message,
      telemetry,
    });
  } catch (updateErr) {
    const updateError = transformError(updateErr);

    logger.error(
      `handleGraphError: error reporting attack discovery generation failure ${updateError.message}`
    );
  }
};
