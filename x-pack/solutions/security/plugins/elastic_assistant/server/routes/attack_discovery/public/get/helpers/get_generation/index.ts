/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { AuthenticatedUser } from '@kbn/core-security-common';
import { transformError } from '@kbn/securitysolution-es-utils';
import type { AttackDiscoveryApiAlert } from '@kbn/elastic-assistant-common';
import type { AttackDiscoveryGeneration } from '@kbn/elastic-assistant-common/impl/schemas/attack_discovery/generation.gen';

import type { AttackDiscoveryDataClient } from '../../../../../../lib/attack_discovery/persistence';

export interface GetGenerationParams {
  dataClient: AttackDiscoveryDataClient;
  authenticatedUser: AuthenticatedUser;
  eventLogIndex: string;
  executionUuid: string;
  logger: Logger;
  spaceId: string;
  data: AttackDiscoveryApiAlert[];
}

/**
 * Retrieves an attack discovery generation by execution UUID with error handling.
 *
 * If the generation metadata is not found (404) but alert data exists, it returns undefined
 * to allow the response to proceed with just the alert data.
 *
 * @returns Promise<AttackDiscoveryGeneration | undefined> - The generation metadata or undefined if not found but data exists
 * @throws Error for any errors other than 404 with existing data
 */
export const getGeneration = async ({
  dataClient,
  authenticatedUser,
  eventLogIndex,
  executionUuid,
  logger,
  spaceId,
  data,
}: GetGenerationParams): Promise<AttackDiscoveryGeneration | undefined> => {
  try {
    return await dataClient.getAttackDiscoveryGenerationById({
      authenticatedUser,
      eventLogIndex,
      executionUuid,
      logger,
      spaceId,
    });
  } catch (err) {
    const error = transformError(err);
    // If generation metadata is not found (404) but we have data, continue with undefined generation
    if (error.statusCode === 404 && data.length > 0) {
      logger.debug(
        () =>
          `Generation metadata not found for execution_uuid ${executionUuid}, but returning ${data.length} discovery alerts`
      );
      return undefined;
    } else {
      // Re-throw other errors or 404 when there's no data
      throw err;
    }
  }
};
