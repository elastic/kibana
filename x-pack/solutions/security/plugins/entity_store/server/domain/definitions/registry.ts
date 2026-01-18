/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { hostEntityDescription } from './host';
import { managedEntitySchema, type EntityDescription, type ManagedEntity } from './entity_schema';
import { buildEntityDefinitionId } from '../assets/indices/entities_latest';

const entitiesDescriptionRegistry = {
  host: hostEntityDescription,
  // TODO: add other entity descriptions
  user: hostEntityDescription,
  service: hostEntityDescription,
  generic: hostEntityDescription,
} as const satisfies Record<EntityType, EntityDescription>;

interface EntityDefinitionParams {
  type: EntityType;
}

export function getEntityDefinition({ type }: EntityDefinitionParams): ManagedEntity {
  // TODO: get index patterns from data view in runtime

  const description = entitiesDescriptionRegistry[type];

  return managedEntitySchema.parse({
    ...description,
    id: buildEntityDefinitionId(type, 'default'), // TODO: get namespace
    type,
  });
}

export type EntityType = z.infer<typeof EntityType>;
export const EntityType = z.enum(['user', 'host', 'service', 'generic']);

export const ALL_ENTITY_TYPES = Object.values(EntityType.Values);
