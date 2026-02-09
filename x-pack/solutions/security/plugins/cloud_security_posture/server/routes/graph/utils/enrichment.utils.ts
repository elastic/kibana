/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, IScopedClusterClient } from '@kbn/core/server';
import {
  getEnrichPolicyId,
  getEntitiesLatestIndexName,
} from '@kbn/cloud-security-posture-common/utils/helpers';

/**
 * Checks if enrich policy exists for the given space.
 * This is the deprecated fallback method for entity enrichment.
 */
export const checkEnrichPolicyExists = async (
  esClient: IScopedClusterClient,
  logger: Logger,
  spaceId: string
): Promise<boolean> => {
  try {
    const { policies } = await esClient.asInternalUser.enrich.getPolicy({
      name: getEnrichPolicyId(spaceId),
    });

    logger.debug(
      `Enrich policy check for [${getEnrichPolicyId(spaceId)}]: found ${
        policies?.length
      } policies, policies: ${JSON.stringify(policies?.map((p) => p.config.match?.name))}`
    );
    return policies.some((policy) => policy.config.match?.name === getEnrichPolicyId(spaceId));
  } catch (error) {
    logger.error(`Error fetching enrich policy ${error.message}`);
    logger.error(error);
    return false;
  }
};

/**
 * Checks if the entities latest index exists and is configured in lookup mode.
 * This is the preferred method for entity enrichment (replaces deprecated ENRICH policy).
 */
export const checkIfEntitiesIndexLookupMode = async (
  esClient: IScopedClusterClient,
  logger: Logger,
  spaceId: string
): Promise<boolean> => {
  const indexName = getEntitiesLatestIndexName(spaceId);
  try {
    const response = await esClient.asInternalUser.indices.getSettings({
      index: indexName,
    });
    const indexSettings = response[indexName];
    if (!indexSettings) {
      logger.debug(`Entities index ${indexName} not found`);
      return false;
    }

    // Check if index is in lookup mode
    const mode = indexSettings.settings?.index?.mode;
    const isLookupMode = mode === 'lookup';

    if (!isLookupMode) {
      logger.debug(`Entities index ${indexName} exists but is not in lookup mode (mode: ${mode})`);
    }

    return isLookupMode;
  } catch (error) {
    if (error.statusCode === 404) {
      logger.debug(`Entities index ${indexName} does not exist`);
      return false;
    }
    logger.error(`Error checking entities index ${indexName}: ${error.message}`);
    return false;
  }
};

/**
 * Interface for enrichment availability status.
 */
export interface EnrichmentAvailability {
  isLookupIndexAvailable: boolean;
  isEnrichPolicyExists: boolean;
}

/**
 * Checks entity enrichment availability for the given space.
 * Returns status for both LOOKUP JOIN (preferred) and ENRICH policy (deprecated fallback).
 */
export const checkEnrichmentAvailability = async (
  esClient: IScopedClusterClient,
  logger: Logger,
  spaceId: string
): Promise<EnrichmentAvailability> => {
  const isLookupIndexAvailable = await checkIfEntitiesIndexLookupMode(esClient, logger, spaceId);

  // Only check for enrich policy if lookup index is not available
  const isEnrichPolicyExists = isLookupIndexAvailable
    ? false
    : await checkEnrichPolicyExists(esClient, logger, spaceId);

  return {
    isLookupIndexAvailable,
    isEnrichPolicyExists,
  };
};
