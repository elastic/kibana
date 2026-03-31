/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { ExperimentalFeatures } from '../../../../common';
import { ReferenceDataClient } from './reference_data_client';
import { REF_DATA_KEYS } from './constants';
import type { OptInStatusMetadata } from './types';
import { stringify } from '../../utils/stringify';

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
 * @param soClient soClient with write access to REFERENCE_DATA_SAVED_OBJECT_TYPE
 * @param experimentalFeatures
 * @param logger
 */
export const initializeEndpointExceptionsPerPolicyOptInStatus = async (
  soClient: SavedObjectsClientContract,
  experimentalFeatures: ExperimentalFeatures,
  logger: Logger
): Promise<void> => {
  const referenceDataClient = new ReferenceDataClient(soClient, experimentalFeatures, logger);

  const result = await referenceDataClient.get<OptInStatusMetadata>(
    REF_DATA_KEYS.endpointExceptionsPerPolicyOptInStatus
  );

  logger.debug(
    `Initialized Endpoint Exceptions per-policy opt-in status to: ${stringify(result.metadata)}`
  );
};
