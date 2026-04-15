/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { EntityStoreCRUDClient } from '@kbn/entity-store/server';
import type { Entity } from '../../../../common/api/entity_analytics/entity_store/entities/common.gen';
import type { LeadEntity } from './types';

/** Row shape returned by {@link EntityStoreCRUDClient.listEntities}. */
type EntityStoreEntity = Awaited<
  ReturnType<EntityStoreCRUDClient['listEntities']>
>['entities'][number];

const ENTITY_PAGE_SIZE = 1000;

/**
 * Convert an Entity Store V2 record into a LeadEntity, extracting the
 * convenience `type` and `name` fields from the nested `entity` object.
 * Falls back to `entity.id` (EUID) when `entity.name` is absent.
 */
export const entityRecordToLeadEntity = (record: EntityStoreEntity): LeadEntity => {
  const r = record as Record<string, unknown>;
  const entityField = r.entity as
    | { name?: string; type?: string; id?: string; EngineMetadata?: { Type?: string } }
    | undefined;
  return {
    record: record as Entity,
    type: entityField?.EngineMetadata?.Type ?? entityField?.type ?? 'unknown',
    name: entityField?.name ?? entityField?.id ?? 'unknown',
  };
};

/**
 * Paginate through all entities in the V2 unified index via
 * `CRUDClient.listEntities()`, accumulating results across pages.
 */
export const fetchAllLeadEntities = async (
  crudClient: EntityStoreCRUDClient,
  logger?: Logger
): Promise<LeadEntity[]> => {
  const allEntities: LeadEntity[] = [];
  let searchAfter: Array<string | number> | undefined;

  do {
    const { entities, nextSearchAfter } = await crudClient.listEntities({
      size: ENTITY_PAGE_SIZE,
      ...(searchAfter !== undefined ? { searchAfter } : {}),
    });

    for (const entity of entities) {
      allEntities.push(entityRecordToLeadEntity(entity));
    }

    searchAfter = nextSearchAfter;
  } while (searchAfter !== undefined);

  logger?.debug(`[LeadGeneration] Fetched ${allEntities.length} entities from V2 index`);
  return allEntities;
};
