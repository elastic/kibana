/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { ReferenceDataClient } from './reference_data_client';
import { REF_DATA_KEYS } from './constants';
import type { OptInStatusMetadata } from './types';

export const getIsEndpointExceptionsPerPolicyEnabled = async (
  soClient: SavedObjectsClientContract,
  logger: Logger
): Promise<boolean> => {
  const referenceDataClient = new ReferenceDataClient(soClient, logger);

  const optInStatus = await referenceDataClient.get<OptInStatusMetadata>(
    REF_DATA_KEYS.endpointExceptionsPerPolicyOptInStatus
  );

  return optInStatus.metadata.status;
};
