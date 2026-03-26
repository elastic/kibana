/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import assert from 'assert';

import type { EntityType } from './entity_schema';
import { type EntityDefinitionWithoutId, type ManagedEntityDefinition } from './entity_schema';
import { hostEntityDefinition } from './host';
import { userEntityDefinition } from './user';
import { serviceEntityDefinition } from './service';
import { genericEntityDefinition } from './generic';

const entitiesDefinitionRegistry = {
  host: hostEntityDefinition,
  user: userEntityDefinition,
  service: serviceEntityDefinition,
  generic: genericEntityDefinition,
} as const satisfies Record<EntityType, EntityDefinitionWithoutId>;

export const getEntityDefinitionId = (entityType: EntityType, space: string) =>
  `security_${entityType}_${space}`;

export function getEntityDefinition(type: EntityType, namespace: string): ManagedEntityDefinition {
  const definition = getEntityDefinitionWithoutId(type);

  return {
    ...definition,
    id: getEntityDefinitionId(type, namespace),
    type,
  };
}

export function getEntityDefinitionWithoutId(type: EntityType): EntityDefinitionWithoutId {
  const definition = entitiesDefinitionRegistry[type];
  assert(definition, `No entity description found for type: ${type}`);

  return definition;
}
