/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import type { EntityType } from '../../definitions/registry';
import { getEntityIndexPattern, ENTITY_LATEST, ENTITY_SCHEMA_VERSION_V2 } from '../../constants';
import type { EntityDefinition } from '../../definitions/entity_schema';

// Mostly copied from
// - x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/entity_store/elasticsearch_assets/entity_index.ts

export const getLatestEntitiesIndexName = (entityType: EntityType, namespace: string) =>
  getEntityIndexPattern({
    schemaVersion: ENTITY_SCHEMA_VERSION_V2,
    dataset: ENTITY_LATEST,
    definitionId: buildEntityDefinitionId(entityType, namespace),
  });

export const buildEntityDefinitionId = (entityType: EntityType, space: string) =>
  `security_${entityType}_${space}`;

export type MappingProperties = NonNullable<MappingTypeMapping['properties']>;

export const generateIndexMappings = (description: EntityDefinition): MappingTypeMapping => {
  const identityFieldMappings = description.identityFields.reduce((acc, c) => {
    acc[c.field] = c.mapping;
    return acc;
  }, {} as MappingProperties);

  const fields = description.fields
    .filter(({ mapping }) => mapping)
    .reduce((acc, { source, destination, mapping }) => {
      acc[destination || source] = mapping;
      return acc;
    }, {} as MappingProperties);

  return {
    properties: { ...BASE_ENTITY_INDEX_MAPPING, ...identityFieldMappings, ...fields },
  };
};

const BASE_ENTITY_INDEX_MAPPING: MappingProperties = {
  '@timestamp': { type: 'date' },
  'asset.criticality': { type: 'keyword' },
  'entity.name': { type: 'keyword' },
  'entity.source': { type: 'keyword' },
};
