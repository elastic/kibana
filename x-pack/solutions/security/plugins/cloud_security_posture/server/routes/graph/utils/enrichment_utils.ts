/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { castArray } from 'lodash';
import type { Logger, IScopedClusterClient } from '@kbn/core/server';
import { getEntitiesLatestIndexName } from '@kbn/cloud-security-posture-common/utils/helpers';
import type { EntityEnrichmentFields } from '../fetch_entity_enrichment';

/**
 * Checks if the entities latest index exists.
 * Previously checked for lookup mode (required for LOOKUP JOIN), but since
 * enrichment now uses follow-up queries, only existence matters.
 */
export const checkIfEntitiesIndexExists = async (
  esClient: IScopedClusterClient,
  logger: Logger,
  spaceId: string
): Promise<boolean> => {
  const indexName = getEntitiesLatestIndexName(spaceId);
  try {
    const exists = await esClient.asInternalUser.indices.exists({ index: indexName });
    if (!exists) {
      logger.debug(`Entities index ${indexName} does not exist`);
    }
    return exists;
  } catch (error) {
    logger.error(`Error checking entities index ${indexName}: ${error.message}`);
    return false;
  }
};

/**
 * Rebuilds doc data JSON strings with enrichment data from the entity store.
 * Always builds the entity object, applying availableInEntityStore=false as default
 * when no enrichment is found. sourceFields may be at the top level (from events docData)
 * or inside an existing entity object.
 */
export const rebuildDocData = (
  docDataItems: (string | null)[] | string | undefined,
  enrichmentMap: Map<string, EntityEnrichmentFields>
): string[] => {
  const items = castArray(docDataItems ?? []).filter((d): d is string => d != null);
  return items.map((item) => {
    let doc: Record<string, unknown>;
    try {
      doc = JSON.parse(item);
    } catch {
      return item;
    }
    const entityId = doc.id as string;
    if (!entityId) return item;

    // sourceFields may be at top level (events docData) or inside entity object (entity store docData)
    const topLevelSourceFields = doc.sourceFields;
    const existingEntity = (doc.entity as Record<string, unknown>) ?? {};
    const sourceFields = topLevelSourceFields ?? existingEntity.sourceFields;

    const enrichment = enrichmentMap.get(entityId);
    const entityData: Record<string, unknown> = {
      availableInEntityStore: enrichment != null,
      ...(sourceFields ? { sourceFields } : {}),
    };

    if (enrichment) {
      if (enrichment.name != null) entityData.name = enrichment.name;
      if (enrichment.type != null) entityData.type = enrichment.type;
      if (enrichment.subType != null) entityData.sub_type = enrichment.subType;
      if (enrichment.engineType != null) entityData.engine_type = enrichment.engineType;
      if (enrichment.hostIps && enrichment.hostIps.length > 0) {
        entityData.host = { ip: enrichment.hostIps };
      }
    }

    if (topLevelSourceFields !== undefined) delete doc.sourceFields;
    doc.entity = entityData;
    return JSON.stringify(doc);
  });
};
