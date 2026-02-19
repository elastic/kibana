/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, IScopedClusterClient } from '@kbn/core/server';
import type { EntityNodeDataModel } from '@kbn/cloud-security-posture-common/types/graph/v1';
import { getEntitiesLatestIndexName } from '@kbn/cloud-security-posture-common/utils/helpers';
import { entityTypeMappings } from '../entity_type_constants';

/**
 * Interface for visual properties returned by the transform function
 */
export interface EntityVisualProps {
  icon?: string;
  shape?: EntityNodeDataModel['shape'];
}

/**
 * Transforms entity type to standardized icon and shape values
 * This helps normalize different entity type representations to consistent visual properties
 *
 * @param entityGroupType The type of the entity group
 * @returns Object containing the icon and shape for the entity
 */
export const transformEntityTypeToIconAndShape = (entityGroupType: string): EntityVisualProps => {
  if (!entityGroupType) {
    return {};
  }

  const entityGroupTypeLower = entityGroupType.toLowerCase();

  return {
    icon: entityTypeMappings.icons[entityGroupTypeLower],
    shape: entityTypeMappings.shapes[entityGroupTypeLower],
  };
};

/**
 * Checks if the entities latest index exists and is configured in lookup mode.
 * This is the preferred method for entity enrichment (replaces deprecated ENRICH policy).
 * Used by both fetchEvents and fetchEntityRelationships.
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
