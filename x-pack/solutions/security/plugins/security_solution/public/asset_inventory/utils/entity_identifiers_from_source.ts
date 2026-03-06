/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euid, type EntityType } from '@kbn/entity-store/public';
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

/**
 * Extract entityIdentifiers from asset inventory document _source using entity store EUID logic.
 * Uses euid.getEntityIdentifiersFromDocument from the entity store plugin.
 *
 * For generic/container types, maps entity.id to 'related.entity' for flyout param convention.
 */
export const getEntityIdentifiersFromSource = (
  source: GenericEntityRecord | Record<string, unknown>,
  entityType?: string
): EntityIdentifiers | null => {
  const raw = source as Record<string, unknown>;
  const entity = raw.entity as { EngineMetadata?: { Type?: string }; type?: string } | undefined;
  const assetType = (entityType ?? entity?.EngineMetadata?.Type ?? entity?.type) as
    | AssetEntityType
    | undefined;

  const storeType: EntityType | undefined = assetType
    ? ASSET_TO_ENTITY_STORE_TYPE[assetType] ?? 'generic'
    : 'generic';

  const identifiers = euid.getEntityIdentifiersFromDocument(storeType, raw);
  if (!identifiers || Object.keys(identifiers).length === 0) {
    return null;
  }

  // Generic flyout expects 'related.entity' key; entity store returns 'entity.id'
  if (storeType === 'generic' && identifiers['entity.id']) {
    return { 'related.entity': identifiers['entity.id'] };
  }

  return identifiers;
};
