/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { collectValues as collect } from './field_retention_operations';
import type { EntityDefinitionWithoutId } from './entity_schema';
import { getCommonFieldDescriptions, getEntityFieldsDescriptions } from './common_fields';

export const HOST_IDENTITY_FIELD = 'host.name';

// Mostly copied from x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/entity_store/entity_definitions/entity_descriptions/host.ts

export const hostEntityDescription: EntityDefinitionWithoutId = {
  type: 'host',
  name: `Security 'host' Entity Store Definition`,
  identityFields: [{ field: HOST_IDENTITY_FIELD, mapping: { type: 'keyword' } }],
  indexPatterns: [],
  fields: [
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
