/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import assert from 'node:assert';

import type { EntityType } from './entity_schema';
import { type EntityDefinitionWithoutId, type ManagedEntityDefinition } from './entity_schema';
import { getEntityDefinitionId } from '../assets/latest_index';
import { hostEntityDefinition } from './host';
import { userEntityDefinition } from './user';
import { serviceEntityDefinition } from './service';
import { genericEntityDefinition } from './generic';

const entitiesDescriptionRegistry = {
  host: hostEntityDefinition,
  user: userEntityDefinition,
  service: serviceEntityDefinition,
  generic: genericEntityDefinition,
} as const satisfies Record<EntityType, EntityDefinitionWithoutId>;

interface EntityDefinitionParams {
  type: EntityType;
}

export function getEntityDefinition({ type }: EntityDefinitionParams): ManagedEntityDefinition {
  // TODO: get index patterns from data view in runtime

  const description = entitiesDescriptionRegistry[type];
  assert(description, `No entity description found for type: ${type}`);

  return {
    ...description,
    id: getEntityDefinitionId(type, 'default'), // TODO: get namespace
    type,
  };
}
