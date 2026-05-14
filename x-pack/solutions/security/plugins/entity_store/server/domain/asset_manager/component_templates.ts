/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import type {
  EntityDefinition,
  EntityType,
} from '../../../common/domain/definitions/entity_schema';
import { ENTITY_BASE_PREFIX, ENTITY_SCHEMA_VERSION_V2 } from '../../../common/domain/entity_index';
import { ENTITY_RELATIONSHIP_COLLECT_LEAVES } from '../../../common/domain/definitions/common_fields';

type MappingProperties = NonNullable<MappingTypeMapping['properties']>;

// Per-EUID first/last seen history is stored as a nested array next to
// `entity.relationships.<rel>.ids`. Nested type preserves object identity so
// DSL nested queries can filter by date range per EUID. ES|QL does not
// support nested types — analyst temporal investigation lives elsewhere.
const RELATIONSHIP_HISTORY_MAPPING = {
  type: 'nested',
  properties: {
    euid: { type: 'keyword' },
    first_seen: { type: 'date', format: 'strict_date_optional_time' },
    last_seen: { type: 'date', format: 'strict_date_optional_time' },
  },
} as const;

const ENTITY_RELATIONSHIP_HISTORY_MAPPINGS: MappingProperties = Object.fromEntries(
  ENTITY_RELATIONSHIP_COLLECT_LEAVES.map((rel) => [
    `entity.relationships.${rel}.history`,
    RELATIONSHIP_HISTORY_MAPPING,
  ])
);

const BASE_ENTITY_INDEX_MAPPING = {
  '@timestamp': { type: 'date' },
  'event.ingested': { type: 'date' },
  labels: { type: 'object' },
  tags: { type: 'keyword', ignore_above: 1024 },
  'entity.id': { type: 'keyword' },
  'entity.EngineMetadata.Type': { type: 'keyword' },
  'entity.EngineMetadata.UntypedId': { type: 'keyword' },
  'entity.source': { type: 'keyword' },
  'entity.risk.calculated_level': { type: 'keyword' },
  'entity.risk.calculated_score': { type: 'float' },
  'entity.risk.calculated_score_norm': { type: 'float' },
} as const satisfies MappingProperties;

export const getComponentTemplateName = (type: EntityType, namespace: string) =>
  `${ENTITY_BASE_PREFIX}-${ENTITY_SCHEMA_VERSION_V2}-security_${type}_${namespace}-latest@platform`;

export const getEntityDefinitionComponentTemplate = (
  definition: EntityDefinition,
  namespace: string
) => {
  return {
    name: getComponentTemplateName(definition.type, namespace),
    template: { settings: { hidden: true }, mappings: getIndexMappings(definition) },
  };
};

const getIndexMappings = (definition: EntityDefinition): MappingTypeMapping => ({
  properties: {
    ...BASE_ENTITY_INDEX_MAPPING,
    ...ENTITY_RELATIONSHIP_HISTORY_MAPPINGS,
    ...Object.fromEntries(
      definition.fields
        .filter(({ mapping }) => mapping)
        .map(({ source, destination, mapping }) => [destination || source, mapping])
    ),
  },
});

export const getUpdatesComponentTemplateName = (type: EntityType, namespace: string) =>
  `${ENTITY_BASE_PREFIX}-${ENTITY_SCHEMA_VERSION_V2}-security_${type}_${namespace}-updates@platform`;

export const getUpdatesEntityDefinitionComponentTemplate = (
  definition: EntityDefinition,
  namespace: string
) => {
  return {
    name: getUpdatesComponentTemplateName(definition.type, namespace),
    template: { settings: { hidden: true }, mappings: getUpdatesIndexMappings(definition) },
  };
};

const getUpdatesIndexMappings = (definition: EntityDefinition): MappingTypeMapping => ({
  properties: {
    ...BASE_ENTITY_INDEX_MAPPING,
    ...Object.fromEntries(
      definition.fields
        .filter(({ mapping }) => mapping)
        .filter(({ source }) => source[0] !== '_')
        .map(({ source, mapping }) => [source, mapping])
    ),
  },
});
