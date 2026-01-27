/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esqlIsNotNullOrEmpty } from '../logs_extraction/esql_strings';
import { getCommonFieldDescriptions, getEntityFieldsDescriptions } from './common_fields';
import type { EntityDefinitionWithoutId } from './entity_schema';
import { collectValues as collect } from './field_retention_operations';

export const userEntityDefinition: EntityDefinitionWithoutId = {
  type: 'user',
  name: `Security 'user' Entity Store Definition`,
  identityField: {
    calculated: true,
    defaultIdField: 'user.entity.id',
    defaultIdFieldMapping: { type: 'keyword' },
    typeToAppendToGeneratedId: 'user',
    requiresOneOfFields: ['user.id', 'user.name', 'user.email'],

    /*
      Implements the following rank
      1. user.entity.id           --> implemented as the default id field
      2. user.name @ host.entity.id
      3. user.name @ host.id
      4. user.name @ host.name
      5. user.id
      6. user.email
      7. user.name @ user.domain
      8. user.name
    */
    esqlEvaluation: `COALESCE(
                CASE(${esqlIsNotNullOrEmpty('user.name')},
                  CASE(
                    ${esqlIsNotNullOrEmpty(
                      'host.entity.id'
                    )}, CONCAT(user.name, "@", host.entity.id),
                    ${esqlIsNotNullOrEmpty('host.id')}, CONCAT(user.name, "@", host.id),
                    ${esqlIsNotNullOrEmpty('host.name')}, CONCAT(user.name, "@", host.name),
                    NULL
                  ),
                  NULL
                ),
                CASE(${esqlIsNotNullOrEmpty('user.id')}, user.id, NULL),
                CASE(${esqlIsNotNullOrEmpty('user.email')}, user.email, NULL),
                CASE(
                  ${esqlIsNotNullOrEmpty('user.name')} AND ${esqlIsNotNullOrEmpty('user.domain')}, 
                  CONCAT(user.name, ".", user.domain),
                  NULL
                ),  
                CASE(${esqlIsNotNullOrEmpty('user.name')}, user.name, NULL),
                NULL
              )`,
  },
  entityTypeFallback: 'Identity',
  indexPatterns: [],
  fields: [
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
};
