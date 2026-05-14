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

type MappingProperties = NonNullable<MappingTypeMapping['properties']>;
const BASE_ENTITY_INDEX_MAPPING = {
  '@timestamp': { type: 'date' },
  'event.ingested': { type: 'date' },
  labels: { type: 'object' },
  tags: { type: 'keyword', ignore_above: 1024 },
  'entity.id': { type: 'keyword' },
  'entity.EngineMetadata.Type': { type: 'keyword' },
  'entity.EngineMetadata.UntypedId': { type: 'keyword' },
  'entity.source': { type: 'keyword' },
  // `entity.confidence` and `entity.previous_id` are added at the BASE
  // mapping (not per-definition) so the shared physical latest index
  // always has them — independent of which engines are installed in the
  // tenant. The `ki-promotion` maintainer is the first writer of
  // `entity.confidence` outside the user engine and the only writer of
  // `entity.previous_id`; mapping them here makes those dependencies
  // explicit and survives partial-install tenants.
  'entity.confidence': { type: 'keyword' },
  'entity.previous_id': { type: 'keyword' },
  'entity.risk.calculated_level': { type: 'keyword' },
  'entity.risk.calculated_score': { type: 'float' },
  'entity.risk.calculated_score_norm': { type: 'float' },
  // `entity.knowledge_indicator.*` is stamped by the alias-scoped extraction
  // pass (Option E) and records which schema feature / stream / source path
  // contributed the identity. Mapped at the BASE level so the namespace exists
  // on the shared physical latest index regardless of which engines are
  // installed; absent on entities materialized via the default ECS path.
  'entity.knowledge_indicator.identity_source': { type: 'keyword' },
  'entity.knowledge_indicator.feature_uuid': { type: 'keyword' },
  'entity.knowledge_indicator.stream_name': { type: 'keyword' },
  'entity.knowledge_indicator.confidence': { type: 'float' },
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
