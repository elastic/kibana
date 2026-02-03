/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEntityIndexPattern, ENTITY_SCHEMA_VERSION_V2, ENTITY_UPDATES } from '../constants';
import type { EntityType } from '../definitions/entity_schema';
import { getEntityDefinitionId } from './latest_index';

export const getUpdatesEntitiesDataStreamName = (entityType: EntityType, namespace: string) =>
  getEntityIndexPattern({
    schemaVersion: ENTITY_SCHEMA_VERSION_V2,
    dataset: ENTITY_UPDATES,
    definitionId: getEntityDefinitionId(entityType, namespace),
  });
