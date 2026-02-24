/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getCommonFieldDescriptions, getEntityFieldsDescriptions } from './common_fields';
import type { EntityDefinitionWithoutId } from './entity_schema';
import { collectValues as collect, newestValue, oldestValue } from './field_retention_operations';

export const serviceEntityDefinition: EntityDefinitionWithoutId = {
  type: 'service',
  name: `Security 'service' Entity Store Definition`,
  identityField: {
    requiresOneOfFields: ['service.entity.id', 'service.name'],
    euidFields: [[{ field: 'service.entity.id' }], [{ field: 'service.name' }]],
  },
  indexPatterns: [],
  entityTypeFallback: 'Service',
  fields: [
    newestValue({ destination: 'entity.name', source: 'service.name' }),
    oldestValue({ source: 'service.entity.id' }),

    collect({ source: 'service.name' }),
    collect({ source: 'service.address' }),
    collect({ source: 'service.environment' }),
    collect({ source: 'service.ephemeral_id' }),
    collect({ source: 'service.id' }),
    collect({ source: 'service.node.name' }),
    collect({ source: 'service.node.roles' }),
    collect({ source: 'service.node.role' }),
    newestValue({ source: 'service.state' }),
    collect({ source: 'service.type' }),
    newestValue({ source: 'service.version' }),
    ...getCommonFieldDescriptions('service'),
    ...getEntityFieldsDescriptions('service'),

    /* Relationships: keep one direction only, snake_case, keyword array */
    collect({
      source: 'service.entity.relationships.Communicates_with',
      destination: 'entity.relationships.communicates_with',
      mapping: { type: 'keyword' },
      allowAPIUpdate: true,
    }),
    collect({
      source: 'service.entity.relationships.Depends_on',
      destination: 'entity.relationships.depends_on',
      mapping: { type: 'keyword' },
      allowAPIUpdate: true,
    }),

    /* Mapping only: populated by maintainers */
    newestValue({
      source: 'entity.relationships.owns_inferred',
      destination: 'entity.relationships.owns_inferred',
      mapping: { type: 'keyword' },
    }),
    newestValue({
      source: 'entity.relationships.accesses_infrequently',
      destination: 'entity.relationships.accesses_infrequently',
      mapping: { type: 'keyword' },
    }),
    newestValue({
      source: 'entity.relationships.resolution.resolved_to',
      destination: 'entity.relationships.resolution.resolved_to',
      mapping: { type: 'keyword' },
    }),
    newestValue({
      source: 'entity.relationships.resolution.risk.calculated_level',
      destination: 'entity.relationships.resolution.risk.calculated_level',
      mapping: { type: 'keyword' },
    }),
    newestValue({
      source: 'entity.relationships.resolution.risk.calculated_score',
      destination: 'entity.relationships.resolution.risk.calculated_score',
      mapping: { type: 'float' },
    }),
    newestValue({
      source: 'entity.relationships.resolution.risk.calculated_score_norm',
      destination: 'entity.relationships.resolution.risk.calculated_score_norm',
      mapping: { type: 'float' },
    }),
  ],
} as const satisfies EntityDefinitionWithoutId;
