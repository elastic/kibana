/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getCommonFieldDescriptions, getEntityFieldsDescriptions } from './common_fields';
import type { EntityDefinitionWithoutId } from './entity_schema';
import { collectValues as collect, newestValue, oldestValue } from './field_retention_operations';

export const userEntityDefinition: EntityDefinitionWithoutId = {
  type: 'user',
  name: `Security 'user' Entity Store Definition`,
  identityField: {
    requiresOneOfFields: ['user.entity.id', 'user.id', 'user.name', 'user.email'],
    euidFields: [
      [{ field: 'user.entity.id' }],
      [{ field: 'user.name' }, { separator: '@' }, { field: 'host.entity.id' }],
      [{ field: 'user.name' }, { separator: '@' }, { field: 'host.id' }],
      [{ field: 'user.name' }, { separator: '@' }, { field: 'host.name' }],
      [{ field: 'user.id' }],
      [{ field: 'user.email' }],
      [{ field: 'user.name' }, { separator: '@' }, { field: 'user.domain' }],
      [{ field: 'user.name' }],
    ],
  },
  entityTypeFallback: 'Identity',
  indexPatterns: [],
  fields: [
    newestValue({ destination: 'entity.name', source: 'user.name' }),
    oldestValue({ source: 'user.entity.id' }),

    collect({ source: 'user.domain' }),
    collect({ source: 'user.email' }),
    collect({ source: 'user.name' }),
    collect({
      source: 'user.full_name',
      mapping: {
        type: 'keyword',
        fields: {
          text: {
            type: 'match_only_text',
          },
        },
      },
    }),
    collect({ source: 'user.hash' }),
    collect({ source: 'user.id' }),
    collect({ source: 'user.roles' }),
    collect({ source: 'user.group.domain' }),
    collect({ source: 'user.group.id' }),
    collect({ source: 'user.group.name' }),
    ...getCommonFieldDescriptions('user'),
    ...getEntityFieldsDescriptions('user'),

    /* Used to populate the identity field */
    collect({ source: 'host.entity.id' }),
    collect({ source: 'host.id' }),
    collect({ source: 'host.name' }),

    /* Relationships: keep one direction only, snake_case, keyword array */
    collect({
      source: 'user.entity.relationships.Accesses_frequently',
      destination: 'entity.relationships.accesses_frequently',
      mapping: { type: 'keyword' },
      allowAPIUpdate: true,
    }),
    collect({
      source: 'user.entity.relationships.Owns',
      destination: 'entity.relationships.owns',
      mapping: { type: 'keyword' },
      allowAPIUpdate: true,
    }),
    collect({
      source: 'user.entity.relationships.Supervises',
      destination: 'entity.relationships.supervises',
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
