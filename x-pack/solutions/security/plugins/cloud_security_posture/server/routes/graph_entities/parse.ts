/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type {
  EntityItem,
  EntitiesResponse,
} from '@kbn/cloud-security-posture-common/types/graph_entities/v1';
import type { EntityRecord } from './types';
import { transformEntityTypeToIconAndShape, normalizeToArray } from '../graph/utils';

/**
 * Parses entity records into EntityItem response.
 * Creates fallback records for entity IDs not found in the query results.
 * Note: totalRecords is added by the caller (v1.ts) after server-side pagination.
 */
export const parseEntityRecords = (
  logger: Logger,
  records: EntityRecord[],
  requestedEntityIds: string[]
): Omit<EntitiesResponse, 'totalRecords'> => {
  // Create a map of found entities for quick lookup
  const foundEntitiesMap = new Map<string, EntityRecord>();
  records.forEach((record) => {
    foundEntitiesMap.set(record.entityId, record);
  });

  // Build entity items, ensuring all requested IDs are returned
  const entities: EntityItem[] = requestedEntityIds.map((entityId) => {
    const record = foundEntitiesMap.get(entityId);

    if (record) {
      // Entity found - use data from query
      const { icon } = transformEntityTypeToIconAndShape(record.ecsParentField ?? '');

      return {
        id: entityId,
        name: record.entityName ?? undefined,
        type: record.entityType ?? undefined,
        subType: record.entitySubType ?? undefined,
        ecsParentField: record.ecsParentField ?? undefined,
        timestamp: record.timestamp ?? undefined,
        ...(icon ? { icon } : {}),
        availableInEntityStore: record.availableInEntityStore ?? false,
        host: record.hostIp ? { ip: record.hostIp } : undefined,
        ips: normalizeToArray(record.sourceIps),
        countryCodes: normalizeToArray(record.sourceCountryCodes),
      };
    } else {
      // Entity not found - create minimal fallback record
      logger.debug(`Entity ID ${entityId} not found in events or entity store, creating fallback`);

      return {
        id: entityId,
        name: entityId,
        availableInEntityStore: false,
      };
    }
  });

  logger.trace(
    `Parsed ${entities.length} entities (${records.length} found, ${
      requestedEntityIds.length - records.length
    } fallbacks)`
  );

  return { entities };
};
