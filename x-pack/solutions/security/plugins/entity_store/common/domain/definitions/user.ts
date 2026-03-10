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
  ],
} as const satisfies EntityDefinitionWithoutId;
