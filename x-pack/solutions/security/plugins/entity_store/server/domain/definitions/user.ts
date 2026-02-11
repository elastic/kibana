/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getCommonFieldDescriptions, getEntityFieldsDescriptions } from './common_fields';
import type { EntityDefinitionWithoutId } from './entity_schema';
import { collectValues as collect } from './field_retention_operations';

export const USER_IDENTITY_FIELD = 'user.name';

export const userEntityDefinition: EntityDefinitionWithoutId = {
  type: 'user',
  name: `Security 'user' Entity Store Definition`,
  identityFields: [
    {
      field: USER_IDENTITY_FIELD,
      mapping: {
        type: 'keyword',
        fields: { text: { type: 'match_only_text' } },
      },
    },
  ],
  indexPatterns: [],
  fields: [
    collect({ source: 'user.domain' }),
    collect({ source: 'user.email' }),
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
};
