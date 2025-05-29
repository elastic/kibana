/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AnalyticsServiceSetup, AuthenticatedUser, Logger } from '@kbn/core/server';
import { ApiConfig, Replacements } from '@kbn/elastic-assistant-common';
import { transformError } from '@kbn/securitysolution-es-utils';

import { AttackDiscoveryDataClient } from '../../../../../lib/attack_discovery/persistence';
import { attackDiscoveryStatus } from '../../../helpers/helpers';
import { reportAttackDiscoveryGenerationFailure } from '../../../helpers/telemetry';

export const handleGraphError = async ({
  apiConfig,
  executionUuid,
  authenticatedUser,
  dataClient,
  err,
  latestReplacements,
  logger,
  telemetry,
}: {
  apiConfig: ApiConfig;
  executionUuid: string;
  authenticatedUser: AuthenticatedUser;
  dataClient: AttackDiscoveryDataClient;
  err: Error;
  latestReplacements: Replacements;
  logger: Logger;
  telemetry: AnalyticsServiceSetup;
}) => {
  try {
    logger.error(err);
    const error = transformError(err);
    const currentAd = await dataClient.getAttackDiscovery({
      id: executionUuid,
      authenticatedUser,
    });

    if (currentAd === null || currentAd?.status === 'canceled') {
      return;
    }

    await dataClient.updateAttackDiscovery({
      attackDiscoveryUpdateProps: {
        attackDiscoveries: [],
        status: attackDiscoveryStatus.failed,
        id: executionUuid,
        replacements: latestReplacements,
        backingIndex: currentAd.backingIndex,
        failureReason: error.message,
      },
      authenticatedUser,
    });
    reportAttackDiscoveryGenerationFailure({
      apiConfig,
      errorMessage: error.message,
      telemetry,
    });
  } catch (updateErr) {
    const updateError = transformError(updateErr);
    reportAttackDiscoveryGenerationFailure({
      apiConfig,
      errorMessage: updateError.message,
      telemetry,
    });
  }
};
