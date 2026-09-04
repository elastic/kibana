/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityUpdateClient } from '@kbn/entity-store/server';
import type { Logger } from '@kbn/core/server';

export interface ServiceEntityRecord {
  entityId: string;
  serviceName: string;
}

const PAGE_SIZE = 500;

/**
 * Pages through all service entities in the entity store latest index.
 * Uses cursor mode (search_after) so it handles stores larger than PAGE_SIZE.
 */
export const listServiceEntities = async (
  crudClient: EntityUpdateClient,
  logger: Logger
): Promise<ServiceEntityRecord[]> => {
  const results: ServiceEntityRecord[] = [];
  let searchAfter: Array<string | number> | undefined;

  do {
    const resp = await crudClient.listEntities({
      filter: { term: { 'entity.type': 'Service' } },
      size: PAGE_SIZE,
      searchAfter,
      // Limit _source to the two fields we need
      source: ['entity.id', 'entity.name'],
    });

    for (const entity of resp.entities) {
      // Entity is typed as the full union type; we access the entity field
      const entityId = (entity as { entity?: { id?: string } }).entity?.id;
      const serviceName = (entity as { entity?: { name?: string } }).entity?.name;
      if (entityId && serviceName) {
        results.push({ entityId, serviceName });
      }
    }

    searchAfter = resp.nextSearchAfter;

    logger.debug(`[service-health-score] listed ${results.length} service entities so far`);
  } while (searchAfter !== undefined);

  return results;
};
