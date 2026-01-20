/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import type { EntityDefinition } from '../definitions/entity_schema';

type MappingProperties = NonNullable<MappingTypeMapping['properties']>;

const BASE_ENTITY_INDEX_MAPPING = {
  '@timestamp': { type: 'date' },
  'event.ingested': { type: 'date' },
  labels: { type: 'object' },
  tags: { type: 'keyword', ignore_above: 1024 },

  // 'asset.criticality': { type: 'keyword' },
  // 'entity.name': { type: 'keyword' },
  // 'entity.source': { type: 'keyword' },
} as const satisfies MappingProperties;

export const getComponentTemplateName = (definitionId: string) => `${definitionId}-latest@platform`;

export const getEntityDefinitionComponentTemplate = (definition: EntityDefinition) => ({
  name: getComponentTemplateName(definition.id),
  template: { settings: { hidden: true }, mappings: getIndexMappings(definition) },
});

const getIndexMappings = (definition: EntityDefinition): MappingTypeMapping => ({
  properties: {
    ...BASE_ENTITY_INDEX_MAPPING,
    ...Object.fromEntries(definition.identityFields.map((c) => [c.field, c.mapping])),
    ...Object.fromEntries(
      definition.fields
        .filter(({ mapping }) => mapping)
        .map(({ source, destination, mapping }) => [destination || source, mapping])
    ),
  },
});
