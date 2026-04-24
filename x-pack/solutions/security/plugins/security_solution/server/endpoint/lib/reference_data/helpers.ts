/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract, SavedObjectsServiceStart } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import pRetry from 'p-retry';
import { SavedObjectsClient } from '@kbn/core/server';
import type { ExperimentalFeatures } from '../../../../common';
import { ReferenceDataClient } from './reference_data_client';
import { REF_DATA_KEYS, REFERENCE_DATA_SAVED_OBJECT_TYPE } from './constants';
import type { OptInStatusMetadata } from './types';

/**
 * Reads the Endpoint Exceptions per-policy opt-in status from Reference Data.
 *
 * @param soClient soClient with write access to REFERENCE_DATA_SAVED_OBJECT_TYPE
 * @param experimentalFeatures
 * @param logger
 */
export const getIsEndpointExceptionsPerPolicyEnabled = async (
  soClient: SavedObjectsClientContract,
  experimentalFeatures: ExperimentalFeatures,
  logger: Logger
): Promise<boolean> => {
  const referenceDataClient = new ReferenceDataClient(soClient, experimentalFeatures, logger);

  const optInStatus = await referenceDataClient.get<OptInStatusMetadata>(
    REF_DATA_KEYS.endpointExceptionsPerPolicyOptInStatus
  );

  return optInStatus.metadata.status;
};

/**
 * Triggers the underlying automatic functionality to set the default value for
 * Endpoint Exceptions per-policy opt-in.
 * It has to be called during plugin.start() to ensure that the data used to decide
 * whether opt-in should be enabled or not is not initialized yet on new deployments.
 *
 * @param savedObjectsServiceStart SavedObjectsServiceStart
 * @param experimentalFeatures
 * @param logger
 */
export const initializeEndpointExceptionsPerPolicyOptInStatus = async (
  savedObjectsServiceStart: SavedObjectsServiceStart,
  experimentalFeatures: ExperimentalFeatures,
  _logger: Logger
): Promise<void> => {
  const logger = _logger.get('initEndpointExceptionsPerPolicyOptIn');

  await pRetry(
    async () => {
      const soClient = new SavedObjectsClient(
        savedObjectsServiceStart.createInternalRepository([REFERENCE_DATA_SAVED_OBJECT_TYPE])
      );

      const referenceDataClient = new ReferenceDataClient(soClient, experimentalFeatures, logger);

      const result = await referenceDataClient.get<OptInStatusMetadata>(
        REF_DATA_KEYS.endpointExceptionsPerPolicyOptInStatus
      );

      logger.info(
        `Endpoint Exceptions per-policy opt-in status is '${result.metadata.status}'${
          result.metadata.reason ? ` (reason: '${result.metadata.reason}').` : '.'
        }`
      );
    },
    {
      retries: 5,
      minTimeout: 1000,
      maxTimeout: 3000,

      onFailedAttempt: (error) => {
        logger.debug(
          `Attempt ${error.attemptNumber} to initialize Endpoint Exceptions per-policy opt-in status failed. There are ${error.retriesLeft} retries left. Error: ${error.message}`
        );
      },
    }
  ).catch((error) => {
    logger.error(
      `Error initializing Endpoint Exceptions per-policy opt-in status: ${error.message}`
    );
  });
};
