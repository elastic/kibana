/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import type { EntityDefinition } from '../definitions/entity_schema';
import { ENTITY_BASE_PREFIX } from '../constants';

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

export const getComponentTemplateName = (definitionId: string) =>
  `${ENTITY_BASE_PREFIX}-${definitionId}-latest@platform`;

export const getEntityDefinitionComponentTemplate = (definition: EntityDefinition) => {
  return {
    name: getComponentTemplateName(definition.id),
    template: { settings: { hidden: true }, mappings: getIndexMappings(definition) },
  };
};

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

export const getUpdatesComponentTemplateName = (definitionId: string) =>
  `${ENTITY_BASE_PREFIX}-${definitionId}-updates@platform`;

export const getUpdatesEntityDefinitionComponentTemplate = (definition: EntityDefinition) => {
  return {
    name: getUpdatesComponentTemplateName(definition.id),
    template: { settings: { hidden: true }, mappings: getUpdatesIndexMappings(definition) },
  };
};

const getUpdatesIndexMappings = (definition: EntityDefinition): MappingTypeMapping => ({
  properties: {
    ...BASE_ENTITY_INDEX_MAPPING,
    ...Object.fromEntries(definition.identityFields.map((c) => [c.field, c.mapping])),
    ...Object.fromEntries(
      definition.fields
        .filter(({ mapping }) => mapping)
        .filter(({ source }) => source[0] !== '_')
        .map(({ source, mapping }) => [source, mapping])
    ),
  },
});
