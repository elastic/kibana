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
    ...getCommonFieldDescriptions('user'),
    ...getEntityFieldsDescriptions('user'),

    // Used to populate the identity field
    collect({ source: 'host.entity.id' }),
    collect({ source: 'host.id' }),
    collect({ source: 'host.name' }),

    collect({
      source: `user.entity.relationships.Accesses_frequently`,
      destination: 'entity.relationships.Accesses_frequently',
      mapping: { type: 'keyword' },
      allowAPIUpdate: true,
    }),
    collect({
      source: `user.entity.relationships.Owns`,
      destination: 'entity.relationships.Owns',
      mapping: { type: 'keyword' },
      allowAPIUpdate: true,
    }),

    collect({
      source: `user.entity.relationships.Supervises`,
      destination: 'entity.relationships.Supervises',
      mapping: { type: 'keyword' },
      allowAPIUpdate: true,
    }),
    collect({
      source: `user.entity.relationships.Supervised_by`,
      destination: 'entity.relationships.Supervised_by',
      mapping: { type: 'keyword' },
      allowAPIUpdate: true,
    }),
  ],
} as const satisfies EntityDefinitionWithoutId;
