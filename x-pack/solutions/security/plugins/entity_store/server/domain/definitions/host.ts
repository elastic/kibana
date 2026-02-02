/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { collectValues as collect } from './field_retention_operations';
import type { EntityDefinitionWithoutId } from './entity_schema';
import { getCommonFieldDescriptions, getEntityFieldsDescriptions } from './common_fields';
import { esqlIsNotNullOrEmpty } from '../logs_extraction/esql_strings';

// Mostly copied from x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/entity_store/entity_definitions/entity_descriptions/host.ts

export const hostEntityDefinition: EntityDefinitionWithoutId = {
  type: 'host',
  name: `Security 'host' Entity Store Definition`,
  identityField: {
    calculated: true,
    defaultIdField: 'host.entity.id',
    defaultIdFieldMapping: { type: 'keyword' },
    requiresOneOfFields: ['host.id', 'host.name', 'host.hostname'],

    /*
      Implements the following rank
      1. host.entity.id           --> implemented as the default id field
      2. host.id
      3. host.name . host.domain
      4. host.hostname . host.domain
      5. host.name
      6. host.hostname
    */
    esqlEvaluation: `COALESCE(
                CASE(${esqlIsNotNullOrEmpty('host.id')}, host.id, NULL),
                CASE(${esqlIsNotNullOrEmpty('host.domain')},
                  CASE(
                    ${esqlIsNotNullOrEmpty('host.name')}, CONCAT(host.name, ".", host.domain),
                    ${esqlIsNotNullOrEmpty(
                      'host.hostname'
                    )}, CONCAT(host.hostname, ".", host.domain),
                    NULL
                  ),
                  NULL
                ),
                CASE(${esqlIsNotNullOrEmpty('host.name')}, host.name, NULL),
                CASE(${esqlIsNotNullOrEmpty('host.hostname')}, host.hostname, NULL),
                NULL
              )`,
  },
  entityTypeFallback: 'Host',
  indexPatterns: [],
  fields: [
    collect({ source: 'host.name' }),
    collect({ source: 'host.domain' }),
    collect({ source: 'host.hostname' }),
    collect({ source: 'host.id' }),
    collect({
      source: 'host.os.name',
      mapping: {
        type: 'keyword',
        fields: {
          text: {
            type: 'match_only_text',
          },
        },
      },
    }),
    collect({ source: 'host.os.type' }),
    collect({
      source: 'host.ip',
      mapping: {
        type: 'ip',
      },
    }),
    collect({ source: 'host.mac' }),
    collect({ source: 'host.type' }),
    collect({ source: 'host.architecture' }),
    ...getCommonFieldDescriptions('host'),
    ...getEntityFieldsDescriptions('host'),

    collect({
      source: `host.entity.relationships.Communicates_with`,
      destination: 'entity.relationships.Communicates_with',
      mapping: { type: 'keyword' },
      allowAPIUpdate: true,
    }),
    collect({
      source: `host.entity.relationships.Depends_on`,
      destination: 'entity.relationships.Depends_on',
      mapping: { type: 'keyword' },
      allowAPIUpdate: true,
    }),
    collect({
      source: `host.entity.relationships.Dependent_of`,
      destination: 'entity.relationships.Dependent_of',
      mapping: { type: 'keyword' },
      allowAPIUpdate: true,
    }),

    collect({
      source: `host.entity.relationships.Owned_by`,
      destination: 'entity.relationships.Owned_by',
      mapping: { type: 'keyword' },
      allowAPIUpdate: true,
    }),
    collect({
      source: `host.entity.relationships.Accessed_frequently_by`,
      destination: 'entity.relationships.Accessed_frequently_by',
      mapping: { type: 'keyword' },
      allowAPIUpdate: true,
    }),
  ],
};
