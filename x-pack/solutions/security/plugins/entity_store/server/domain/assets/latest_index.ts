/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEntityDefinitionId } from '../../../common/domain/definitions/registry';
import { getEntityIndexPattern, ENTITY_LATEST, ENTITY_SCHEMA_VERSION_V2 } from '../constants';
import type { EntityType } from '../../../common/domain/definitions/entity_schema';

// Mostly copied from
// - x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/entity_store/elasticsearch_assets/entity_index.ts

export const getLatestEntitiesIndexName = (entityType: EntityType, namespace: string) =>
  getEntityIndexPattern({
    schemaVersion: ENTITY_SCHEMA_VERSION_V2,
    dataset: ENTITY_LATEST,
    definitionId: getEntityDefinitionId(entityType, namespace),
  });
