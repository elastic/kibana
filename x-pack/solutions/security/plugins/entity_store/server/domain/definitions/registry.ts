/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import assert from 'node:assert';
import { SECURITY_SOLUTION_DEFAULT_INDEX_ID } from '@kbn/management-settings-ids';
import type { IUiSettingsClient } from '@kbn/core/server';
import union from 'lodash/union';
import { hostEntityDescription } from './host';
import type { EntityType } from './entity_schema';
import { type EntityDefinitionWithoutId, type ManagedEntityDefinition } from './entity_schema';
import { getEntityDefinitionId } from '../assets/latest_index';

const entitiesDescriptionRegistry = {
  host: hostEntityDescription,
  // TODO: add other entity descriptions
  user: hostEntityDescription,
  service: hostEntityDescription,
  generic: hostEntityDescription,
} as const satisfies Record<EntityType, EntityDefinitionWithoutId>;

interface EntityDefinitionParams {
  type: EntityType;
  uiSettings: IUiSettingsClient;
}

export async function getEntityDefinition({
  type,
  uiSettings,
}: EntityDefinitionParams): Promise<ManagedEntityDefinition> {
  const description = entitiesDescriptionRegistry[type];
  assert(description, `missing entity description for type: ${type}`);

  const indexPatterns = await uiSettings.get<string[]>(SECURITY_SOLUTION_DEFAULT_INDEX_ID);
  assert(indexPatterns.length > 0, 'no index patterns configured');

  return {
    ...description,
    type,
    id: getEntityDefinitionId(type, 'default'), // TODO: get namespace
    indexPatterns: union(description.indexPatterns, indexPatterns),
  };
}
