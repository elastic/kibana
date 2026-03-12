/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import type { QueryDslQueryContainer } from '@kbn/data-views-plugin/common/types';
import type { EntityType } from '@kbn/entity-store/public';
import type { EntityIdentifiers } from '../../flyout/document_details/shared/utils';
import type { GenericEntityRecord } from '../types/generic_entity_record';

/** Asset inventory entity types; 'container' is mapped to generic for entity store */
export type AssetEntityType = 'user' | 'host' | 'service' | 'container' | 'generic';

const ASSET_TO_ENTITY_STORE_TYPE: Record<string, EntityType> = {
  user: 'user',
  host: 'host',
  service: 'service',
  container: 'generic',
  generic: 'generic',
};

/** Prefer entity.id from source when present (same priority as flyout document_details utils). */
const ENTITY_ID_FIELD_BY_TYPE: Partial<Record<EntityType, string>> = {
  user: 'user.entity.id',
  host: 'host.entity.id',
  service: 'service.entity.id',
};

/**
 * Extract entity identifiers from the DSL filter produced by getEuidDslFilterBasedOnDocument.
 * The filter's bool.filter array contains term clauses: { term: { [field]: value } }.
 */
const getEntityIdentifiersFromDslFilter = (
  dsl: QueryDslQueryContainer | undefined
): EntityIdentifiers | null => {
  if (!dsl || typeof dsl !== 'object' || !('bool' in dsl) || !dsl.bool?.filter) {
    return null;
  }
  const filters = Array.isArray(dsl.bool.filter) ? dsl.bool.filter : [dsl.bool.filter];
  const identifiers: EntityIdentifiers = {};
  for (const clause of filters) {
    if (clause && typeof clause === 'object' && 'term' in clause && clause.term) {
      const term = clause.term as Record<string, string | number>;
      const entries = Object.entries(term);
      if (entries.length === 1) {
        const [field, value] = entries[0];
        if (value !== undefined && value !== null) {
          identifiers[field] = String(value);
        }
      }
    }
  }
  return Object.keys(identifiers).length === 0 ? null : identifiers;
};

/** Euid API shape needed for getEntityIdentifiersFromSource (from useEntityStoreEuidApi().euid). */
export interface EuidApiForIdentifiers {
  getEuidDslFilterBasedOnDocument: (
    entityType: string,
    doc: unknown
  ) => QueryDslQueryContainer | undefined;
}

/**
 * Extract entityIdentifiers from asset inventory document _source using entity store EUID logic.
 * Uses euid.getEuidDslFilterBasedOnDocument and derives identifiers from the resulting DSL.
 * Prefers entity.id from source when present (user.entity.id, host.entity.id, service.entity.id).
 *
 * For generic/container types, maps entity.id to 'related.entity' for flyout param convention.
 * Pass euidApi from useEntityStoreEuidApi()?.euid; when null, returns null.
 */
export const getEntityIdentifiersFromSource = (
  source: GenericEntityRecord | Record<string, unknown>,
  entityType?: string,
  euidApi?: EuidApiForIdentifiers | null
): EntityIdentifiers | null => {
  if (!euidApi) {
    return null;
  }
  const raw = source as Record<string, unknown>;
  const entity = raw.entity as { EngineMetadata?: { Type?: string }; type?: string } | undefined;
  const assetType = (entityType ?? entity?.EngineMetadata?.Type ?? entity?.type) as
    | AssetEntityType
    | undefined;

  const storeType: EntityType | undefined = assetType
    ? ASSET_TO_ENTITY_STORE_TYPE[assetType] ?? 'generic'
    : 'generic';

  // Prefer entity.id from source when present (same priority as document_details get*EntityIdentifiers)
  const entityIdField = storeType ? ENTITY_ID_FIELD_BY_TYPE[storeType] : undefined;
  if (entityIdField) {
    const entityIdValue = get(raw, entityIdField);
    if (entityIdValue !== undefined && entityIdValue !== null && entityIdValue !== '') {
      return { [entityIdField]: String(entityIdValue) };
    }
  }

  const dsl = euidApi.getEuidDslFilterBasedOnDocument(storeType, raw);
  const identifiers = getEntityIdentifiersFromDslFilter(dsl);
  if (!identifiers || Object.keys(identifiers).length === 0) {
    return null;
  }

  // Generic flyout expects 'related.entity' key; entity store uses 'entity.id'
  if (storeType === 'generic' && identifiers['entity.id']) {
    return { 'related.entity': identifiers['entity.id'] };
  }

  return identifiers;
};
